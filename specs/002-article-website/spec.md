# Feature Specification: Article Website

**Feature Branch**: `002-article-website` (no branch created; work stays on `main`)

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Lets do website html and css and js and (tailwind) to make the article and site ready to use and take this site as a ref https://www.confluent.io/blog/kafka-connect-deep-dive-jdbc-source-connector/"

**Principles touched**: I (every number or claim shown on the site comes from the existing article and evidence, nothing new is claimed), IV (no secrets, no outside services at read time), V (the site is rebuilt from checked-in sources by a recorded command; generated files are not hand-edited; link check reports zero problems).

## Clarifications

### Session 2026-10-23

- Q: How closely should the site follow the reference post? → A: "Make it look like" the reference post: the same overall look and reading experience (clean white page, wide whitespace, large headline block with author/date/reading-time line, narrow readable column, large-type headings, light code panels, sticky side contents list, restrained accent colour). Still not copied: its text, images, logo, name and brand marks.
- Q: Which pages get the new design? → A: Option B. The article, plus the build-along guide (a landing page and the six step pages) in the same design. Evidence gets one styled index page that links to each evidence file as plain text; the evidence files themselves are not restyled.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the article like a blog post (Priority: P1)

A reader opens the site and lands on the article, "Kafka Connect Deep Dive: Sybase CDC Source Connector". It reads like the Confluent JDBC deep-dive post it is modelled on: a title block with a short summary, a comfortable single reading column, a table of contents that follows the reader down the page, readable code and output blocks, highlighted notes and check-yourself questions, and previous/next navigation between sections.

**Why this priority**: The article is the main deliverable. Without a clean reading experience the rest of the site has no value.

**Independent Test**: Open the site on a desktop and on a phone-sized window. Read Sections 1 to 3 without scrolling sideways, find any section from the table of contents in one click, and copy a command from a code block.

**Acceptance Scenarios**:

1. **Given** the site is open on a desktop window, **When** the reader scrolls through a section, **Then** the table of contents stays visible and marks the section currently being read.
2. **Given** a code or command block, **When** the reader uses its copy control, **Then** exactly the text of that block is on the clipboard.
3. **Given** a phone-sized window, **When** the reader opens any section, **Then** nothing needs sideways page scrolling (wide code blocks may scroll inside their own box) and the table of contents is reachable from a menu.
4. **Given** the reader finishes a section, **When** they use the next control, **Then** they land on the following section; on the last section there is no next control.

---

### User Story 2 - Find things on the whole site (Priority: P2)

A reader who wants one fact (for example "what is an oqid" or "why is no data arriving") can search the site and jump to the matching section or heading. The site also links the article to the rest of the material: the build-along guide, the handbook, and the evidence files, from a clear top navigation.

**Why this priority**: The article is long (13 sections). Search and navigation turn it from a one-time read into a reference.

**Independent Test**: Type a term from Section 6 into the search; the result list shows the matching headings and following a result lands on the right place. Use the top navigation to reach the handbook and an evidence file.

**Acceptance Scenarios**:

1. **Given** a term that appears in the article, **When** the reader searches for it, **Then** results list the sections and headings that contain it, and choosing a result scrolls to that heading.
2. **Given** a term that appears nowhere, **When** the reader searches, **Then** the site says that nothing was found and does not show an error.
3. **Given** any page, **When** the reader uses the top navigation, **Then** they can reach the article, the build-along guide, the handbook and the evidence index.

---

### User Story 3 - Use the site comfortably in any setting (Priority: P3)

A reader can switch between light and dark themes (the site starts with their device preference and remembers a manual choice), print a section legibly, and use the keyboard and a screen reader for all navigation. The site works when opened from disk or from a simple local file server, with no internet connection.

**Why this priority**: Comfort and access make the site "ready to use" but the content is readable without them.

**Independent Test**: Switch the theme, reload and confirm the choice is kept; print preview one section; tab through the page and operate the table of contents, search and copy controls without a mouse; open the site with the network disconnected.

**Acceptance Scenarios**:

1. **Given** a device set to dark mode, **When** the site opens for the first time, **Then** it shows the dark theme; after the reader picks light manually and reloads, it stays light.
2. **Given** a print preview of one section, **When** it is shown, **Then** navigation, search and theme controls are hidden and code blocks are not cut off.
3. **Given** no internet connection, **When** the site is opened, **Then** all text, styling, fonts, images and diagrams still display and all controls work.

---

### Edge Cases

