import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { orgLoader } from './lib/org-loader';

const schema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  date: z.date().optional(),
  updated: z.date().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  draft: z.boolean().default(false),
});

export const collections = {
  essays: defineCollection({ loader: orgLoader({ base: 'content/essays' }), schema }),
  pages: defineCollection({ loader: orgLoader({ base: 'content/pages' }), schema }),
};
