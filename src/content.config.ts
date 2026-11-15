import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { orgJournalLoader, orgLoader } from './lib/org-loader';

const schema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  date: z.date().optional(),
  updated: z.date().optional(),
  // #+type: note marks a short post; it's labeled "Note" wherever it's listed.
  type: z.enum(['essay', 'note']).default('essay'),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  draft: z.boolean().default(false),
});

export const collections = {
  essays: defineCollection({ loader: orgLoader({ base: 'content/essays' }), schema }),
  pages: defineCollection({ loader: orgLoader({ base: 'content/pages' }), schema }),
  // content/now.org: each dated top-level headline is one entry.
  now: defineCollection({
    loader: orgJournalLoader({ file: 'content/now.org' }),
    schema: z.object({ date: z.date(), label: z.string().optional() }),
  }),
};