- A very wide code or output block (for example a 200-column log line): it scrolls inside its own box and never widens the page.
- A reader opens a link to a specific heading (a bookmarked section): the page lands on that heading and the table of contents highlights it.
- Scripts disabled in the browser: the article text, headings, links and the table of contents list still read correctly; only copy, search, theme switching and highlighting are unavailable.
- Copy fails (clipboard not permitted): the control shows that copying did not work and the text stays selectable.
- A section is added or renamed in the article sources: after a rebuild the table of contents, search and previous/next navigation include it without any hand edit.
- The article's wide tables (for example the data types table): they scroll inside their own box on a phone.
- Very small window (320 px wide): content still readable and no horizontal page scroll.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST present the 13-section article as a long-form blog-style page: title block (title, one-sentence summary, date, reading time), a single readable text column, and consistent heading, paragraph, list, table and figure styles. (US1; Principle V)
- **FR-002**: The site MUST show a table of contents listing every section and sub-heading, keep it visible while reading on wide windows, mark the section currently in view, and offer it as an openable menu on narrow windows. (US1)
- **FR-003**: Code, command and output blocks MUST be visually distinct from prose, keep their line breaks, scroll inside their own box when too wide, and carry a copy control that copies exactly the block text and confirms the copy. (US1)
- **FR-004**: Notes, warnings and "not run" labels in the article MUST be shown as visibly distinct callouts, and the "Check yourself" questions MUST be collapsible with the answer hidden until opened. The visual styles MUST not change any statement's wording. (US1; Principle I)
- **FR-005**: Each section MUST end with previous/next navigation, and the page MUST show reading progress. (US1)
- **FR-006**: The site MUST offer search across the article that returns matching sections and headings, jumps to the chosen heading, and says clearly when nothing matches. (US2)
- **FR-007**: The site MUST include the article, a build-along guide (landing page plus six step pages built from the existing step READMEs) and an evidence index page in the same design, and the top navigation MUST link to the article, the build-along guide, the handbook and the evidence index (each evidence file opens as plain text); every internal link on the site MUST resolve (zero link-check problems). (US2; Principle V)
- **FR-008**: The site MUST offer light and dark themes, default to the device preference, and remember a manual choice between visits. (US3)
- **FR-009**: The layout MUST work from 320 px wide to large desktop screens with no horizontal page scroll, and MUST have a print style that hides controls and keeps code blocks complete. (US3)
- **FR-010**: All interactive controls (table of contents, search, theme switch, copy, previous/next, collapsible questions) MUST be operable by keyboard and expose accessible names; text and controls MUST meet a contrast ratio of at least 4.5:1 for body text and 3:1 for large text in both themes. (US3)
- **FR-011**: The finished site MUST work offline: no content, style, font, script or image may be loaded from the internet at read time. External links in the article (to vendor documentation) stay as ordinary links. (US3; Principle IV)
- **FR-012**: The site MUST be generated from the existing article sources by the recorded build command; the table of contents, search index and previous/next links MUST be produced by that build, and generated files MUST NOT be hand-edited. (Principle V)
- **FR-013**: The site MUST NOT add, change or remove any claim, number, command or output of the article; it changes presentation only. A check MUST confirm, section by section, that the text of each article section body and each guide page body in the built site equals its source text. The comparison covers the body only: added page parts (title block, header, contents, previous/next links, buttons) are excluded, and guide pages are compared with their README after Markdown rendering with tags removed. (Principle I)
- **FR-014**: The existing handbook (`docs/index.html`) MUST keep working unchanged in content, with its links still resolving; it is reached from the new navigation. (Principle V)
- **FR-016**: The site MUST show the Java source of the connector and the file that builds the JAR (added after review, when the first version showed only snippets): a code index page, one page per Java file of the finished connector and for each increment's starter and reference-solution files, and an article section that states the build command and what the JAR contains. Each code page MUST equal its source file exactly, and the build command and JAR contents MUST be checked by running them. (Principles I, V)
- **FR-015**: The site MUST carry no secrets and MUST pass the repository secret scan; the deliverable MUST be listed in the checksum file. (Principles IV, V)

### Key Entities

- **Article section**: one of the 13 chapters; has a number, title, heading anchors, body, check questions, and previous/next neighbours.
- **Site page**: the article page, the build-along guide page, the evidence index page; each has a title and navigation.
- **Search entry**: a heading or section with its text and its anchor, produced at build time.
- **Reader preference**: the chosen theme; kept only in the reader's own browser.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can reach any of the 13 sections from the table of contents in one click (checked by clicking all 13 entries), and any heading found by search in at most two actions (type, choose). Checked by walking all 12 sections.
- **SC-002**: At widths 320, 375, 768 and 1280 px, 0 pages need horizontal page scrolling. Checked by a scripted measurement at each width and recorded as evidence.
- **SC-003**: 100% of internal links and anchors on the site resolve (link check reports `problems=0`).
- **SC-004**: With the network disconnected, 100% of pages display fully (0 failed resource requests). Checked by loading every page with outside requests blocked.
- **SC-005**: In a keyboard-only walkthrough, a reader can open the table of contents, run a search, switch the theme, copy a block and open a check question without a mouse (6 of 6 actions).
- **SC-006**: The section-by-section text comparison (body text only, as defined in FR-013) between the built site and the sources reports 0 differences.
- **SC-007**: A rebuild from the sources with one command reproduces the site, and the checksum file verifies afterwards.
- **SC-008**: Review check: the page layout contains the elements of the reference post that the user pointed to (title block, reading column, side table of contents, code blocks, callouts, previous/next); the comparison is a written side-by-side list of the look elements named in Clarifications (headline block, column width, heading scale, code panels, side contents, accent colour), checked against screenshots of both pages, not a visual-similarity score.

## Assumptions

- The reference post is the visual model: the site should look like it in layout, typography feel, spacing and colour mood (see Clarifications). Its text, images, logo and brand marks are not copied; the site carries this project's own name and no third-party branding.
- The user named HTML, CSS, JavaScript and Tailwind as the technologies. They are treated as a project constraint: the Tailwind styles are produced at build time and shipped as a local file, so the site needs no internet at read time (FR-011). Details belong in the plan.
- The article sources in `docs-src/article/` remain the single source of truth; the site is a new presentation of them and becomes the published article. The old plain `docs/article.html` output is kept until the user decides to drop it (see plan, research item 9).
- "Site" means the article plus links to the existing build-along guide, handbook and evidence files; rewriting the handbook's own design is out of scope.
- Hosting is out of scope: the site is a folder of static files that opens from disk or a simple local file server. Publishing to the internet is not part of this feature and would be a separate, confirmed step.
- Search runs entirely in the browser over an index built at build time; no server and no outside service.
- The build-along step pages keep the README text unchanged (FR-013 applies to them too); the evidence files are linked, not restyled.
- Only the article language already written (English) is supported; no translation, comments, analytics or accounts.
- Screenshots or measurements used as evidence are captured by running the site locally in this environment; anything not run (for example a specific mobile browser) is labelled "not run" (Principle I).
