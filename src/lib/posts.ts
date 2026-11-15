// Everything with its own page and date: essays (and notes) plus
// commonplace entries. Used for tag pages and link-preview images.
import { getCommonplace, type CommonplaceEntry } from './commonplace';
import { getEssays, type Essay } from './essays';

export type Post = Essay | CommonplaceEntry;

export const postPath = (post: Post) =>
  post.collection === 'commonplace' ? `/commonplace/${post.id}/` : `/essays/${post.id}/`;

// Newest first. Drafts are left out of built pages, as everywhere else.
export async function getPosts(): Promise<Post[]> {
  const posts: Post[] = [...(await getEssays()), ...(await getCommonplace())];
  return posts.sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
}

// Tags come from #+filetags, written like :apparel_arts:. On the site they
// read "apparel arts" and live at /tags/apparel-arts/.
export const tagLabel = (tag: string) => tag.replaceAll('_', ' ');
export const tagSlug = (tag: string) => tag.toLowerCase().replaceAll('_', '-');
export const tagPath = (tag: string) => `/tags/${tagSlug(tag)}/`;

export interface Tag {
  slug: string;
  label: string;
  posts: Post[];
}

// Every tag in use, alphabetically, each with its posts newest first.
export async function getTags(): Promise<Tag[]> {
  const tags = new Map<string, Tag>();
  for (const post of await getPosts()) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const entry = tags.get(slug) ?? { slug, label: tagLabel(tag).toLowerCase(), posts: [] };
      if (!entry.posts.includes(post)) entry.posts.push(post);
      tags.set(slug, entry);
    }
  }
  return [...tags.values()].sort((a, b) => a.label.localeCompare(b.label));
}
