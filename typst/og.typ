// Link-preview card (1200×630 px at 72 ppi): the image that shows up when a
// page is shared. src/lib/og.ts compiles it once per page with --input:
//   title     required
//   kicker    small caps above the title (e.g. "Clothes · Note")
//   subtitle  italic line under the title
//   book      for commonplace entries: "From <book> by <author>"
//   author
//   date      bottom right; without it, the site's address goes there
#import "house.typ": navy, ink-soft, oxblood, muted, cream, repp

// Inputs arrive as plain strings; curl their apostrophes.
#let input(key) = {
  let value = sys.inputs.at(key, default: none)
  if value != none { value.replace("'", "’") }
}
#let name = "Alexander Phillips"
#let title = if input("title") != none { input("title") } else { name }

#set page(width: 1200pt, height: 630pt, margin: (x: 84pt, y: 0pt), fill: cream)
#set text(font: "Libre Caslon Text", fill: navy, size: 28pt, hyphenate: false)

#place(top + left, dx: -84pt, repp(1200pt, 20pt))

// Kicker, title and the line under it, centered in the space above the footer.
#let title-size = {
  let n = title.clusters().len()
  if n <= 26 { 88pt } else if n <= 48 { 70pt } else { 56pt }
}
#place(top + left, dy: 20pt, box(width: 100%, height: 452pt, align(horizon, {
  if input("kicker") != none {
    text(size: 21pt, fill: oxblood, tracking: 0.16em, upper(input("kicker")))
    v(22pt)
  }
  par(leading: 0.5em, text(font: "Libre Caslon Display", size: title-size, title))
  if input("book") != none {
    v(26pt)
    par(leading: 0.5em, text(size: 28pt, fill: ink-soft)[
      From #emph(input("book"))#if input("author") != none [ by #input("author").replace(" ", "\u{a0}")]
    ])
  } else if input("subtitle") != none {
    v(26pt)
    par(leading: 0.5em, text(size: 30pt, fill: ink-soft, style: "italic", input("subtitle")))
  }
})))

// Footer: a double rule, then the monogram and name, and the date.
#place(bottom + left, dy: -40pt, box(width: 100%, {
  stack(spacing: 4pt, line(length: 100%, stroke: 1.2pt + navy), line(length: 100%, stroke: 1.2pt + navy))
  v(4pt)
  grid(
    columns: (auto, 1fr, auto),
    column-gutter: 18pt,
    align: horizon,
    image("/resume/monogram.svg", height: 58pt),
    if title != name { text(size: 22pt, tracking: 0.14em, upper(name)) },
    text(size: 24pt, style: "italic", fill: muted, if input("date") != none { input("date") } else { "alexanderphillips.net" }),
  )
}))
