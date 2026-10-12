// Source for monogram.svg and the site favicon. Typst's SVG export turns
// the letters into outlines, so the image carries no text.
#let variant = sys.inputs.at("variant", default: "ink")
#let navy = rgb("#1f2a44")
#let cream = rgb("#f4eee1")
#let (fg, bg) = if variant == "favicon" { (cream, navy) } else { (navy, none) }

#set page(width: 64pt, height: 64pt, margin: 0pt, fill: none)
#set text(font: "Libre Caslon Text", style: "italic", size: 25pt, fill: fg)
#place(center + horizon, circle(radius: 31pt, fill: bg, stroke: if bg == none { 1.2pt + fg } else { none }))
#place(center + horizon, circle(radius: 27pt, stroke: (if bg == none { 0.7pt } else { 1.4pt }) + fg))
#place(center + horizon, dy: 1pt, text(tracking: -0.8pt)[AP])
