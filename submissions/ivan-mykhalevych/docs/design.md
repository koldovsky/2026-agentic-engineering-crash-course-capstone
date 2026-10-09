# Design tokens (v0.1)

Status: part of the specification (`docs/spec.md`), so design changes start here. Colour values live
only in `src/app/globals.css`; change a value there, not in components.

## Mood
A dark "code editor" feel with a warm Java-coffee accent. A light theme follows the
system setting (`prefers-color-scheme`). Dark is the default.

## Colour tokens
The values live only in `src/app/globals.css` (a dark set, and a light set under
`prefers-color-scheme: light`); this file does not repeat them, so they cannot drift. The tokens
and their use: `bg` page background, `surface` cards, `line` borders, `ink` main text, `muted`
secondary text, `accent` links, primary buttons and highlights, `accent-2` gradient partner of
`accent`, `on-accent` text on accent buttons, `good` correct answers, `bad` wrong answers and errors.

Every text and background pairing must reach a 4.5:1 contrast ratio in both themes; a measured
audit on 2026-10-01 found the light-theme button label at 3.58:1, which is why `on-accent` and the
light `accent-2` exist. Native dropdown option lists are themed too (`select option` and
`select option:checked` in `globals.css`), because the browser's default white list made the
selected language unreadable.

## First screen fits the viewport
The home page (header, hero and the three level cards) must be fully visible without vertical
scrolling on laptop screens: any viewport of at least 1280 x 600 px, in English and in Ukrainian.
This covers the usual page area of a 15.6" laptop (about 1366 x 650 up to 1920 x 950, also with
display scaling). Phones may scroll vertically but never horizontally. What keeps it compact:
hero title `text-3xl` (`sm:text-4xl`) that wraps to two lines at the shared `max-w-3xl` width,
page padding `py-6 sm:py-8`, a two-line intro, and level cards with the glyph and level name on
one row. Measured on 2026-10-02: the cards end at 521 px at 1366 x 650 (Ukrainian) and at 501 px
at 1280 x 600 (English); at 1366 x 650 the page height equals the viewport. When content is
added to the home page, measure again: `document.documentElement.scrollHeight` must not exceed
`window.innerHeight` at 1280 x 600.

## Typography
- Headings and code: JetBrains Mono. Body: Geist Sans.
- Scale as used in the components: page title `text-3xl` (1.875rem), home hero `text-4xl`,
  `sm:text-5xl`, card title `text-xl` (1.25rem), body 1rem, captions and controls `text-sm` (0.875rem).

## Shape and motion
- Radius: 1rem (`rounded-2xl`) for cards, 0.75rem (`rounded-xl`) for buttons, options, inputs and menus.
- Cards use a 1px `line` border and a soft backdrop blur.
- Colour and opacity changes use Tailwind's default 150 ms transition; `prefers-reduced-motion`
  switches transitions and animations off.

## Background
Generated inline SVG (no external images, no licensing issues): a navy gradient, two
soft amber glows, faint Java-flavoured code fragments and a coffee-steam curve. It is
fixed behind all content, `aria-hidden`, and never carries information.

## Language switcher
A select in the header, left of the profile switcher, with the options "English" and
"Українська". Ukrainian text is about 15-25% longer than English, so every layout must wrap
instead of overflowing; level names (Junior, Middle, Senior) stay in Latin letters.

## Accessibility
- Body text contrast at least 4.5:1 against its surface in both themes.
- Correct/incorrect states are also conveyed by text ("Correct!" / "Not quite."), not
  colour alone.
- Visible focus ring: 2px `accent`.
