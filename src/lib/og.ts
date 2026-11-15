// Link-preview images: the picture that appears when a page is shared in
// iMessage, Slack, X and the like. Each post gets a 1200×630 card typeset by
// Typst from typst/og.typ; every other page uses /og/default.png.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { formatDate } from './essays';
import type { Post } from './posts';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const DEFAULT_OG_IMAGE = '/og/default.png';

// The fields typst/og.typ reads through --input.
export interface Card {
  title?: string;
  kicker?: string;
  subtitle?: string;
  book?: string;
  author?: string;
  date?: string;
}

export const ogImagePath = (post: Post) => `/og/${post.collection}/${post.id}.png`;

export function cardFor(post: Post): Card {
  const { title, subtitle, date } = post.data;
  const card: Card = { title, subtitle, date: formatDate(date) || undefined };
  if (post.collection === 'commonplace') {
    return { ...card, kicker: 'Commonplace', book: post.data.book, author: post.data.bookAuthor };
  }
  const { category, type } = post.data;
  const kicker = [category, type === 'note' ? 'Note' : undefined].filter(Boolean).join(' · ');
  return { ...card, kicker: kicker || undefined };
}

export const defaultCard: Card = { subtitle: 'Essays on American politics and classic menswear.' };

const run = promisify(execFile);

// Typst runs from the project root, with the résumé's bundled fonts only, so
// cards come out the same on any machine.
export async function renderCard(card: Card): Promise<Uint8Array<ArrayBuffer>> {
  const dir = await mkdtemp(path.join(tmpdir(), 'og-'));
  const out = path.join(dir, 'card.png');
  const inputs = Object.entries(card)
    .filter(([, value]) => value)
    .flatMap(([key, value]) => ['--input', `${key}=${value}`]);
  try {
    await run(
      'typst',
      ['compile', '--root', '.', '--font-path', 'resume/fonts', '--ignore-system-fonts',
        '--format', 'png', '--ppi', '72', ...inputs, 'typst/og.typ', out],
      { cwd: process.cwd() },
    );
    return new Uint8Array(await readFile(out));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
