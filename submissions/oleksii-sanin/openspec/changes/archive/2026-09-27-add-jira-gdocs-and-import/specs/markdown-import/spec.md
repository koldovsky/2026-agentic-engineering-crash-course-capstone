## ADDED Requirements

### Requirement: A local file opens into the textarea

The page SHALL open a file that the visitor picks. A `.md`, `.markdown` or `.txt` file MUST load into
the textarea unchanged. An `.html` or `.docx` file MUST load as its markdown conversion. The page MUST
refuse a file over 1 MB, and it MUST NOT read that file.

#### Scenario: A markdown file loads unchanged
- **WHEN** a visitor opens `post.md`
- **THEN** the textarea holds the exact text of `post.md`

#### Scenario: An oversized file is refused
- **WHEN** a visitor opens a file of 2 MB
- **THEN** the page shows a message that names the 1 MB limit, and the textarea does not change

#### Scenario: An unsupported file is refused
- **WHEN** a visitor opens `photo.png`
- **THEN** the page shows a message that names the supported extensions, and the textarea does not
  change

### Requirement: HTML converts to markdown

The HTML conversion SHALL turn HTML into markdown. Headings, paragraphs, emphasis, links, lists,
code blocks and block quotes MUST survive. The content of `<script>` and `<style>` elements MUST be
dropped. An image with a `data:` URL MUST be dropped, because one such image can hold more than the
100 KB that the transform accepts. The Google Docs clipboard format MUST convert with the emphasis
that the document shows.

The HTML comes from a clipboard or a file, so it is untrusted. A link or an image with a URL that is
not `http:`, `https:`, `mailto:` or relative MUST be dropped, in any letter case. A dropped link keeps
its text. Audio, video, frames and form fields MUST be dropped. The transform parses no GFM, so a
table MUST convert to the text of its cells, and struck-through text MUST convert to plain text. The
conversion MUST NOT throw on these elements.

#### Scenario: A script link is dropped
- **WHEN** the input is `<a href="javascript:alert(1)">click</a>`
- **THEN** the markdown holds `click`, and it does not hold `javascript:`

#### Scenario: A table and struck-through text become plain text
- **WHEN** the input holds a table with the cells `a` and `b`, and the struck-through text `old`
- **THEN** the markdown holds `a`, `b` and `old`, and the conversion does not throw

#### Scenario: A heading and a link survive
- **WHEN** the input is `<h2>Setup</h2><p>See <a href="https://example.com">docs</a>.</p>`
- **THEN** the markdown holds the line `## Setup` and the text `[docs](https://example.com)`

#### Scenario: A code block keeps its language
- **WHEN** the input is `<pre><code class="language-ts">const a = 1</code></pre>`
- **THEN** the markdown holds a fence marked `ts` around `const a = 1`

#### Scenario: A script is dropped
- **WHEN** the input is `<script>alert(1)</script><p>Hi</p>`
- **THEN** the markdown holds `Hi`, and it does not hold `alert`

#### Scenario: An inline image is dropped, a linked image stays
- **WHEN** the input holds one `<img>` with a `data:` URL and one `<img>` with an `https:` URL
- **THEN** the markdown holds image syntax for the `https:` image only

#### Scenario: Google Docs HTML keeps only the real bold
- **WHEN** the input is HTML copied from Google Docs, with one bold word in a paragraph
- **THEN** the markdown holds that word between `**` marks, and no other word in the paragraph is
  bold

### Requirement: Rich text pastes as markdown

The page SHALL hold a `Paste rich text` control. The control SHALL read the `text/html` entry of the
clipboard, convert it to markdown, and put the markdown in the textarea. A normal paste into the
textarea MUST NOT convert, because code editors such as VS Code also put HTML on the clipboard.

#### Scenario: Rich text from Google Docs becomes markdown
- **WHEN** a visitor copies a heading and a paragraph in Google Docs and uses `Paste rich text`
- **THEN** the textarea holds a markdown heading and the paragraph text

