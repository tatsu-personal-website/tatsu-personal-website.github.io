import { getCollection, type CollectionEntry } from 'astro:content';

export type NowEntry = CollectionEntry<'now'>;

// Entries from content/now.org, newest first. The first one is "now";
// the rest are the archive.
export async function getNowEntries(): Promise<NowEntry[]> {
  const entries = await getCollection('now');
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
