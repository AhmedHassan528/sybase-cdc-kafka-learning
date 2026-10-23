# Data Model: Article Website

All data is built from existing files at build time and written as static HTML plus one JSON search index. Nothing is stored at run time except the reader's theme in the reader's own browser.

## Article section
| Field | Source | Rule |
|-------|--------|------|
| `number` | order of `docs-src/article/NN-*.html` | 1 to 12, contiguous |
| `id` | the `id` of the section's `<h2>` | unique on the page; unchanged from the existing article so old anchors keep working |
| `title` | text of the `<h2>` | non-empty |
| `headings[]` | `<h3 id>` inside the section | each has `id`, `text`; ids unique |
| `keywords` | `data-keywords` attribute | optional, used by search |
| `body` | the section HTML | text must equal the source text (FR-013) |
| `prev`, `next` | neighbouring sections | `prev` absent on section 1, `next` absent on section 12 |
| `checks[]` | `<details class="check">` | each has a question and a hidden answer |

## Site page
| Field | Rule |
|-------|------|
| `path` | relative to `docs/site/`: `index.html`, `guide/index.html`, `guide/NN-name.html`, `evidence/index.html` |
| `title` | 2 to 6 words plus site name |
| `kind` | `article`, `guide-landing`, `guide-step`, `evidence-index` |
| `nav` | the same top navigation on every page; the current item marked |
| `sourceFile` | the file the text comes from (article sections, README, or the evidence folder listing) |

## Search entry
| Field | Rule |
|-------|------|
| `page` | page path |
| `anchor` | heading id (or none for a page-level entry) |
| `heading` | heading text |
| `section` | section number or guide step number |
| `text` | plain-text excerpt of the heading's body, tags removed, at most 600 characters |
| `keywords` | from `data-keywords`, may be empty |

Rules: every heading with an id has exactly one entry; `anchor` must exist on `page` (checked by the link check); the index is regenerated on every build.

## Evidence index row
| Field | Rule |
|-------|------|
| `file` | file name under `docs/evidence/` |
| `number` | leading digits of the name, if any |
| `title` | the file name without number and extension, words separated by spaces |
| `href` | `../evidence/<file>` (plain text file) |

## Reader preference
`theme` = `light` or `dark` or absent (absent means follow the device). Stored in the reader's browser only; the page works if storage is unavailable.

Evidence index scope: besides the numbered files, the index lists the files in every sub-folder of `docs/evidence/` found at build time (currently `logs`, `ltl`, `queries`, `tests`; this feature adds `site-look`).
