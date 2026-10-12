# alexanderphillips.net

Personal site and essays. Built with [Astro](https://astro.build); every essay and page is a plain Org file.

```sh
npm install
npm run dev      # http://localhost:4321, live-reloads when you save an .org file
npm run build    # static site in dist/
npm run check    # type-check
```

## Writing an essay

Create `content/essays/<slug>.org`. The file name becomes the URL (`/essays/<slug>/`).

```org
#+title: In Defense of the Sack Suit
#+subtitle: Optional one-line dek under the title
#+date: [2026-10-12 Mon]
#+category: Clothes
#+filetags: :ivy:tailoring:
#+description: One or two sentences for the essay list, RSS, and link previews.
#+draft: t

First paragraph gets the drop cap.

* A section heading
Body text. Footnotes[fn:1] become margin notes on wide screens and
tap-to-open notes on phones.

[fn:1] Like this one.
```

- **Category** decides where it's listed: `Clothes` essays also appear under Clothes. Anything else (Politics, Science…) is just a label.
- **Drafts** (`#+draft: t`) appear while running `npm run dev`, with a Draft badge, and are left out of the built site. Delete the line to publish.
- **Description** is optional; without it, the first paragraph is used.
- **Revisions:** add `#+updated: [2026-11-01 Sun]` to show a "Revised" date.

### Images

Put images under `public/media/<slug>/` and link them relatively from the Org file, the same way `C-c C-l` would:

```org
#+caption: Shown beside the image, in the margin.
[[file:../../public/media/sack-suit/jacket.jpg]]
```

Inline image previews work in Emacs, and the site serves the image from `/media/sack-suit/jacket.jpg`.

### Math

LaTeX works as in Org. `\begin{equation}` blocks are numbered in order, and `\ref{label}` in the text becomes a link like "(3)". Use `equation*` for unnumbered blocks.

## Other pages

`content/pages/*.org` become top-level pages: `about.org` → `/about/`. `now.org` also fills the Now box on the home page, so keep it to a short description list and update its `#+date`.

## How it works

- `src/lib/org.ts` turns Org into HTML (uniorg, then KaTeX, figures, numbered equations, margin notes).
- `src/lib/org-loader.ts` feeds a folder of Org files into an Astro content collection.
- `src/styles/global.css` holds the design: Caslon type, navy/cream/oxblood palette, and a navy dark mode.
