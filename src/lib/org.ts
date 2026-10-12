// Org → HTML pipeline. Parses Org with uniorg, then applies the site's
// house style: figures from #+CAPTION, numbered equations, KaTeX, and
// footnotes turned into margin notes.
import path from 'node:path';
import { unified, type Plugin } from 'unified';
import uniorgParse from 'uniorg-parse';
import uniorgExtractKeywords from 'uniorg-extract-keywords';
import uniorg2rehype from 'uniorg-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Element, ElementContent, Root, RootContent } from 'hast';

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface OrgDocument {
  html: string;
  keywords: Record<string, string>;
  headings: Heading[];
  excerpt: string;
}

const hasClass = (node: Element, name: string) => {
  const cls = node.properties?.className;
  return Array.isArray(cls) && cls.includes(name);
};

// #+CAPTION on an image paragraph becomes <figure>/<figcaption>.
const handlers = {
  paragraph(this: any, org: any) {
    const caption = org.affiliated?.CAPTION;
    if (!caption) return undefined;
    const body = (this.toHast(org.children, org) as ElementContent[]).filter(
      (n) => !(n.type === 'text' && !n.value.trim()),
    );
    const figcaption = this.h(org, 'figcaption', {}, this.toHast(caption.flat(), org));
    const alt = toString(figcaption);
    for (const n of body) {
      if (n.type === 'element' && n.tagName === 'img' && !n.properties.alt) n.properties.alt = alt;
    }
    return this.h(org, 'figure', {}, [...body, figcaption]);
  },
};

// Relative image links resolve against the .org file. Anything under
// public/ is served from the site root, so ../../public/media/x.png → /media/x.png.
const rehypeLocalImages: Plugin<[{ filePath: string; publicDir: string }], Root> =
  ({ filePath, publicDir }) =>
  (tree, file) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      const src = String(node.properties.src ?? '').replace(/^file:/, '');
      node.properties.loading = 'lazy';
      node.properties.decoding = 'async';
      if (/^([a-z]+:|\/)/i.test(src)) return;
      const rel = path.relative(publicDir, path.resolve(path.dirname(filePath), src));
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        file.message(`Image ${src} is outside public/ and won't be published`);
        return;
      }
      node.properties.src = '/' + rel.split(path.sep).join('/');
    });
  };

// The title is the page's <h1>, so Org's top-level headlines become <h2>.
const rehypeHeadings: Plugin<[{ headings: Heading[] }], Root> =
  ({ headings }) =>
  (tree) => {
    const slugger = new GithubSlugger();
    visit(tree, 'element', (node) => {
      const m = /^h([1-6])$/.exec(node.tagName);
      if (!m) return;
      const depth = Math.min(Number(m[1]) + 1, 6);
      node.tagName = `h${depth}`;
      const text = toString(node);
      const slug = String(node.properties.id ?? '') || slugger.slug(text);
      node.properties.id = slug;
      headings.push({ depth, slug, text });
    });
  };

// Number \begin{equation} blocks in order (KaTeX doesn't track numbers across
// separate formulas) and turn inline \ref{label} / \eqref{label} into links.
const rehypeEquations: Plugin<[], Root> = () => (tree) => {
  const labels = new Map<string, number>();
  let n = 0;
  visit(tree, 'element', (node, index, parent) => {
    if (!hasClass(node, 'math-display') || !parent || index === undefined) return;
    // rehype-katex replaces the math element itself, so anchors and layout
    // hang off a wrapper instead.
    const wrapper: Element = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['math-block'] },
      children: [node],
    };
    parent.children[index] = wrapper;
    let tex = toString(node);
    const env = /\\begin\{equation(\*?)\}([\s\S]*?)\\end\{equation\*?\}/.exec(tex);
    if (env) {
      tex = env[2];
      if (!env[1]) {
        n += 1;
        const label = /\\label\{([^}]+)\}/.exec(tex)?.[1];
        if (label) labels.set(label, n);
        tex = `${tex.replace(/\\label\{[^}]+\}/g, '').trim()} \\tag{${n}}`;
        wrapper.properties.id = `eq-${n}`;
      }
      node.children = [{ type: 'text', value: tex.trim() }];
    }
    return SKIP;
  });
  visit(tree, 'element', (node, index, parent) => {
    if (!hasClass(node, 'math-inline') || !parent || index === undefined) return;
    const ref = /^\s*\\(?:eq)?ref\{([^}]+)\}\s*$/.exec(toString(node));
    const num = ref && labels.get(ref[1]);
    if (!num) return;
    parent.children[index] = {
      type: 'element',
      tagName: 'a',
      properties: { href: `#eq-${num}`, className: ['eq-ref'] },
      children: [{ type: 'text', value: `(${num})` }],
    };
    return SKIP;
  });
};

