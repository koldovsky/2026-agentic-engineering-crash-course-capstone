# markdown-transform Specification

## Purpose
TBD - created by archiving change add-markdown-transform. Update Purpose after archive.
## Requirements
### Requirement: Blog output keeps the document structure

The `blog` output SHALL be HTML. Headings, fenced code blocks, lists and links MUST survive the
transform with their structure intact.

#### Scenario: A fenced code block stays a code block
- **WHEN** the source holds a fence marked `ts` with two lines of code
- **THEN** `blog` holds one `<pre><code class="language-ts">` element with both lines inside it

#### Scenario: A link keeps its target
- **WHEN** the source holds `[docs](https://example.com/a?b=1)`
- **THEN** `blog` holds an `<a>` element whose `href` is exactly `https://example.com/a?b=1`

### Requirement: Email output carries inline styles

The `email` output SHALL be HTML with style attributes on the elements. It MUST NOT rely on a
`<style>` block or on an external stylesheet, because Gmail strips both.

#### Scenario: A heading carries a style attribute
- **WHEN** the source holds an `h2` heading
- **THEN** `email` holds an `<h2>` element with a `style` attribute

#### Scenario: A code block stays readable
- **WHEN** the source holds a fenced code block
- **THEN** `email` holds that block with a monospace `font-family` in its `style` attribute

### Requirement: The X thread splits at sentence boundaries

The `x` output SHALL be an array of parts. Each part MUST hold 280 graphemes or fewer, counted with
`Intl.Segmenter`. A split MUST fall on a sentence boundary. A split MUST NOT fall inside a word. A
word is a run of characters with no space in it, so a URL is one word. One exemption applies: a word
longer than a whole part splits between graphemes. Each part SHALL carry a `n/total` counter.

The target of each link element SHALL sit on its own line, as in the LinkedIn output. The text of a
link element does not hold its target, so the target needs a line of its own. A bare URL in the
prose stays where it is.

A code block longer than one part SHALL split at a line end. One exemption applies: a line longer
than a whole part splits between graphemes. Each piece MUST open and close its own fence. A code
block inside a list item SHALL follow the text of that item.

The grapheme count is a known ceiling. X applies its own weighted count, so a part with many URLs or
CJK characters may land a few characters off.

#### Scenario: Short input gives one part
- **WHEN** the source holds one sentence of 100 characters
- **THEN** `x` holds exactly one part, and that part carries the counter `1/1`

#### Scenario: Long input splits on sentences
- **WHEN** the source holds six sentences of 100 characters each
- **THEN** every part is 280 graphemes or fewer, and every part ends at a sentence boundary

#### Scenario: A sentence longer than the limit splits at a word boundary
- **WHEN** the source holds one sentence of 400 characters with no internal full stop
- **THEN** the parts split at a space, and no part cuts a word in half

#### Scenario: A word longer than a part fills the open part first
- **WHEN** the source holds a short phrase and then one word of 400 characters
- **THEN** the word splits between graphemes, and the part before the first cut is full

#### Scenario: A URL in a long sentence stays whole
- **WHEN** a sentence longer than one part holds a bare URL that is shorter than one part
- **THEN** the URL sits whole in one part

#### Scenario: An emoji does not break the count
- **WHEN** the source holds a sentence that ends with a family emoji
- **THEN** the emoji stays whole in one part, and the part holds 280 graphemes or fewer

#### Scenario: A fenced code block stays in its own part
- **WHEN** the source holds a paragraph and then a fenced code block of 5 lines
- **THEN** the code block occupies its own part, and the paragraph occupies another

#### Scenario: A code block inside a list item or a quote stays in its own part
- **WHEN** the source holds a list item or a quote that holds a fenced code block
- **THEN** the code block occupies its own part, and the text occupies another

#### Scenario: Each list item keeps its code below it
- **WHEN** the source holds a list of two items, and each item holds a fenced code block
- **THEN** the text of item 1, its code, the text of item 2 and its code come in that order

#### Scenario: A split code block keeps its fences
- **WHEN** the source holds a fenced code block longer than one part
- **THEN** every part opens and closes its own fence, and every line keeps its indent

#### Scenario: A code block splits at a line end
- **WHEN** the source holds a code block with a short line and then a line longer than one part
- **THEN** the short line ends a part, and only the long line splits between graphemes

### Requirement: LinkedIn output is plain text

The `linkedin` output SHALL be plain text. Emphasis marks and heading marks MUST be removed. The
target of each link element MUST sit on its own line, because LinkedIn breaks an inline link. A bare
URL in the prose stays where it is. The output MUST hold 3000 characters or fewer.

#### Scenario: Emphasis marks are removed
- **WHEN** the source holds `**bold**` and `_italic_`
- **THEN** `linkedin` holds `bold` and `italic` with no asterisk and no underscore

#### Scenario: A link moves to its own line
- **WHEN** the source holds a paragraph with an inline link
- **THEN** `linkedin` holds the link text in the paragraph, and the URL on the next line

#### Scenario: Long input is cut at a sentence
- **WHEN** the source produces more than 3000 characters of plain text
- **THEN** `linkedin` ends at the last complete sentence under 3000 characters
- **AND** the result marks the output as truncated

