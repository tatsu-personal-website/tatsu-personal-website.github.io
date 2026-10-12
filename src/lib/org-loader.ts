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
