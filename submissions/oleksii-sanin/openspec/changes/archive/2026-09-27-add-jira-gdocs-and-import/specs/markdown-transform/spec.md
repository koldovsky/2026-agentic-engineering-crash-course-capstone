## RENAMED Requirements

- FROM: `### Requirement: One source, four outputs`
- TO: `### Requirement: One source, all channel outputs`

## MODIFIED Requirements

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

## ADDED Requirements

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