// Sidenotes must live inside the paragraph that references them, so any
// block-level markup in a footnote is rewritten as display:block spans.
const BLOCK = new Set(['p', 'div', 'ul', 'ol', 'li', 'blockquote', 'pre', 'figure', 'figcaption', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
function inlineOnly(nodes: ElementContent[]): ElementContent[] {
  return nodes.map((node) => {
    if (node.type !== 'element') return node;
    const children = inlineOnly(node.children);
    if (!BLOCK.has(node.tagName)) return { ...node, children };
    const cls = (node.properties.className as string[] | undefined) ?? [];
    return {
      ...node,
      tagName: 'span',
      properties: { ...node.properties, className: ['sn-block', `sn-${node.tagName}`, ...cls] },
      children,
    };
  });
}

const rehypeSidenotes: Plugin<[], Root> = () => (tree) => {
  const defs = new Map<string, ElementContent[]>();
  // uniorg's footnotesSection option wraps the definitions in div.footnotes.
  visit(tree, 'element', (node, index, parent) => {
    if (!hasClass(node, 'footnotes') || !parent || index === undefined) return;
    for (const def of node.children) {
      if (def.type !== 'element') continue;
      const num = toString(def.children[0] as Element).trim();
      const body = def.children[1] as Element | undefined;
      if (num && body) defs.set(num, inlineOnly(body.children));
    }
    parent.children.splice(index, 1);
    return [SKIP, index];
  });

  const used = new Set<string>();
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'sup' || !parent || index === undefined) return;
    const a = node.children[0];
    if (a?.type !== 'element' || !hasClass(a, 'footref')) return;
    const num = String(a.properties.href ?? '').replace('#fn.', '');
    const body = defs.get(num);
    if (!body) return;
    const id = `sn-${num}`;
    const marker: Element = {
      type: 'element',
      tagName: 'label',
      properties: { htmlFor: [id], className: ['sidenote-number'] },
      children: [{ type: 'text', value: num }],
    };
    if (used.has(num)) {
      parent.children[index] = marker;
      return SKIP;
    }
    used.add(num);
    const replacement: ElementContent[] = [
      marker,
      { type: 'element', tagName: 'input', properties: { type: 'checkbox', id, className: ['margin-toggle'] }, children: [] },
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['sidenote'], role: 'note' },
        children: [
          { type: 'element', tagName: 'span', properties: { className: ['sidenote-num'] }, children: [{ type: 'text', value: num }] },
          ...body,
        ],
      },
    ];
    parent.children.splice(index, 1, ...replacement);
    return [SKIP, index + replacement.length];
  });
};

function firstParagraphText(tree: Root): string {
  let text = '';
  visit(tree, 'element', (node) => {
    if (text || node.tagName !== 'p') return;
    const clone = structuredClone(node);
    visit(clone, 'element', (n, i, p) => {
      if (p && i !== undefined && (hasClass(n, 'sidenote') || n.tagName === 'label')) {
        p.children.splice(i, 1);
        return [SKIP, i];
      }
    });
    text = toString(clone).replace(/\s+/g, ' ').trim();
  });
  return text.length > 200 ? text.slice(0, 200).replace(/\s+\S*$/, '') + '…' : text;
}

export async function renderOrg(source: string, filePath: string, publicDir: string): Promise<OrgDocument> {
  const headings: Heading[] = [];
  let excerpt = '';
  const file = await unified()
    .use(uniorgParse)
    .use(uniorgExtractKeywords)
    .use(uniorg2rehype, {
      handlers,
      footnotesSection: (footnotes: RootContent[]) => [
        { type: 'element', tagName: 'div', properties: { className: ['footnotes'] }, children: footnotes },
      ],
    } as any)
    .use(rehypeLocalImages, { filePath, publicDir })
    .use(rehypeHeadings, { headings })
    .use(rehypeEquations)
    .use(rehypeKatex, { strict: false })
    .use(rehypeSidenotes)
    .use(() => (tree: Root) => {
      excerpt = firstParagraphText(tree);
    })
    .use(rehypeStringify)
    .process({ value: source, path: filePath });

  for (const msg of file.messages) console.warn(`[org] ${filePath}: ${msg.reason}`);

  const keywords: Record<string, string> = {};
  for (const [k, v] of Object.entries(file.data)) {
    if (typeof v === 'string') keywords[k.toLowerCase()] = v;
  }
  return { html: String(file), keywords, headings, excerpt };
}

// "[2020-03-27 Fri]", "<2020-03-27 Fri 10:00>", or "2020-03-27"
export function parseOrgDate(value: string | undefined): Date | undefined {
  const m = value && /(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : undefined;
}

// ":physics:maxwell:" → ["physics", "maxwell"]
export function parseOrgTags(value: string | undefined): string[] {
  return (value ?? '').split(/[:\s]+/).filter(Boolean);
}

