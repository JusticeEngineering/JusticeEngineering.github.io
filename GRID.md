# Grid and type: Justice Engineering

One system for justice.engineering and shop.justice.engineering. Both load the same
`site.css` (`assets/site.css` here, `static/assets/site.css` in the shop repo). The shop adds
`shop.css`, which uses only the tokens defined below. Change `site.css` in one repo and copy it
to the other.

The model is the International Typographic Style as Josef Müller-Brockmann set it out in
*Grid Systems in Graphic Design* (1981): a fixed type area, columns separated by constant
gutters, a baseline unit that every vertical measure is built from, a short list of type sizes,
and flush-left asymmetric composition. The tone is a technical catalog (McMaster-Carr),
not a blueprint: no title blocks, no ruler ticks, no drawing-sheet borders.

## Format

| | Phone (< 600) | Tablet (600 to 899) | Desktop (≥ 900) |
|---|---|---|---|
| Outer margin | 16 | 32 | 48 |
| Columns | 12 | 12 | 12 |
| Gutter | 16 | 24 | 24 |
| Type area | full width | full width | 1248 max, centred |

At 1248 the column is 82px. The header and footer rules run to the window edge; everything
else sits inside the type area.

## Rhythm

- Unit: **8px**. Every margin, padding and gap is a multiple of 8: 8, 16, 24, 32, 48, 64, 96, 128.
- Line heights fall on a 4px half-line, so small type can be set at 16 and 20 without going loose.
- Section spacing: 96 above a section (64 on phone); 48 under a masthead.
- Table rows: 6px above and below a 20px line, a 32px row with its hairline.

## Type

IBM Plex Sans and IBM Plex Mono (dj's choice, October 2026). Two weights only: 400 and 500.
Sizes come from the classical printers' scale (6 7 8 9 10 11 12 14 16 18 21 24 36 48 60 72;
see Bringhurst, *The Elements of Typographic Style*, 8.2.1). Sizes step at breakpoints; none
are fluid, so every size on screen is one of these:

| Token | Size / line | Face | Use |
|---|---|---|---|
| label | 11 / 16 | Mono, capitals, +0.08em | Labels, nav, buttons, table keys, plates |
| data | 12 / 16 | Mono, tabular figures | Codes, figures, captions, footer |
| small | 14 / 20 | Sans | Table values, secondary notes |
| body | 16 / 24 | Sans | Running text |
| lead | 18 / 28 → 21 / 28 | Sans | Intro paragraphs, About text |
| item | 24 / 28 | Sans 500 | Card and item titles |
| title | 36 / 40 → 48 / 48 → 72 / 72 | Sans, −0.02em | Page titles |

Shop product titles use 36 / 40, then 48 / 48 on desktop, because they sit in five columns.

Rules for setting:
- Measure: running text is held to 34em (about 70 characters) at 16px and 30em (about 60) at
  18 to 21px. Nothing runs wider than 75 characters.
- Capitals are only used for labels of four words or fewer, always letterspaced. Sentences are
  never set in capitals.
- Figures in tables, prices and codes are tabular.
- Titles are balanced (`text-wrap: balance`); no widows in titles.

## Composition

- **Flush left.** Everything hangs from column 1. There is no separate label column: a label sits
  directly above what it names.
- **Masthead** on every inner page: label, then title (columns 1 to 10), closed by a 4px black
  rule. A masthead with facts (the shop) puts the title on 1 to 8 and the facts table on 10 to 12.
- **Sections**: 1px black rule, label, then content. An intro and key table sit on 1 to 6 and
  8 to 12, with column 7 left open.
- **Drawings** (home, Crew Chief, Drafting Table): stage on columns 1 to 8, inspector on 9 to 12.
- **Cards**: services are 3 across at 4 columns each (2 across on tablet, 1 on phone); the shop
  catalog is 2 across at 6 columns.
- **Product page**: pictures on columns 1 to 6, column 7 left open, information on 8 to 12.
- **About**: text on columns 1 to 6, photograph on 9 to 12.
- **Cart and order**: columns 1 to 8.
- Below 900, two-column compositions stack.

## Rules and colour

- Three rule weights only: hairline (1px, #d9d9d9) between rows; 1px black over a section or
  table; 4px black under a masthead.
- Key tables everywhere use one 128px key column.
- Black (#111) on white. Secondary text #5c5c5c. The only fill is #f2f2f2 behind cutout
  product shots. No accent colour; photographs and renders keep their own colour.
- Buttons are 40px tall, label type, square corners. Primary is black, secondary is outlined.