### Requirement: The result reports its own size

The transform SHALL return a `meta` object beside the six outputs. `meta` MUST hold the X thread part
count, and the character count of each output.

#### Scenario: Meta counts the thread parts
- **WHEN** the transform returns three X parts
- **THEN** `meta.x.parts` is 3

#### Scenario: Meta counts the characters
- **WHEN** the transform returns a LinkedIn output of 1200 characters
- **THEN** `meta.linkedin.chars` is 1200

#### Scenario: Meta counts the Jira and Google Docs outputs
- **WHEN** the transform returns a `jira` output and a `gdocs` output
- **THEN** `meta.jira.chars` equals the length of `jira`, and `meta.gdocs.chars` equals the length of
  `gdocs`

### Requirement: One source, all channel outputs

The transform SHALL accept one markdown string and return six outputs in one call: `blog`, `email`,
`x`, `linkedin`, `jira` and `gdocs`. The transform SHALL be a pure function. It MUST NOT import React
and it MUST NOT import Next.

#### Scenario: All six outputs come back together
- **WHEN** the caller passes a markdown string with a heading, a paragraph and a link
- **THEN** the result holds a non-empty value for `blog`, `email`, `x`, `linkedin`, `jira` and `gdocs`

#### Scenario: The same input gives the same output
- **WHEN** the caller runs the transform twice on the same string
- **THEN** both results are equal

#### Scenario: Empty input does not throw
- **WHEN** the caller passes an empty string
- **THEN** the result holds an empty value for each of the six outputs, and no error is thrown

### Requirement: Jira output is wiki markup

The `jira` output SHALL be Jira wiki markup. Headings, emphasis, inline code, fenced code, links,
images, lists, block quotes and horizontal rules MUST map to their wiki markup form. A character that
wiki markup reads as markup MUST be escaped with a backslash when it occurs in plain text. A `hN. ` or
`bq. ` at the start of a line counts as markup. Jira cannot nest `{quote}`, so a block quote inside a
block quote MUST join the outer quote. A code block inside a list item MUST follow the item line with
no blank line, because a blank line ends a Jira list.

#### Scenario: A heading gets its level prefix
- **WHEN** the source holds `## Setup`
- **THEN** `jira` holds the line `h2. Setup`

#### Scenario: Emphasis uses the Jira marks
- **WHEN** the source holds `**bold**` and `_italic_`
- **THEN** `jira` holds `*bold*` and `_italic_`

#### Scenario: Inline code uses double braces
- **WHEN** the source holds `` `pnpm check` ``
- **THEN** `jira` holds `{{pnpm check}}`

#### Scenario: A fenced code block keeps its language
- **WHEN** the source holds a fence marked `ts` with two lines of code
- **THEN** `jira` holds the line `{code:ts}`, then both lines unchanged, then the line `{code}`

#### Scenario: A fence with no language gets a bare code macro
- **WHEN** the source holds a fence with no language
- **THEN** `jira` holds the code between a `{code}` line and a `{code}` line

#### Scenario: A link uses the pipe form
- **WHEN** the source holds `[docs](https://example.com/a?b=1)`
- **THEN** `jira` holds `[docs|https://example.com/a?b=1]`

#### Scenario: A nested list keeps its depth and its type
- **WHEN** the source holds a bullet item with a numbered item nested under it
- **THEN** `jira` holds `* ` before the bullet item, and `*# ` before the nested item

#### Scenario: A block quote uses the quote macro
- **WHEN** the source holds a block quote of two paragraphs
- **THEN** `jira` holds both paragraphs between a `{quote}` line and a `{quote}` line

#### Scenario: Markup characters in plain text are escaped
- **WHEN** the source holds the plain text `use {name} or [id]`
- **THEN** `jira` holds `use \{name\} or \[id\]`

#### Scenario: A text line that starts like a heading is escaped
- **WHEN** the source holds the paragraph `h2. looks like a heading`
- **THEN** `jira` holds `h2\. looks like a heading`

#### Scenario: An image uses the bang form
- **WHEN** the source holds `![alt](https://example.com/i.png)`
- **THEN** `jira` holds `!https://example.com/i.png!`

#### Scenario: A nested block quote joins the outer quote
- **WHEN** the source holds a block quote with a second block quote inside it
- **THEN** `jira` holds one `{quote}` line before both paragraphs and one `{quote}` line after them

### Requirement: Google Docs output pastes as formatted text

The `gdocs` output SHALL be HTML. Headings, lists and links MUST be plain HTML elements with no `style`
attribute, so that Google Docs maps them to its own heading and list styles. A code block and inline
code MUST carry a monospace `font-family` in a `style` attribute, because Google Docs drops a `<style>`
block.

#### Scenario: A heading carries no style
- **WHEN** the source holds `## Setup`
- **THEN** `gdocs` holds `<h2>Setup</h2>`, and the `<h2>` element has no `style` attribute

#### Scenario: Code stays monospace
- **WHEN** the source holds a fenced code block and an inline code span
- **THEN** the `<pre>` element and the inline `<code>` element in `gdocs` each carry a monospace
  `font-family` in a `style` attribute

