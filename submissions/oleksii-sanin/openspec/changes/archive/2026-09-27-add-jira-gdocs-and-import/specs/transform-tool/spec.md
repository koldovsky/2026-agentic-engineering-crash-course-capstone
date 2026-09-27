## RENAMED Requirements

- FROM: `### Requirement: The page turns pasted markdown into four outputs`
- TO: `### Requirement: The page turns markdown into channel outputs`

## MODIFIED Requirements

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

## ADDED Requirements

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
