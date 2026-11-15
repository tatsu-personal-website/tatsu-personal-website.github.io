import { getCollection, type CollectionEntry } from 'astro:content';

export type CommonplaceEntry = CollectionEntry<'commonplace'>;

export interface Shelf {
  book?: string;
  author?: string;
  year?: string;
  entries: CommonplaceEntry[];
}

// Drafts (#+draft: t) show up while running `npm run dev` but are never built.
// Oldest first, so entries on one book read in the order they were written.
export async function getCommonplace(): Promise<CommonplaceEntry[]> {
  const entries = await getCollection('commonplace', (e) => import.meta.env.DEV || !e.data.draft);
  return entries.sort((a, b) => (a.data.date?.getTime() ?? 0) - (b.data.date?.getTime() ?? 0));
}

// One shelf per book (#+book). The book with the newest entry comes first;
// entries without a book go last, under Miscellany.
export function shelvesByBook(entries: CommonplaceEntry[]): Shelf[] {
  const shelves = new Map<string, Shelf>();
  for (const entry of entries) {
    const { book, bookAuthor, bookYear } = entry.data;
    const key = book?.trim().toLowerCase() ?? '';
    const shelf = shelves.get(key) ?? { book, entries: [] };
    shelf.author ??= bookAuthor;
    shelf.year ??= bookYear;
    shelf.entries.push(entry);
    shelves.set(key, shelf);
  }
  const newest = (s: Shelf) => Math.max(...s.entries.map((e) => e.data.date?.getTime() ?? 0));
  return [...shelves.values()].sort(
    (a, b) => Number(!a.book) - Number(!b.book) || newest(b) - newest(a),
  );
}
