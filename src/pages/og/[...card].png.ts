// Builds /og/default.png and one /og/<collection>/<id>.png per post.
import type { APIRoute, GetStaticPaths } from 'astro';
import { cardFor, defaultCard, renderCard, type Card } from '../../lib/og';
import { getPosts } from '../../lib/posts';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return [
    { params: { card: 'default' }, props: { card: defaultCard } },
    ...posts.map((post) => ({ params: { card: `${post.collection}/${post.id}` }, props: { card: cardFor(post) } })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCard((props as { card: Card }).card);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
