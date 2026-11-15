// House style shared by the résumé and the link-preview cards: the site's
// colors (light theme, from src/styles/global.css) and its repp stripe.

#let navy = rgb("#1f2a44")
#let ink-soft = rgb("#3a4560")
#let oxblood = rgb("#6b1e23")
#let muted = rgb("#6e6656")
#let rule = rgb("#cfc5ae")
#let cream = rgb("#f4eee1")

// The repp stripe from the top of the website, drawn as slanted bands.
#let repp(width, height) = box(width: width, height: height, clip: true, fill: navy, {
  let period = 24pt
  for i in range(int(width / period) + 2) {
    let x = i * period - height
    for (dx, w, c) in ((13pt, 2pt, cream), (15pt, 7pt, oxblood), (22pt, 2pt, cream)) {
      place(dx: x + dx, polygon(fill: c, (0pt, height), (w, height), (w + height, 0pt), (height, 0pt)))
    }
  }
})
