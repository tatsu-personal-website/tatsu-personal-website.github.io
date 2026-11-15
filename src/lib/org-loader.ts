// Astro content loader for a folder of .org files. Each file becomes one
// entry; its #+keywords become the entry's data and its body is rendered
// to HTML by ./org.ts.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader } from 'astro/loaders';
import { parseOrgDate, parseOrgTags, renderOrg } from './org';

export function orgLoader({ base }: { base: string }): Loader {
  return {
    name: 'org-loader',
    async load({ store, parseData, generateDigest, config, logger, watcher }) {
      const root = fileURLToPath(config.root);
      const dir = path.resolve(root, base);
      const publicDir = fileURLToPath(config.publicDir);

      async function loadFile(file: string) {
        const filePath = path.join(dir, file);
        const id = file.replace(/\.org$/, '');
        const source = await readFile(filePath, 'utf8');
        // Always re-render (it takes milliseconds) and digest the output, so
        // changes to the renderer itself also refresh the stored entry.
        const doc = await renderOrg(source, filePath, publicDir);
        const digest = generateDigest(source + doc.html);
        const k = doc.keywords;
        const data = await parseData({
          id,
          filePath,
          data: {
            title: k.title ?? id,
            subtitle: k.subtitle,
            date: parseOrgDate(k.date),
            updated: parseOrgDate(k.updated),
            type: k.type?.trim().toLowerCase() || undefined,
            category: k.category,
            tags: parseOrgTags(k.filetags),
            description: k.description || doc.excerpt,
            draft: /^(t|true|yes)$/i.test(k.draft ?? ''),
          },
        });
        store.set({
          id,
          data,
          body: source,
          filePath: path.relative(root, filePath),
          digest,
          rendered: { html: doc.html, metadata: { headings: doc.headings } },
        });
      }

      async function loadAll() {
        const files = (await readdir(dir)).filter((f) => f.endsWith('.org') && !f.startsWith('.#'));
        const ids = new Set(files.map((f) => f.replace(/\.org$/, '')));
        for (const id of store.keys()) if (!ids.has(id)) store.delete(id);
        await Promise.all(files.map(loadFile));
      }

      await loadAll();

      watcher?.add(dir);
      watcher?.on('all', async (_event, changed) => {
        if (!changed.startsWith(dir) || !changed.endsWith('.org')) return;
        logger.info(`Reloading ${path.relative(root, changed)}`);
        await loadAll();
      });
    },
  };
}

// Splits Org source at top-level headlines ("* …"), ignoring the preamble.
// Lines inside #+begin_…/#+end_… blocks never start a headline.
function splitTopLevelHeadlines(source: string): { headline: string; body: string }[] {
  const sections: { headline: string; lines: string[] }[] = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    if (/^\s*#\+begin_/i.test(line)) inBlock = true;
    else if (/^\s*#\+end_/i.test(line)) inBlock = false;
    const headline = !inBlock && /^\* +(.*)$/.exec(line);
    if (headline) sections.push({ headline: headline[1].trim(), lines: [] });
    else sections.at(-1)?.lines.push(line);
  }
  return sections.map(({ headline, lines }) => ({ headline, body: lines.join('\n').trim() + '\n' }));
}

// Astro content loader for an Org journal: one file whose top-level
// headlines are dated entries, like "* [2026-10-12 Mon]" or
// "* [2026-10-12 Mon] Fall wardrobe". Each headline becomes one entry.
export function orgJournalLoader({ file }: { file: string }): Loader {
  return {
    name: 'org-journal-loader',
    async load({ store, parseData, generateDigest, config, logger, watcher }) {
      const root = fileURLToPath(config.root);
      const filePath = path.resolve(root, file);
      const publicDir = fileURLToPath(config.publicDir);

      async function loadAll() {
        const source = await readFile(filePath, 'utf8');
        store.clear();
        for (const { headline, body } of splitTopLevelHeadlines(source)) {
          const date = parseOrgDate(headline);
          if (!date) {
            logger.warn(`${file}: skipping "* ${headline}"; journal headlines need a date like [2026-10-12 Mon]`);
            continue;
          }
          const day = date.toISOString().slice(0, 10);
          let id = day;
          for (let n = 2; store.has(id); n++) id = `${day}-${n}`;
          const doc = await renderOrg(body, filePath, publicDir);
          const label = headline.replace(/[[<]\d{4}-\d{2}-\d{2}[^\]>]*[\]>]/, '').trim();
          const data = await parseData({ id, filePath, data: { date, label: label || undefined } });
          store.set({
            id,
            data,
            body,
            filePath: path.relative(root, filePath),
            digest: generateDigest(body + doc.html),
            rendered: { html: doc.html },
          });
        }
      }

      await loadAll();

      watcher?.add(filePath);
      watcher?.on('change', async (changed) => {
        if (changed !== filePath) return;
        logger.info(`Reloading ${file}`);
        await loadAll();
      });
    },
  };
}
