// Résumé, typeset to match alexanderphillips.net.
// Content lives in resume.json (JSON Resume format); this file is layout only.
//
// The PDF is built to read well to people and to résumé-screening software:
// one column in reading order, real headings and lists (tagged PDF/UA-1),
// document metadata, no text inside images, and no ligatures, which some
// parsers turn into garbage ("efficiency" → "eciency"). Section labels
// keep letter-spacing under 0.08em; wider and extractors read "E X P E R I E N C E".

#let r = json("resume.json")
// Private build: `npm run resume:private` passes the path of a git-ignored
// JSON file with details that stay off the public PDF (like a phone number).
#let private = if "private" in sys.inputs { json("/" + sys.inputs.private) } else { (:) }

#let navy = rgb("#1f2a44")
#let ink-soft = rgb("#3a4560")
#let oxblood = rgb("#6b1e23")
#let muted = rgb("#6e6656")
#let rule = rgb("#cfc5ae")
#let cream = rgb("#f4eee1")

#let year(date) = if date == none { "Present" } else { date.slice(0, 4) }
#let span(item) = {
  let (start, end) = (year(item.at("startDate", default: none)), year(item.at("endDate", default: none)))
  if start == end { start } else { [#start#sym.dash.en#end] }
}
#let bare-url(url) = url.replace(regex("^https?://"), "").trim("/", at: end)

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

#set document(
  title: [#r.basics.name, Résumé],
  author: r.basics.name,
  description: r.basics.summary,
  keywords: r.skills.map(s => s.keywords).flatten(),
)
#set page(
  paper: "us-letter",
  margin: (x: 0.68in, top: 0.58in, bottom: 0.45in),
  background: place(top + left, repp(8.5in, 7pt)),
)
#set text(font: "Libre Caslon Text", size: 9.4pt, fill: navy, lang: "en", region: "us", ligatures: false)
#set par(leading: 0.58em, spacing: 0.75em)
#set list(
  marker: box(width: 3.2pt, height: 3.2pt, fill: oxblood, baseline: -2.6pt),
  indent: 1pt,
  body-indent: 7pt,
  spacing: 0.42em,
)
#show link: set text(fill: navy)

#show heading.where(level: 1): it => block(below: 0.5em, text(font: "Libre Caslon Display", size: 27pt, weight: "regular", it.body))
#show heading.where(level: 2): it => block(above: 1.15em, below: 0.65em, sticky: true, grid(
  columns: (auto, 1fr),
  column-gutter: 8pt,
  align: horizon,
  text(size: 7.8pt, fill: oxblood, tracking: 0.07em, weight: "regular", upper(it.body)),
  line(length: 100%, stroke: 0.5pt + rule),
))

// ---------- Header ----------

#grid(
  columns: (1fr, auto),
  align: (left + bottom, right + bottom),
  [
    = #r.basics.name
    #text(size: 11pt, style: "italic", fill: ink-soft, r.basics.label)
  ],
  pdf.artifact(image("monogram.svg", width: 44pt)),
)

#v(2pt)
#{
  let loc = r.basics.location
  let items = (
    [#loc.city, #loc.region],
    if "phone" in private { private.phone },
    link("mailto:" + r.basics.email, r.basics.email),
    link(r.basics.url, bare-url(r.basics.url)),
    ..r.basics.profiles.map(p => link(p.url, bare-url(p.url))),
  ).filter(x => x != none)
  text(size: 8.8pt, fill: ink-soft, items.join(h(0.45em) + text(fill: rule, sym.bullet) + h(0.45em)))
}

#v(4pt)
#block(width: 100%, height: 2.8pt, stroke: (top: 0.6pt + navy, bottom: 0.6pt + navy))

== Summary
#text(fill: ink-soft, r.basics.summary)

// ---------- Experience ----------

#let entry(name, role, place, when, body) = block(above: 0.95em, breakable: false, {
  grid(
    columns: (1fr, auto),
    row-gutter: 0.42em,
    text(font: "Libre Caslon Display", size: 11.6pt, name),
    text(style: "italic", fill: muted, when),
    text(style: "italic", fill: ink-soft, role),
    text(size: 8.6pt, fill: muted, place),
  )
  v(0.15em)
  body
})

== Experience
#for job in r.work {
  let role = job.position + if "description" in job { [ #text(fill: muted)[·] #job.description] }
  entry(job.name, role, job.location, span(job), {
    if "summary" in job { job.summary }
    if "highlights" in job { list(..job.highlights) }
  })
}

== Education
#for school in r.education {
  entry(school.institution, [#school.studyType, #school.area], school.location, span(school), none)
}

// ---------- Skills, certifications, awards ----------

#let label-col = 1.2in

== Skills
#grid(
  columns: (label-col, 1fr),
  column-gutter: 12pt,
  row-gutter: 0.55em,
  ..r.skills.map(s => (text(style: "italic", fill: muted, s.name), s.keywords.join(", "))).flatten(),
)

#let run-in(items) = items.join(h(0.45em) + text(fill: rule, sym.bullet) + h(0.45em))

== Certifications and awards
#grid(
  columns: (label-col, 1fr),
  column-gutter: 12pt,
  row-gutter: 0.55em,
  text(style: "italic", fill: muted)[Certifications],
  run-in(r.certificates.map(c => [#c.name, #c.issuer])),
  text(style: "italic", fill: muted)[Awards],
  run-in(r.awards.map(a => [#a.title, #a.awarder])),
)
