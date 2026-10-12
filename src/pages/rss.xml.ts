import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEssays } from '../lib/essays';

export async function GET(context: APIContext) {
  const essays = await getEssays();
  return rss({
    title: 'Alexander Phillips',
    description: 'Essays on American politics and classic menswear.',
    site: context.site!,
    items: essays.map((essay) => ({
      title: essay.data.title,
      pubDate: essay.data.date,
      description: essay.data.description,
      categories: essay.data.category ? [essay.data.category] : [],
      link: `/essays/${essay.id}/`,
    })),
  });
}
