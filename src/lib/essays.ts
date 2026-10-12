import { getCollection, type CollectionEntry } from 'astro:content';

export type Essay = CollectionEntry<'essays'>;

// Drafts (#+draft: t) show up while running `npm run dev` but are never built.
export async function getEssays(): Promise<Essay[]> {
  const essays = await getCollection('essays', (e) => import.meta.env.DEV || !e.data.draft);
  return essays.sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
}

export function formatDate(date: Date | undefined, style: 'long' | 'month' = 'long'): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    ...(style === 'long' ? { day: 'numeric' } : {}),
  });
}

export const categoryPath = (category: string) =>
  category.toLowerCase() === 'clothes' ? '/clothes/' : '/essays/';
