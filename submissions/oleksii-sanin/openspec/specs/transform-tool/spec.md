# transform-tool Specification

## Purpose
TBD - created by archiving change add-markdown-transform. Update Purpose after archive.
## Requirements
### Requirement: Each output can be copied in one action

Each tab SHALL hold a copy button. The button MUST copy the raw output of that tab, not the rendered
HTML of the page.

#### Scenario: The blog tab copies HTML source
- **WHEN** a visitor uses the copy button on the `Blog` tab
- **THEN** the clipboard holds the HTML source string

#### Scenario: The X tab copies one part
- **WHEN** a visitor uses the copy button beside part 2 of 3
- **THEN** the clipboard holds the text of part 2 only

### Requirement: The route handler stays thin

`app/api/transform/route.ts` SHALL read the markdown from the request body. It SHALL call the
`lib/transform` function. It MUST NOT hold transform logic of its own.

#### Scenario: A valid request returns the four outputs
- **WHEN** a client posts `{ "markdown": "# Title" }`
- **THEN** the handler answers 200, and the body holds `blog`, `email`, `x`, `linkedin` and `meta`

#### Scenario: A body without markdown is rejected
- **WHEN** a client posts `{}`
- **THEN** the handler answers 400, and the body names the missing field

#### Scenario: An oversized body is rejected
- **WHEN** a client posts a request body over 100 KB
- **THEN** the handler answers 413, and it does not call the transform

### Requirement: The tool stores nothing

The tool SHALL hold the markdown and the outputs in the browser only. It MUST NOT write to a database.
It MUST NOT log the markdown text on the server.

#### Scenario: A reload clears the work
- **WHEN** a visitor reloads the page
- **THEN** the textarea is empty, and the four tabs hold no output

#### Scenario: The server keeps no copy
- **WHEN** the handler answers a transform request
- **THEN** the server writes no record of the markdown text

### Requirement: The page turns markdown into channel outputs

The tool page SHALL accept markdown in a textarea. It SHALL show the six outputs in six tabs: `Blog`,
`Email`, `X thread`, `LinkedIn`, `Jira`, `Google Docs`. The page MUST work without an account and
without a login.

#### Scenario: Paste gives six tabs
- **WHEN** a visitor pastes markdown into the textarea and starts the transform
- **THEN** the page shows six tabs, and each tab holds the output for its channel

#### Scenario: The X tab shows each part apart
- **WHEN** the transform returns three X parts
- **THEN** the X tab shows three blocks, and each block carries its `n/total` counter

#### Scenario: An empty textarea shows no error
- **WHEN** a visitor starts the transform with an empty textarea
- **THEN** the page shows empty outputs, and it shows no error message

### Requirement: The Google Docs tab copies rich text

The copy button on the `Google Docs` tab SHALL write two clipboard entries: the `gdocs` output as
`text/html`, and the markdown source as `text/plain`. A paste into Google Docs MUST give formatted
text, not HTML tags.

#### Scenario: The clipboard holds both entries
- **WHEN** a visitor uses the copy button on the `Google Docs` tab
- **THEN** the clipboard holds a `text/html` entry equal to `gdocs`, and a `text/plain` entry equal to
  the markdown source

#### Scenario: A paste into Google Docs keeps the heading
- **WHEN** a visitor copies the output of `## Setup` and pastes it into a new Google Doc
- **THEN** the document shows `Setup` in the Heading 2 style, and no `<h2>` text appears