#### Scenario: A clipboard with no rich text changes nothing
- **WHEN** the clipboard holds plain text only, and a visitor uses `Paste rich text`
- **THEN** the page shows a message that the clipboard holds no rich text, and the textarea does not
  change

#### Scenario: A normal paste does not convert
- **WHEN** a visitor copies markdown from VS Code and pastes it with the keyboard shortcut
- **THEN** the textarea holds the plain text of the clipboard, unchanged

### Requirement: A .docx file converts to markdown

The `.docx` conversion SHALL turn a Word file into markdown. Headings, paragraphs, bold, italic, lists
and links MUST survive. Images MUST be dropped.

#### Scenario: The structure survives
- **WHEN** the input is a `.docx` file with a Heading 1, a paragraph with one bold word, and a bullet
  list of two items
- **THEN** the markdown holds a `#` heading, the bold word between `**` marks, and two list items

#### Scenario: An image is dropped
- **WHEN** the input is a `.docx` file that holds an image
- **THEN** the markdown holds no `data:` URL and no image syntax

### Requirement: Jira wiki markup converts to markdown

The Jira conversion SHALL turn Jira wiki markup into markdown. It MUST support every construct that
the `jira` output of the transform writes. It MUST also read `{noformat}` blocks and `bq.` lines,
because people who write Jira by hand use both. Inline text that markdown reads as markup, such as
`<` and a backtick, MUST stay text. A line that markdown reads as a block, such as `1. step` or
`> note`, is a named ceiling: it becomes that markdown block. A construct outside that set MUST pass
through as text, and the conversion MUST NOT throw. The page SHALL hold a `Convert Jira text` control
that replaces the textarea content with its markdown conversion. The control MUST NOT convert the same
text twice: after a conversion, it stays off until the textarea changes.

#### Scenario: Markdown survives a round trip through Jira
- **WHEN** a markdown fixture with headings, emphasis, inline code, a fenced code block, a link, a
  nested list and a block quote goes through the `jira` output and then through the Jira conversion
- **THEN** the blog HTML of the result equals the blog HTML of the fixture

#### Scenario: An unsupported macro passes through
- **WHEN** the input holds `{panel}Note{panel}`
- **THEN** the markdown holds `Note`, and the conversion does not throw

#### Scenario: The page converts the textarea
- **WHEN** a visitor pastes `h2. Setup` into the textarea and uses `Convert Jira text`
- **THEN** the textarea holds `## Setup`

#### Scenario: The control does not convert the same text twice
- **WHEN** a visitor uses `Convert Jira text`, and the textarea does not change after it
- **THEN** the `Convert Jira text` control is off

#### Scenario: A noformat block and a bq. line convert
- **WHEN** the input holds the line `bq. Quoted` and a `{noformat}` block
- **THEN** the markdown holds `> Quoted`, and a fence around the body of the block

#### Scenario: Angle brackets stay text
- **WHEN** the input is `returns List<String>`
- **THEN** the blog HTML of the markdown shows `List<String>` as text

### Requirement: An import that gives no text keeps the draft

The page MUST NOT replace the textarea with an import that holds no text. It MUST show a message
instead. An import result that arrives after a later import, or after an edit in the textarea, MUST
NOT replace the textarea.

#### Scenario: Rich text with only an inline image changes nothing
- **WHEN** the clipboard HTML holds only an image with a `data:` URL, and a visitor uses
  `Paste rich text`
- **THEN** the page shows a message, and the textarea does not change

#### Scenario: A late import changes nothing
- **WHEN** an import ends after a later import, or after an edit in the textarea
- **THEN** the textarea keeps the text of the later import or the edit

### Requirement: The import sends nothing to the server

The page SHALL run every conversion to markdown in the browser. A file and a clipboard entry MUST NOT
go to the server. Only the markdown text goes to the server, and only when the visitor starts the
transform.

#### Scenario: A .docx file stays in the browser
- **WHEN** a visitor opens a `.docx` file
- **THEN** the browser sends no request that holds the file content
