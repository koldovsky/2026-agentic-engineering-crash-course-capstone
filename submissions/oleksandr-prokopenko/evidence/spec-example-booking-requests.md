# Booking Requests Specification

## Purpose

Visitors ask the photographer for a shoot through the public "Order a shoot" form. The server checks and saves each request first, then posts a notice to the Telegram requests group and retries until Telegram accepts it. the photographer works through the requests on the admin page: she sees who wrote, moves each request through its statuses, and deletes the ones she no longer needs. A sentence marked "(inferred)" is a detail the FRs do not state word for word; the owner confirms or corrects it at scope sign-off, like the Assumptions in `docs/requirements.md`.

## Requirements

### Requirement: Order a shoot form fields

The "Order a shoot" page SHALL show the request form (FR-102). Name is required (FR-103). "How to reach you" is one required field that takes a phone number, a Telegram @username or an Instagram handle, with no format check (FR-104). Type of shoot is an optional choice of portrait, event, family, love story or other (FR-105). Preferred date or period is optional free text (FR-106). Message is optional (FR-107). Consent to process personal data is a required checkbox (FR-108). The field limits are: name up to 100 characters, contact up to 200, preferred date up to 100, message up to 2000 (Assumption 11). The server saves every text value exactly as typed, character for character, with no change to letters, spaces or punctuation inside it.

#### Scenario: The form shows every field

- **GIVEN** a visitor opens the "Order a shoot" page in Ukrainian or in English
- **WHEN** the page loads
- **THEN** the page shows the fields Name, How to reach you, Type of shoot, Preferred date or period, Message, and a consent checkbox
- **AND** Name, How to reach you and the consent checkbox are marked as required

#### Scenario: Type of shoot offers the fixed choices

- **GIVEN** the visitor opens the Type of shoot field
- **WHEN** they look at the choices
- **THEN** the choices are portrait, event, family, love story and other
- **AND** the visitor can leave the field empty

#### Scenario: Minimal valid request is accepted

- **GIVEN** a visitor fills only Name "Olena", How to reach you "@olena_k" and ticks consent
- **WHEN** they send the form
- **THEN** the server saves the request with empty shoot type, preferred date and message
- **AND** the visitor sees the thank-you message

#### Scenario: Any contact kind is accepted

- **GIVEN** three separate sends whose contact values are "+380 67 123 45 67", "@olena_k" and "olena.photo.love"
- **WHEN** each form is sent with a name and consent
- **THEN** each request is saved with its contact exactly as typed

#### Scenario: Locale-formatted values are kept exactly as typed

- **GIVEN** a send with Name "Олена Коваль-Іваненко", How to reach you "+380 67 123 45 67" where each space is a non-breaking space (U+00A0), Preferred date "середина жовтня, після 15-го", Message "Добрий день! Хочемо сімейну зйомку 😊", and consent
- **WHEN** the server saves it and the photographer opens the request detail
- **THEN** the database holds each of the four values with the same Unicode code points as sent, including every U+00A0 in the contact
- **AND** the detail page shows the same four texts

### Requirement: Consent links to the Privacy page

The consent checkbox SHALL link to the Privacy page in the same language as the form (FR-109). A request is saved only when consent is given, and the server records the time of consent (FR-108, FR-115).

#### Scenario: Consent link opens Privacy

- **GIVEN** a visitor is on the Ukrainian "Order a shoot" page
- **WHEN** they follow the link in the consent label
- **THEN** the Ukrainian Privacy page opens
- **AND** on the English form the same link opens the English Privacy page

#### Scenario: Send without consent is refused

- **GIVEN** a visitor fills Name and How to reach you and leaves consent unticked
- **WHEN** they send the form
- **THEN** the server saves nothing
- **AND** a message next to the consent checkbox says consent is required

### Requirement: Server re-validation with per-field messages

The server SHALL check every field again, whatever the browser already checked (FR-110). Each invalid field gets its own message next to it. Field limits count characters as Unicode code points: a Cyrillic letter counts as 1 and the emoji 😊 (U+1F60A) counts as 1, whatever its size in bytes. The browser's own limit check counts the same way, so it never stops a value the server would accept; for that reason the form's fields carry no `maxlength` attribute, which counts UTF-16 units and would stop the emoji's second unit. No input produces a generic 500 or shows a stack trace or database driver details (NFR-13, NFR-12, shared).

A text that holds only blank characters counts as empty. Blank characters are the ordinary space, the tab, line breaks and every Unicode separator, non-breaking spaces (U+00A0, U+2007, U+202F) included. An optional field that holds only blank characters is saved as empty (inferred); every other value is saved exactly as typed, leading and trailing spaces included. Two characters cannot be saved as typed: U+0000 and an unpaired surrogate (for example the JSON escape `\ud83d` alone). A field that holds one is refused with its own message, because Postgres rejects U+0000 and would turn the surrogate into `?`.

The one-line fields Name, Contact and Preferred date also refuse every line break and other control character (Unicode category Cc, which includes CR, LF, the tab and U+0085), the line and paragraph separators U+2028 and U+2029, and the bidi embedding, override and isolate characters U+202A to U+202E and U+2066 to U+2069. Such a field is refused with the code `invalid_characters`, because one of these characters could add a fake line to the Telegram notice or disguise a web address in it. A text of only blank characters is still empty, so a Contact of only line breaks is `required`. Only Message keeps its line breaks.

Each refused field comes back with a field name and a code: `required` (an empty required text), `too_long` (with the limit in `max`), `not_allowed` (a shoot type outside the five choices), `consent_required` and `invalid_characters`. The field names are `name`, `contact`, `shootType`, `preferredDate`, `message` and `consent`. The codes are inferred names; the public form endpoint requirement gives the shape of the answer.

#### Scenario: Missing required fields each get a message

- **GIVEN** a request is posted straight to the server with an empty name, an empty contact and no consent
- **WHEN** the server checks it
- **THEN** the server saves nothing
- **AND** the answer names the three fields, each with its own message
- **AND** the form shows each message next to its field

#### Scenario: Blank-only text counts as empty

- **GIVEN** a visitor types into Name only ordinary spaces, only tabs, or only non-breaking spaces (U+00A0), in three separate sends
- **WHEN** they send the form
- **THEN** the server saves nothing for any of the three
- **AND** a message next to Name says the name is required

#### Scenario: Blank optional fields are saved as empty

- **GIVEN** a send with a valid name, contact and consent, Preferred date "   " (three spaces) and Message made of three U+00A0
- **WHEN** the server saves it
- **THEN** the saved request has an empty preferred date and an empty message
- **AND** the notice and the admin detail show no preferred date line and no message line

#### Scenario: Spaces inside a saved value are kept

- **GIVEN** a send with Name " Olena  K " (one space before, two inside, one after), a valid contact and consent
- **WHEN** the server saves it
- **THEN** the database holds the name with the same four spaces and the same characters

#### Scenario: Oversized values are refused per field

- **GIVEN** a send with a 101-character name, a 201-character contact, a 101-character preferred date and a 2001-character message
- **WHEN** the server checks it
- **THEN** the server saves nothing
- **AND** each of the four fields gets its own message that states its character limit

#### Scenario: Oversized Cyrillic value is refused

- **GIVEN** a send whose name is 101 Cyrillic letters "ж", with a valid contact and consent
- **WHEN** the server checks it
- **THEN** the server saves nothing
- **AND** the message next to Name states the 100-character limit

#### Scenario: Values at the limit are accepted

- **GIVEN** a send with a 100-character name, a 200-character contact, a 100-character preferred date and a 2000-character message, with consent
- **WHEN** the server checks it
- **THEN** the request is saved with all four values in full

#### Scenario: Cyrillic and emoji values at the limit are accepted

- **GIVEN** a send with a name of 100 Cyrillic letters "ж" (200 bytes in UTF-8), a preferred date of 100 Cyrillic letters "ї", a message of 1999 Cyrillic letters "є" followed by one "😊" (2000 code points, 4002 bytes in UTF-8), a valid contact and consent
- **WHEN** the visitor types these values into the form and sends it
- **THEN** the browser lets every character in and shows no limit message
- **AND** the server saves the request with all three values in full, the emoji included

#### Scenario: Unknown shoot type is refused

- **GIVEN** a request posted straight to the server with shoot type "wedding"
- **WHEN** the server checks it
- **THEN** the server saves nothing
- **AND** a message next to Type of shoot says the choice is not allowed

#### Scenario: Characters the database cannot hold are refused

- **GIVEN** three sends that are valid except that Name holds "Ol" + U+0000 + "ena", Message holds a lone `\ud83d` escape, and Contact holds "@ol" + U+0000
- **WHEN** the server checks each
- **THEN** the server saves nothing for any of them
- **AND** each answer is HTTP 400 with an error for `name`, `message` and `contact` respectively, each with the code `invalid_characters`
- **AND** no answer holds a SQL state, a driver class name or a stack trace

#### Scenario: A one-line field refuses line breaks, control characters and bidi controls

- **GIVEN** sends that are valid except for one field each: Name holds "Olena" + LF + "K", Contact holds "@olena_k" + LF + "Відкрити: https://evil.example/admin/requests/1", Contact holds a tab, Contact holds U+2028, Preferred date holds "May" + LF + "June", Name holds "Ole" + U+202E + "na", Contact holds U+202A + "@olena_k", and Preferred date holds "May " + U+2066 + "June"
- **WHEN** the server checks each
- **THEN** the server saves nothing for any of them
- **AND** each answer is HTTP 400 with an error for that one field with the code `invalid_characters`
- **AND** the browser's own check gives the same result for the same values

#### Scenario: A message keeps its line breaks

- **GIVEN** a valid send whose Message holds "first line" + CR LF + "second line" + LF + "third"
- **WHEN** the server checks it
- **THEN** the request is saved and the Message is saved as typed

#### Scenario: Every refusal carries a field name and a code

- **GIVEN** posts that each break one rule: an empty name, a 101-character name, shoot type "wedding", consent `false`, consent left out, and a name holding U+0000
- **WHEN** the server checks each
- **THEN** the codes are `required`, `too_long` with `max` 100, `not_allowed`, `consent_required`, `consent_required` and `invalid_characters`
- **AND** each error names the field it belongs to

### Requirement: Malformed public form requests get plain errors

The public form endpoint SHALL answer every malformed request with a plain error, and never with a generic 500, a stack trace or parser details (NFR-13, NFR-12, shared). A malformed request saves nothing and does not count toward the hourly limit (FR-166). The status codes and the handling of unknown fields below are (inferred). The endpoint reads at most 65,536 bytes of body: a larger body gets HTTP 413 and the server stops reading it. The endpoint accepts only POST; any other method gets HTTP 405. A known field sent with the wrong JSON type (a number or object for a text, a string for the consent) gets HTTP 400 with an error for that field and the code `invalid_type`.

#### Scenario: Body that is not valid JSON

- **GIVEN** a POST to the public form endpoint with content type `application/json` and the body `{"name": "Olena",`
- **WHEN** the server reads it
- **THEN** the server answers HTTP 400 with a plain message that the request could not be read
- **AND** the answer holds no stack trace, class name or parser position
- **AND** nothing is saved

#### Scenario: Consent sent as a non-boolean

- **GIVEN** a POST with a valid name and contact and `"consent": "yes"`
- **WHEN** the server reads it
- **THEN** the server answers HTTP 400 with a field error for consent
- **AND** nothing is saved

#### Scenario: A text field sent as a number

- **GIVEN** a POST with `"name": 42`, a valid contact and consent
- **WHEN** the server reads it
- **THEN** the server answers HTTP 400 with an error for `name` with the code `invalid_type`
- **AND** nothing is saved

#### Scenario: Wrong content type

- **GIVEN** a POST to the public form endpoint with content type `text/plain` and a body that would be valid as JSON
- **WHEN** the server reads it
- **THEN** the server answers HTTP 415 with a plain message
- **AND** nothing is saved

#### Scenario: Extra unknown fields are ignored

- **GIVEN** a valid POST that also carries `"status": "done"` and `"price": 1000`
- **WHEN** the server reads it
- **THEN** the request is saved from the known fields only, with status "new"
- **AND** the answer is the normal thank-you answer

#### Scenario: A body over 64 KiB is refused

- **GIVEN** a POST with content type `application/json` and a body of 10 MB whose first bytes are a valid request
- **WHEN** the server reads it
- **THEN** the server answers HTTP 413 with a plain message
- **AND** nothing is saved and the answer holds no server detail

#### Scenario: A body of exactly 65,536 bytes is read

- **GIVEN** a valid POST padded with an unknown field so that its body is exactly 65,536 bytes
- **WHEN** the server reads it
- **THEN** the request is saved and the answer is the normal thank-you answer

#### Scenario: Other methods get 405

- **GIVEN** a GET, a PUT and a DELETE to the public form endpoint
- **WHEN** the server reads each
- **THEN** each answer is HTTP 405 with a plain message
- **AND** nothing is saved or removed

### Requirement: Thank-you message after a successful send

After a successful send the visitor SHALL see the thank-you message in the page's language (FR-111). The exact texts are, in English, "Thank you, the photographer will contact you." and, in Ukrainian, "Дякуємо, фотограф зв’яжеться з вами." (the apostrophe is U+2019). The frontend message catalogue holds these strings word for word. The Ukrainian wording is (inferred) and the owner confirms it. A visitor can fill and send the form in under a minute (NFR-30). The form is one page with one send step, and only Name, How to reach you and consent must be filled.

#### Scenario: Thank-you after saving on the Ukrainian page

- **GIVEN** a visitor fills a valid form on the Ukrainian page
- **WHEN** they send it and the server saves it
- **THEN** the form is replaced by exactly "Дякуємо, фотограф зв’яжеться з вами."

#### Scenario: Thank-you after saving on the English page

- **GIVEN** a visitor fills a valid form on the English page
- **WHEN** they send it and the server saves it
- **THEN** the form is replaced by exactly "Thank you, the photographer will contact you."

#### Scenario: A request takes under a minute at human typing speed

- **GIVEN** an e2e run opens the "Order a shoot" page with the form empty
- **AND** the run types every character with a 250 ms delay between keys, never pastes, and waits 2 seconds before each field and before pressing send
- **WHEN** it fills Name "Olena", How to reach you "@olena_k", picks Type of shoot "family", fills Preferred date "mid-October" and Message "We would like a family shoot in the park", ticks consent and sends
- **THEN** the thank-you message appears less than 60 seconds after the page opened
- **AND** the run's recording is kept and shows the timer from page open to thank-you

#### Scenario: The form has one step

- **GIVEN** a visitor opens the "Order a shoot" page
- **WHEN** they look at the form
- **THEN** every field and the send button are on that one page, with no next step, sign-in or account
- **AND** only Name, How to reach you and consent are required

### Requirement: Failed send keeps the typed text

If sending fails, the visitor SHALL see a clear error that says what went wrong and what to do next, and everything they typed stays in the form (FR-112). Its wording is graded by the error-clarity eval cases that cite NFR-17 (evals/cases/).

#### Scenario: Server unreachable

- **GIVEN** a visitor has filled every field and ticked consent
- **AND** the backend does not answer
- **WHEN** they send the form
- **THEN** the page shows a plain error that the request was not sent and asks them to try again
- **AND** every field keeps the value they typed, and consent stays ticked
- **AND** the error's wording is graded by the error-clarity eval cases that cite NFR-17 (evals/cases/)

#### Scenario: Validation error keeps the other fields

- **GIVEN** a visitor has filled every field with a 2001-character message
- **WHEN** they send the form
- **THEN** the message field shows its limit message
- **AND** Name, How to reach you, Type of shoot, Preferred date, Message and consent keep what the visitor entered

### Requirement: Hidden trap field

The form SHALL carry a hidden trap field that real visitors never see (FR-113). A send with the trap field filled gets the normal thank-you answer. The server saves nothing and sends no Telegram notice for it (Assumption 10).

#### Scenario: Real visitors never meet the trap field

- **GIVEN** a visitor opens the form
- **WHEN** they look at the page or move through it with the keyboard or a screen reader
- **THEN** the trap field is not visible, is not reachable with Tab, and is not announced

#### Scenario: Filled trap field is dropped quietly

- **GIVEN** a send with valid fields and the trap field filled with any text
- **WHEN** the server receives it
- **THEN** the answer is the same thank-you answer a real request gets
- **AND** no request row is saved
- **AND** no Telegram notice is sent

### Requirement: Hourly limit per IP address

One IP address SHALL have at most 10 requests saved per hour (FR-114). The limit is a server setting with the default 10 (FR-167). Only saved requests count toward it (FR-166). The server SHALL count saved requests per IP address in its own memory, and each saved request counts for one hour (FR-114, FR-166). The IP address SHALL NOT be saved with the request. A server restart clears the count. A send above the limit gets HTTP 429, and the form shows the limit message above the send button while the typed text stays. The English message is "Too many requests from your network. Please try again in an hour." (FR-114). The Ukrainian message is "Забагато запитів із вашої мережі. Спробуйте ще раз через годину." (inferred wording, owner confirms). The frontend message catalogue holds both word for word.

The counted address is the client IP address as Spring works it out. How Spring finds it, with Caddy passing the real client address, is owned by the operations capability.

#### Scenario: Eleventh request in an hour is refused on the English page

- **GIVEN** the limit setting is left at its default
- **AND** 10 requests from one IP address were saved within the past hour
- **WHEN** an 11th valid request arrives from that IP address through the English form
- **THEN** the server answers HTTP 429 and saves nothing
- **AND** the form shows exactly "Too many requests from your network. Please try again in an hour." above the send button
- **AND** every field keeps the value the visitor typed

#### Scenario: Eleventh request in an hour is refused on the Ukrainian page

- **GIVEN** 10 requests from one IP address were saved within the past hour
- **WHEN** an 11th valid request arrives from that IP address through the Ukrainian form
- **THEN** the server answers HTTP 429 and saves nothing
- **AND** the form shows exactly "Забагато запитів із вашої мережі. Спробуйте ще раз через годину." above the send button
- **AND** every field keeps the value the visitor typed

#### Scenario: Another visitor address behind Caddy is not affected

- **GIVEN** the local stack runs with Caddy in front of the backend
- **AND** visitor address A has reached the limit through Caddy
- **WHEN** a valid request arrives through Caddy from a different visitor address B
- **THEN** the request is saved and visitor B sees the thank-you message

#### Scenario: A forwarded header set by the visitor is not trusted

- **GIVEN** 10 requests from visitor address A were saved within the past hour through Caddy
- **WHEN** an 11th valid request arrives from A through Caddy carrying `X-Forwarded-For: 198.51.100.23`
- **THEN** the server answers HTTP 429 and saves nothing
- **AND** all 10 earlier sends counted under address A, even when each carried a different forged `X-Forwarded-For` value

#### Scenario: Refused and trapped sends do not count

- **GIVEN** one IP address has 9 saved requests within the past hour
- **AND** from the same address 5 sends were refused for invalid fields and 5 were dropped by the trap field
- **WHEN** a 10th valid request arrives from that address
- **THEN** the request is saved

#### Scenario: The limit follows the setting

- **GIVEN** the server setting for the hourly limit is 3 and the server has been restarted
- **AND** 3 requests from one IP address were saved since that restart, within the past hour
- **WHEN** a 4th valid request arrives from that address
- **THEN** the server answers HTTP 429 and saves nothing

#### Scenario: Requests older than an hour stop counting

- **GIVEN** 10 requests from one IP address were saved more than one hour ago and none since
- **WHEN** a valid request arrives from that address
- **THEN** the request is saved

#### Scenario: A restart clears the count

- **GIVEN** 10 requests from one IP address were saved within the past hour
- **WHEN** the server restarts and a valid request arrives from that address
- **THEN** the request is saved and the visitor sees the thank-you message

#### Scenario: The IP address is not saved with the request

- **GIVEN** a valid request was saved from IP address 203.0.113.7
- **WHEN** a tester reads every column of the saved request row and every other table the server writes for it
- **THEN** no value holds 203.0.113.7 or any other form of the visitor's IP address

### Requirement: Request saved before any notice

A request SHALL be saved with its consent time and the time it arrived before any Telegram notice is tried (FR-115). A new request starts with status "new" and "notice sent" set to no. Requests are kept until the photographer deletes them, and nothing removes them on a timer (NFR-27).

#### Scenario: Saved row exists when the notice is tried

- **GIVEN** the Telegram stub records the moment it is called
- **WHEN** a valid request is sent
- **THEN** at that moment the database already holds the request with name, contact, shoot type, preferred date, message, consent time, status "new", notice sent "no" and created time

#### Scenario: No automatic removal

- **GIVEN** a request saved 400 days ago that the photographer never deleted
- **WHEN** every scheduled job of the server has run
- **THEN** the request is still in the database and in the admin list

### Requirement: Telegram notice to the requests group

Each new request SHALL post a message to the requests group set by its chat ID in the server settings (FR-116). The message holds the name, the contact, the shoot type, the preferred date, the start of the message, and a link to the request's own admin address (FR-101). The start of the message is the first 200 characters, counted as Unicode code points. A longer message is cut after character 200 and followed by "…" (U+2026). A message of 200 characters or fewer appears in full with no "…". An empty optional field is left out of the notice. Visitor text appears in the notice exactly as typed, and Telegram never reads it as formatting. The 200-character cut and the empty-field rule are (inferred). While Telegram is up, the notice arrives within 10 seconds of saving (NFR-22, Assumption 22). A request is marked "notice sent" once Telegram accepts the message (FR-119).

#### Scenario: Notice content

- **GIVEN** a saved request from "Olena", contact "@olena_k", family shoot, preferred date "mid-October", message "Hello, we would like a family shoot in the park"
- **WHEN** the notice is sent
- **THEN** the Telegram message holds "Olena", "@olena_k", the family shoot type, "mid-October", the whole message "Hello, we would like a family shoot in the park" with no "…", and a link to that request's admin address

#### Scenario: Long message is cut at 200 characters

- **GIVEN** a saved request whose message is 2000 characters long
- **WHEN** the notice is sent
- **THEN** the notice holds the first 200 characters of the message followed by "…"
- **AND** the notice holds none of characters 201 to 2000

#### Scenario: Message of exactly 200 characters is not cut

- **GIVEN** a saved request whose message is 200 Cyrillic letters
- **WHEN** the notice is sent
- **THEN** the notice holds all 200 letters and no "…"

#### Scenario: Empty optional fields are left out

- **GIVEN** a saved request with only name "Olena" and contact "@olena_k"
- **WHEN** the notice is sent
- **THEN** the notice holds the name, the contact and the admin link
- **AND** it holds no shoot type, preferred date or message line

#### Scenario: Formatting characters are shown as typed

- **GIVEN** a saved request whose name is "<b>Olena</b>" and whose message is "_hi_ & *bye* [x](y)"
- **WHEN** the notice is sent
- **THEN** Telegram accepts the notice
- **AND** the group shows both texts character for character, with no bold, italic or link

#### Scenario: Notice marked sent

- **GIVEN** a saved request with notice sent "no"
- **WHEN** Telegram accepts the notice
- **THEN** the request's notice sent flag becomes "yes"
- **AND** no further try is made for that request

#### Scenario: Notice arrives within 10 seconds

- **GIVEN** Telegram is up
- **WHEN** a valid request is saved
- **THEN** the notice appears in the requests group within 10 seconds of the save

### Requirement: Telegram failure keeps the request and retries

When Telegram fails, the request SHALL stay saved and the visitor still sees the thank-you message (FR-117). The server retries a failed notice for up to 24 hours (FR-118, Q11). Every due time counts from S, the moment the request was saved. The first try runs right after the save. The retries are due at S+1 min, S+5 min and S+15 min, then at every full hour S+1 h, S+2 h and so on up to S+24 h, which is the last try. Each try starts at its due time or up to 10 seconds later, and never before it. Retries survive a server restart. After a restart, due times missed while the server was down collapse into one try within 10 seconds of startup, and the later due times stay tied to S. After the last try fails, the request keeps its "not sent" mark and the server logs one ERROR with the cause (FR-118, NFR-16 shared). The exact due times and the 10-second window are (inferred) from "after 1, 5 and 15 minutes, then every hour".

#### Scenario: Telegram down at send time

- **GIVEN** the Telegram stub answers every call with an error
- **WHEN** a visitor sends a valid request
- **THEN** the request is saved with notice sent "no"
- **AND** the visitor sees the thank-you message

#### Scenario: Retry schedule

- **GIVEN** a test clock the server reads, and a request saved at S whose first try failed
- **AND** the Telegram stub fails every call and records the clock time of each call
- **WHEN** the clock advances past S+25 h
- **THEN** the stub records exactly 28 calls: the first try, then S+1 min, S+5 min, S+15 min, S+1 h, S+2 h, and each full hour up to S+24 h
- **AND** each retry call lies between its due time and 10 seconds after it
- **AND** no call lies after S+24 h plus 10 seconds

#### Scenario: A retry succeeds

- **GIVEN** the first two tries for a request failed
- **WHEN** the third try is accepted by Telegram
- **THEN** the request's notice sent flag becomes "yes"
- **AND** its "not sent" mark leaves the admin list
- **AND** no further try is made for that request

#### Scenario: Retries survive a restart

- **GIVEN** a request saved at S whose first try failed
- **AND** the server stops at S+2 min and starts again at S+7 min with Telegram up
- **WHEN** the server starts
- **THEN** one try runs within 10 seconds of startup, covering the missed S+5 min due time
- **AND** the request's notice sent flag becomes "yes"

#### Scenario: Retries run out

- **GIVEN** Telegram fails for every try over 24 hours
- **WHEN** the S+24 h try fails
- **THEN** the server makes no more tries for that request
- **AND** the request keeps its "not sent" mark
- **AND** the server logs one ERROR that names the request and the cause of the failure

### Requirement: Supergroup chat ID change

This rule covers both chat ID settings: the requests group and the errors group. When Telegram reports that one of these groups became a supergroup, the server SHALL log a clear message that names the group and holds the new chat ID (FR-120). After that the admin page says which chat ID setting needs updating (FR-121). A chat ID changes only through its server setting, which the server reads at startup. The following details are (inferred). The server stores the old chat ID that Telegram reported as migrated, so the admin notice survives a restart. The admin notice shows while that chat ID setting still equals the old chat ID. It goes away once the server starts with a different value for that setting. For the errors group, the log message goes only to the local log, following the failed-alert rule of the error-alerts capability. The request whose notice hit this error keeps its "not sent" mark and its retry schedule. Every later try while the old chat ID is set fails with the same error and logs the same message. Once the server starts with the new chat ID, the next due try of each unsent request uses it. A request whose 24 hours ended before the fix stays "not sent".

#### Scenario: Supergroup error is logged with the new ID

- **GIVEN** the Telegram stub answers a notice with the "group migrated to supergroup" error and the new chat ID -1001234567890
- **WHEN** the server handles the answer
- **THEN** the log holds a plain message saying the requests group became a supergroup and the chat ID setting must change to -1001234567890
- **AND** the request's notice sent flag stays "no"

#### Scenario: Admin page asks for the setting update

- **GIVEN** the server has received a supergroup error for the requests group
- **WHEN** the photographer opens the admin page
- **THEN** the page shows a notice that the requests group chat ID setting needs updating

#### Scenario: The errors group becomes a supergroup

- **GIVEN** the Telegram stub answers an alert to the errors group with the "group migrated to supergroup" error and the new chat ID -1009876543210
- **WHEN** the server handles the answer
- **THEN** the local log holds a plain message saying the errors group became a supergroup and the errors group chat ID setting must change to -1009876543210
- **AND** that message causes no new alert send
- **AND** when the photographer opens the admin page, it shows a notice that the errors group chat ID setting needs updating

#### Scenario: Admin notice survives a restart with the old setting

- **GIVEN** the server received a supergroup error for chat ID -123456789
- **AND** the server restarts with the chat ID setting still -123456789
- **WHEN** the photographer opens the admin page
- **THEN** the notice that the chat ID setting needs updating still shows

#### Scenario: Admin notice goes away after the setting is fixed

- **GIVEN** the server received a supergroup error for chat ID -123456789 with new chat ID -1001234567890
- **AND** the server restarts with the chat ID setting -1001234567890
- **WHEN** the photographer opens the admin page
- **THEN** no notice about the chat ID setting shows

#### Scenario: Retries continue with the old ID and resume with the new one

- **GIVEN** a request saved at S whose first try hit the supergroup error
- **AND** the chat ID setting stays old until the server restarts at S+3 h 30 min with the new chat ID
- **WHEN** the clock reaches S+4 h
- **THEN** the tries at S+1 min, S+5 min, S+15 min, S+1 h, S+2 h and S+3 h went to the old chat ID and each failed with the supergroup error
- **AND** the S+4 h try goes to the new chat ID, and once Telegram accepts it the request's notice sent flag becomes "yes"

### Requirement: Admin request list

The admin page SHALL list requests, newest first by the time they arrived (FR-95). The list lives at `/admin/requests`, and the shared admin navigation has the entry "Заявки" that opens it. The admin shell shows a counter of requests with status "new" next to that entry on every admin page, and the list page repeats it in its heading (FR-96). Each row shows the name, the contact, the type of shoot, the arrival time and the status, and opens the request's own page. A request whose Telegram notice has not gone out yet carries a visible mark, the text "Не надіслано в Telegram" (FR-100). When the counter cannot be read, the page still opens, shows no counter and the server logs the cause. The admin page is in Ukrainian only, as the admin-access capability requires. It shows times in the Europe/Kyiv time zone, as the portfolio-admin capability requires. Accessibility and layout rules for these pages are owned by the portfolio-admin capability.

#### Scenario: Newest first

- **GIVEN** three requests that arrived at 10:00, 11:00 and 12:00 on the same day
- **WHEN** the photographer opens the request list
- **THEN** the 12:00 request is first and the 10:00 request is last

#### Scenario: New counter

- **GIVEN** five requests, of which two have status "new"
- **WHEN** the photographer opens the admin page
- **THEN** the counter of new requests shows 2
- **AND** after she moves one of them to "in progress" the counter shows 1

#### Scenario: The counter shows on every admin page

- **GIVEN** two requests with status "new"
- **WHEN** the photographer opens `/admin` and `/admin/requests`
- **THEN** the navigation entry "Заявки" shows the counter 2 on both pages
- **AND** the heading of `/admin/requests` shows it too

#### Scenario: Not-sent mark

- **GIVEN** one request with notice sent "no" and one with notice sent "yes"
- **WHEN** the photographer opens the request list
- **THEN** only the first request carries the "not sent" mark

#### Scenario: Empty list

- **GIVEN** there are no requests
- **WHEN** the photographer opens the request list
- **THEN** the page says there are no requests yet
- **AND** the counter of new requests shows 0

#### Scenario: A row opens its request

- **GIVEN** a request in the list
- **WHEN** the photographer follows its row
- **THEN** the page `/admin/requests/{id}` of that request opens

#### Scenario: A counter that cannot be read does not break the page

- **GIVEN** the summary endpoint fails while the photographer opens `/admin/requests`
- **WHEN** the page loads
- **THEN** the list and the navigation show, with no counter number
- **AND** the server log holds one line with the cause

### Requirement: Request detail at its own address

Each request SHALL have its own admin address `/admin/requests/{id}`, where `{id}` is the request's number in decimal digits (FR-101, Assumption 27). That page shows every field the visitor sent, the consent time and the time it arrived (FR-97). The Telegram notice links to it with the site address in front. Who may open the request pages and call the request admin API is decided by the admin-access capability. An address whose `{id}` is not a request that exists answers HTTP 404 with the page described below: this covers a deleted request, a number never used, text that is not a number and a number too large for the database.

#### Scenario: Detail shows every field

- **GIVEN** a saved request with all fields filled
- **WHEN** the photographer follows the link from its Telegram notice
- **THEN** the page shows name, contact, shoot type, preferred date, the full message, the consent time and the arrival time
- **AND** both times are shown in Europe/Kyiv time, in the format the portfolio-admin capability specifies

#### Scenario: Not signed in opens a request link

- **GIVEN** a person without an admin login
- **WHEN** they open a request's admin address from a Telegram notice
- **THEN** they are sent to the sign-in page, as the admin-access capability specifies
- **AND** no request data is shown

#### Scenario: Unknown request address

- **GIVEN** a request address whose request was deleted
- **WHEN** the photographer opens it
- **THEN** the response status is 404
- **AND** the page says plainly that the request no longer exists and links back to the request list
- **AND** no generic 500 is shown

#### Scenario: An address that is not a request number

- **GIVEN** the photographer is signed in
- **WHEN** she opens `/admin/requests/abc`, `/admin/requests/0` and `/admin/requests/99999999999999999999`
- **THEN** each response status is 404 with the same page as for a deleted request
- **AND** no answer holds a stack trace or a driver message

### Requirement: Allowed status moves

Each request SHALL have a status of new, in progress, done or declined (FR-98, Q10). The allowed moves are new to in progress, new to declined, in progress to done, in progress to declined, and done or declined back to in progress to undo a mistake. The status select offers only the moves allowed from the current status. The server checks every move again. A status change for a request that no longer exists gets HTTP 404 with a plain message (NFR-13, shared).

#### Scenario: Select offers only reachable statuses

- **GIVEN** a request with status "new"
- **WHEN** the photographer opens its status select
- **THEN** the choices are "in progress" and "declined"
- **AND** for a "done" or "declined" request the only choice is "in progress"
- **AND** for an "in progress" request the choices are "done" and "declined"

#### Scenario: Allowed move is saved

- **GIVEN** a request with status "in progress"
- **WHEN** the photographer moves it to "done"
- **THEN** the request's status is "done" after a page reload

#### Scenario: Undo a mistake

- **GIVEN** a request with status "declined"
- **WHEN** the photographer moves it to "in progress"
- **THEN** the request's status is "in progress"

#### Scenario: Forbidden move is refused by the server

- **GIVEN** a request with status "new"
- **WHEN** a status change to "done" is posted straight to the admin API
- **THEN** the server refuses it with a plain message that the move is not allowed
- **AND** the request's status stays "new"
- **AND** the answer is not a generic 500

#### Scenario: Unknown status value is refused

- **GIVEN** a request with status "new"
- **WHEN** a status change to "archived" is posted straight to the admin API
- **THEN** the server refuses it with a plain message and the status stays "new"

#### Scenario: Status change on a deleted request

- **GIVEN** a request was deleted in another browser tab
- **WHEN** the photographer picks a new status for it in the first tab
- **THEN** the admin API answers HTTP 404 with a plain message that the request no longer exists
- **AND** the page shows that message and a link back to the request list
- **AND** no generic 500 is shown and no request row is created

### Requirement: Delete a request

the photographer SHALL be able to delete a request after confirming (FR-99). The request is removed from the database at once. A copy may stay in backups for up to 31 days, as the Privacy page of the public-site capability says (Assumption 25). A deleted request gets no more Telegram tries (inferred).

#### Scenario: Delete after confirmation

- **GIVEN** a request in the list
- **WHEN** the photographer presses delete and confirms
- **THEN** the request is gone from the list and from the database
- **AND** the counter of new requests drops by one if the request was "new"

#### Scenario: Cancel keeps the request

- **GIVEN** a request in the list
- **WHEN** the photographer presses delete and then cancels the confirmation
- **THEN** the request stays in the list and in the database

#### Scenario: Deleting a request that is already gone

- **GIVEN** a request was deleted in another browser tab
- **WHEN** the photographer confirms its deletion in the first tab
- **THEN** the page shows a plain message that the request no longer exists
- **AND** no generic 500 is shown

#### Scenario: Pending retries stop after delete

- **GIVEN** a request with notice sent "no" and a retry still due
- **WHEN** the photographer deletes the request
- **THEN** no later notice is sent for it

### Requirement: Scope exclusions

The MVP SHALL leave the following out of this capability, so testers do not report them as bugs. The form takes no file or photo attachments. the photographer cannot reply to the visitor from the admin page, and the Telegram bot only sends (a two-way chat bot is FR-155, a future phase). the photographer cannot edit the fields a visitor sent. The request list has no search, filters, statistics or bulk actions (FR-157, FR-158, future phase). The contact field has no format check (Assumption 11). Two more exclusions are (inferred) because the design names neither: the server sends no email about a request, to the photographer or to the visitor, and the form shows no CAPTCHA (the trap field and the hourly limit carry the spam defence).

#### Scenario: Form has no attachment field

- **GIVEN** a visitor opens the "Order a shoot" form
- **WHEN** they look for a way to attach a file
- **THEN** the form offers none

#### Scenario: Request fields are read-only for the photographer

- **GIVEN** the photographer opens a request's admin address
- **WHEN** she looks at the visitor's fields
- **THEN** the page shows them as text with no edit control
- **AND** the only changes offered are the status select and delete

#### Scenario: No CAPTCHA and no email

- **GIVEN** a visitor sends a valid request
- **WHEN** the request is saved
- **THEN** the form showed no CAPTCHA or puzzle at any step
- **AND** the server sent no email to anyone about the request

### Requirement: The public form endpoint

The Order form SHALL send its request from the visitor's browser straight to Spring as `POST /api/booking-requests` with content type `application/json`, through Caddy, so Spring sees the visitor's own client address (FR-102, FR-114). The body holds `name`, `contact`, `shootType`, `preferredDate`, `message`, `consent` and the trap field `companySite`. The endpoint needs no login and no CSRF token, because it sits outside the admin security chain and accepts only `application/json`, which a page on another site cannot send without a CORS preflight that the server never allows (inferred). The checks run in this order: the body is readable, the trap field is empty, every field is valid, the hourly limit allows one more, the request is saved. A saved request and a dropped trapped one get the same answer: HTTP 202 with the body `{"status":"received"}` and nothing else, so the answer never holds a request number (FR-111, FR-113). A refused request gets a `application/problem+json` body: HTTP 400 holds an `errors` array of `field`, `code`, `message` (and `max` for `too_long`); HTTP 429 holds the code `rate_limited` and a `Retry-After` header with the seconds until the oldest counted request is an hour old, at least 1 and at most 3600. A failure to save, such as the database being down, answers HTTP 503 with a plain message that asks the visitor to try again, and the server logs the cause once (NFR-12, NFR-13, NFR-16). The codes, the 202 body and the 503 are (inferred). Caddy gives this address a body rule of its own: at most 64 KiB, read completely within 10 seconds before the backend receives a byte. A sender that trickles its body is cut by Caddy after 10 seconds and holds no backend thread; the 10-second limit applies to this address only, so a 50 MB photo upload from a slow phone is not cut (NFR-12).

#### Scenario: A body that arrives a byte at a time is cut

- **GIVEN** a client that sends the headers of a `POST /api/booking-requests` with a 1000-byte body and then one byte a second
- **WHEN** 15 seconds have passed
- **THEN** the connection has ended, and no answer says the request was accepted
- **AND** a client that sends the same slow body to another `/api/` address is still connected after 14 seconds

#### Scenario: A valid send is accepted

- **GIVEN** a valid POST with the trap field empty
- **WHEN** the server handles it
- **THEN** the answer is HTTP 202 with the body `{"status":"received"}`
- **AND** exactly one request row exists, with status "new"

#### Scenario: A trapped send gets the same answer

- **GIVEN** a valid POST whose `companySite` is "http://spam.example"
- **WHEN** the server handles it
- **THEN** the answer has the same status, the same body and the same header names as the answer to a saved request
- **AND** no row is saved and no notice is sent

#### Scenario: A trapped send with invalid fields is still dropped quietly

- **GIVEN** a POST with an empty name, no consent and `companySite` "x"
- **WHEN** the server handles it
- **THEN** the answer is HTTP 202 with `{"status":"received"}`
- **AND** no row is saved

#### Scenario: A send needs no login and no token

- **GIVEN** a client with no cookie and no `X-CSRF-TOKEN` header
- **WHEN** it posts a valid request
- **THEN** the request is saved

#### Scenario: A send from another site cannot use JSON without a preflight

- **GIVEN** a browser page on another origin
- **WHEN** it sends `OPTIONS /api/booking-requests` with `Origin: https://evil.example` and `Access-Control-Request-Method: POST`
- **THEN** the answer carries no `Access-Control-Allow-Origin` header
- **AND** the same page's form post with content type `text/plain` gets HTTP 415 and saves nothing

#### Scenario: The limit answer tells how long to wait

- **GIVEN** 10 requests were saved from one address, the oldest 50 minutes ago
- **WHEN** an 11th valid request arrives
- **THEN** the answer is HTTP 429 with the code `rate_limited`
- **AND** `Retry-After` is between 595 and 605

#### Scenario: A database failure gives a plain 503

- **GIVEN** the database refuses the insert
- **WHEN** a valid request is posted
- **THEN** the answer is HTTP 503 with a plain message that asks the visitor to try again
- **AND** the answer holds no SQL, driver name or stack trace
- **AND** the server log holds one line with the cause
- **AND** the send does not count toward the hourly limit

#### Scenario: The endpoint is reached through Caddy

- **GIVEN** the stack is running with Caddy in front
- **WHEN** a client posts a valid request to `/api/booking-requests` through Caddy
- **THEN** the answer is HTTP 202 from Spring, and the request is saved

### Requirement: Limit counting is exact and per network

The hourly counter SHALL decide and record in one step per address, so concurrent sends cannot pass the limit (FR-114, FR-166). A send is recorded as counted just before the request is saved, and the record is removed when the save fails. An IPv6 address counts by its first 64 bits, because one visitor can use any address of a /64 network (inferred); an IPv4 address counts as itself. The server never writes the address to a log line, an error message, a database row or a response (FR-114).

#### Scenario: Concurrent sends cannot pass the limit

- **GIVEN** the limit is 10 and no request from one address has been saved
- **WHEN** 25 valid requests from that address arrive at the same moment
- **THEN** exactly 10 are saved and exactly 15 get HTTP 429

#### Scenario: A failed save gives the slot back

- **GIVEN** 9 requests from one address are saved and the next insert fails
- **WHEN** a valid request arrives and its save fails, and then a second valid request arrives
- **THEN** the second request is saved
- **AND** a third valid request from that address gets HTTP 429

#### Scenario: Addresses of one IPv6 network count together

- **GIVEN** the limit is 10 and 10 requests were saved from `2001:db8:1:2::1`
- **WHEN** a valid request arrives from `2001:db8:1:2:ffff::9`
- **THEN** the answer is HTTP 429
- **AND** a valid request from `2001:db8:1:3::1` is saved

#### Scenario: The address never reaches a log

- **GIVEN** requests from 203.0.113.7 that were saved, refused for invalid fields, dropped by the trap and refused by the limit
- **WHEN** a tester reads every Spring log line written during those requests
- **THEN** no line holds 203.0.113.7

### Requirement: The hourly limit setting is checked at start-up

The hourly limit SHALL be the setting `portfolio.booking.hourly-limit`, read from `BOOKING_HOURLY_LIMIT`, with the default 10 (FR-167). The server SHALL refuse to start when the value is not a whole number of at least 1, and its message names the setting and the value (NFR-16).

#### Scenario: The default is 10

- **GIVEN** `BOOKING_HOURLY_LIMIT` is not set
- **WHEN** the server starts
- **THEN** the limit is 10

#### Scenario: A bad value stops the start

- **GIVEN** `BOOKING_HOURLY_LIMIT` is `0`, `-3`, `ten` or `2.5`, in four separate starts
- **WHEN** the server starts
- **THEN** each start fails with a message that names `BOOKING_HOURLY_LIMIT` and the value it read

### Requirement: A site-wide hourly cap keeps a flood from becoming a flood of Telegram messages

The site SHALL count the saved requests of all networks together over a sliding hour, in memory only (FR-114, FR-167). The cap SHALL be the setting `portfolio.booking.site-hourly-limit`, read from `BOOKING_SITE_HOURLY_LIMIT`, with the default 100; the server SHALL refuse to start when the value is not a whole number of at least 1, and its message names the setting and the value (NFR-16). A request that passes the per-network limit past the cap SHALL still be saved, so no request is lost, and it SHALL get no Telegram notice of its own. The requests group SHALL get one summary notice, «Забагато заявок за годину. Заявок без окремих повідомлень: N.» with the link to the admin list, at most once an hour; a failed summary SHALL be logged with its cause and tried again after one minute, and the held-back requests stay in the admin list in any case (NFR-16).

#### Scenario: Requests past the cap are saved and share one notice

- **GIVEN** a site-wide cap of 2 and a working Telegram
- **WHEN** five valid requests arrive within the hour
- **THEN** all five are saved
- **AND** the requests group gets two notices of its own and one summary that says 3

#### Scenario: A second summary within the hour is not sent

- **GIVEN** a summary was sent for the requests past the cap
- **WHEN** two more requests arrive past the cap in the same hour
- **THEN** no second summary is sent until an hour has passed, and then one summary says 2

#### Scenario: A bad cap stops the start

- **GIVEN** `BOOKING_SITE_HOURLY_LIMIT` is `0`, `-3`, `ten` or `2.5`, in four separate starts
- **WHEN** the server starts
- **THEN** each start fails with a message that names `BOOKING_SITE_HOURLY_LIMIT` and the value it read

### Requirement: Order page texts in both languages

The Order page SHALL show its fixed texts from the frontend message catalogue, in the page's language, with no text in the component (FR-23, FR-102, FR-111, FR-112). The Ukrainian texts are (inferred) from the approved design screens and the English texts are (inferred) translations; the owner confirms both.

| Key | Ukrainian | English |
|---|---|---|
| Page heading | Замовити зйомку | Order a shoot |
| Intro | Розкажіть коротко, яку зйомку ви хочете. фотограф зв’яжеться з вами, щоб обговорити деталі. | Tell me briefly what shoot you would like. the photographer will contact you to discuss the details. |
| Name label | Ім’я | Name |
| Contact label | Як з вами зв’язатися | How to reach you |
| Contact hint | Телефон, Telegram @username або Instagram | Phone, Telegram @username or Instagram |
| Shoot type label | Тип зйомки | Type of shoot |
| Shoot type placeholder | Оберіть | Choose |
| Shoot types | Портрет, Подія, Сім’я, Love story, Інше | Portrait, Event, Family, Love story, Other |
| Date label | Бажана дата або період | Preferred date or period |
| Date hint | Наприклад, 15 травня або кінець червня | For example, 15 May or the end of June |
| Message label | Повідомлення | Message |
| Optional marker | необов’язково | optional |
| Consent text | Я погоджуюся на обробку персональних даних. | I agree to the processing of personal data. |
| Consent link | Політика конфіденційності | Privacy policy |
| Send button | Надіслати | Send |
| Sending state | Надсилаємо… | Sending… |
| Name required | Вкажіть, як вас звати | Enter your name |
| Contact required | Вкажіть, як з вами зв’язатися | Tell me how to reach you |
| Too long | Не більше {max} символів | At most {max} characters |
| Shoot type not allowed | Оберіть тип зйомки зі списку | Choose a shoot type from the list |
| Consent required | Щоб надіслати запит, поставте галочку біля згоди на обробку персональних даних. | To send the request, tick the box to agree to the processing of personal data. |
| Invalid characters | Текст містить символ, який не можна зберегти | The text contains a character that cannot be saved |
| Server unreachable | Запит не надіслано, бо сервер не відповів. Перевірте з’єднання й спробуйте ще раз. Усе, що ви ввели, залишилося у формі. | Your request was not sent because the server did not answer. Check your connection and try again. Everything you typed is still in the form. |
| Server error | Запит не надіслано через помилку на сервері. Спробуйте ще раз за кілька хвилин. Усе, що ви ввели, залишилося у формі. | Your request was not sent because of a server error. Try again in a few minutes. Everything you typed is still in the form. |
| Sessions link after sending | Подивитися сесії | See the sessions |

The thank-you texts and the two limit texts are the ones the requirements "Thank-you message after a successful send" and "Hourly limit per IP address" give word for word. The Ukrainian "Too long" text shows the number of the field's limit: 100, 200, 100 or 2000.

#### Scenario: The Ukrainian page shows the Ukrainian texts

- **GIVEN** a visitor opens `/order`
- **WHEN** the page loads
- **THEN** the heading, intro, every label, hint, marker, the consent text with its link and the Send button match the Ukrainian column of the table

#### Scenario: The English page shows the English texts

- **GIVEN** a visitor opens `/en/order`
- **WHEN** the page loads
- **THEN** the same elements match the English column of the table, and no Ukrainian interface text is on the page

#### Scenario: A per-field message names its limit

- **GIVEN** a visitor sends a 101-character name, a 201-character contact, a 101-character preferred date and a 2001-character message on the Ukrainian page
- **WHEN** the server answers with `too_long` for each
- **THEN** the page shows "Не більше 100 символів", "Не більше 200 символів", "Не більше 100 символів" and "Не більше 2000 символів" next to the four fields

#### Scenario: Every catalogue key exists in both languages

- **WHEN** the unit test reads the two dictionaries
- **THEN** every `order` and `privacy` key has a non-empty Ukrainian and a non-empty English value

### Requirement: Order page layout follows the design screens

The Order page SHALL follow the design screens `docs/design/screens/order-empty-1440.png`, `order-error-1440.png`, `order-sent-1440.png` and their 360 px versions (FR-17, NFR-29). From 1440 px the heading and the intro sit in a left column and the form in a column to their right, 560 px wide; at 360 px the heading, intro and form stack with the content width of the shared layout. Each field has its label above it, an optional field marks itself with the optional marker in the label's line, a hint sits under the label, and a message sits under its field in the error colour. The consent checkbox, its text and the link to the Privacy page share one line where the width allows. The Send button is the dark main button of `docs/design/design-values.md`. After a successful send the form is replaced by the thank-you message, in its own element, followed by a link to the Sessions page in the page's language; the heading and the intro stay. The exact thank-you text is the one the requirement "Thank-you message after a successful send" gives. The design screen's own Ukrainian thank-you wording differs from that text; the owner decides which one stays (see the design notes), and the text of that requirement is the contract until then.

#### Scenario: The layout matches the screens

- **GIVEN** the form is empty, then has an error under Contact, then is sent, at 360 and 1440 px
- **WHEN** a fresh agent compares stills of the three states with the six screens
- **THEN** it finds the same blocks in the same order, and reports the layout part met

#### Scenario: After sending, a link leads to the sessions

- **GIVEN** a visitor has sent a valid request on the English page
- **WHEN** the thank-you message shows
- **THEN** below it there is a link "See the sessions" to `/en/sessions`
- **AND** the form fields are gone

### Requirement: The form reports its state to assistive technology

Each invalid field SHALL be marked `aria-invalid="true"` and tied to its message with `aria-describedby`; after a refused send, focus SHALL move to the first invalid field in page order; the limit message above the Send button and the failure messages SHALL be in an element with `role="alert"`; the thank-you message SHALL be in an element with `role="status"`; the Send button SHALL be disabled while a send is in flight, so a double press sends once (NFR-32, NFR-35, NFR-13). The trap field is not announced and is not reachable with Tab (FR-113).

#### Scenario: Focus goes to the first invalid field

- **GIVEN** a visitor sends the form with Name and Contact empty
- **WHEN** the messages appear
- **THEN** Name has `aria-invalid="true"`, is described by its message and has focus
- **AND** Contact is marked and described the same way

#### Scenario: A double press sends once

- **GIVEN** a valid form and a backend that answers after 2 seconds
- **WHEN** the visitor presses Send twice within one second
- **THEN** the server receives exactly one POST
- **AND** the button is disabled until the answer arrives

#### Scenario: Failures are announced

- **GIVEN** the backend does not answer
- **WHEN** the visitor sends the form
- **THEN** the failure text is in an element with `role="alert"`

### Requirement: The notice uses one fixed Ukrainian layout

The Telegram notice SHALL be one plain text message with no `parse_mode`, so Telegram never reads visitor text as formatting, and with link previews turned off (FR-116). the photographer reads Ukrainian, so the labels are Ukrainian whatever the page's language was (inferred). The lines are, in this order: `Нова заявка`, `Ім’я: <name>`, `Контакт: <contact>`, `Тип зйомки: <label>`, `Бажана дата: <preferred date>`, `Повідомлення: <start of the message>`, `Відкрити: <site address>/admin/requests/<id>`. A line whose field is empty is left out. The shoot type labels are Портрет, Подія, Сім’я, Love story and Інше. The start of the message is cut by code points, never inside a surrogate pair. Every line of the message after the first begins with `> `, so nothing a visitor types can look like a label line such as `Відкрити: …`. In the three one-line fields, a run of line breaks, control characters or bidi controls that was saved before they were refused is shown as one space. The site address is the `SITE_URL` setting.

#### Scenario: The whole notice text

- **GIVEN** request 42 from "Olena", contact "@olena_k", shoot type family, preferred date "mid-October", message "Hello, we would like a family shoot in the park", and `SITE_URL` is `https://owner.example`
- **WHEN** the notice is built
- **THEN** the text is exactly the seven lines `Нова заявка`, `Ім’я: Olena`, `Контакт: @olena_k`, `Тип зйомки: Сім’я`, `Бажана дата: mid-October`, `Повідомлення: Hello, we would like a family shoot in the park` and `Відкрити: https://owner.example/admin/requests/42`, separated by single line feeds

#### Scenario: A message cannot forge a label line

- **GIVEN** a request 9 whose message is "hi" + LF + "Відкрити: https://evil.example/admin/requests/1" and `SITE_URL` is `https://owner.example`
- **WHEN** the notice is built
- **THEN** exactly one line starts with `Відкрити: `, and it is the last line, `Відкрити: https://owner.example/admin/requests/9`
- **AND** the message's second line is sent as `> Відкрити: https://evil.example/admin/requests/1`

#### Scenario: The cut never splits an emoji

- **GIVEN** a message of 199 letters "a" followed by "😊" and "b"
- **WHEN** the notice is built
- **THEN** the message line holds the 199 letters, the whole "😊", and then "…"
- **AND** the text is valid UTF-8 with no unpaired surrogate

#### Scenario: The request to Telegram has no parse mode and no preview

- **GIVEN** a fake Telegram server that records the request body
- **WHEN** a notice is sent
- **THEN** the body holds `chat_id` and `text`, holds no `parse_mode`, and turns link previews off

### Requirement: Telegram failures of every kind are kept and logged with their cause

Every way the call to Telegram can fail SHALL leave the request saved and "not sent", leave the retry schedule unchanged, and write one log line with the cause (FR-117, FR-118, NFR-16). The ways are: no answer within 3 seconds of reading or 2 seconds of connecting, a refused connection, HTTP 401 (a bad token), HTTP 400 with another description than the supergroup one, HTTP 429 with `retry_after`, HTTP 5xx, and an answer that is not JSON. A log line names the request's number, the kind of failure and Telegram's short description when there is one. The log never holds the bot token: the token is part of Telegram's address, so every address and every exception message that reaches a log is masked first. A notice that is sent from a server with a blank token or a blank requests chat ID fails the same way, with the cause "Telegram is not configured" (inferred).

#### Scenario: Each failure kind is retried and logged

- **GIVEN** a fake Telegram server that answers in turn: no answer for 5 seconds, a closed connection, 401, 400 "chat not found", 429 with `retry_after` 30, 502 with an HTML body, and 200 with a body that is not JSON
- **WHEN** a notice is tried once for each answer
- **THEN** each request stays with notice sent "no" and its next due time follows the schedule from the moment it was saved
- **AND** each try writes one log line with the request's number and the kind of failure
- **AND** no try lasts longer than 6 seconds

#### Scenario: The bot token never reaches a log

- **GIVEN** the bot token is `123456:SECRET-TOKEN-VALUE` and every failure kind of the previous scenario
- **WHEN** a tester reads every log line written
- **THEN** no line holds `SECRET-TOKEN-VALUE` or `bot123456`

#### Scenario: An unconfigured Telegram is a clear failure

- **GIVEN** a start in a profile other than `prod` with a blank `TELEGRAM_BOT_TOKEN`
- **WHEN** a valid request is saved
- **THEN** the request is saved, the visitor sees the thank-you message and the request is "not sent"
- **AND** the log holds the cause "Telegram is not configured" for that request

#### Scenario: The server refuses to start in production without Telegram

- **GIVEN** the `prod` profile with a blank `TELEGRAM_BOT_TOKEN` or a blank `TELEGRAM_REQUESTS_CHAT_ID`
- **WHEN** the server starts
- **THEN** the start fails with a message that names the blank setting

### Requirement: Notice state is kept in the database, so retries follow the schedule through restarts

Each request row SHALL hold when its notice was sent (empty until then), how many tries were made and when the next try is due (empty once the notice was sent or the last try failed) (FR-115, FR-118, FR-119). One worker SHALL make every try, one at a time: right after a request is saved, and then whenever a due time has passed, checking every 5 seconds. The first due time of a request is the moment it was saved. After a failed try the next due time is the first scheduled time that lies after the moment of that try, so a try that runs late for any reason, a restart included, covers every missed time with one call (FR-118). The worker reads the current time from the server's clock, so tests can move it. A try holds no database transaction while it waits for Telegram. A request that the photographer deletes while its try is in flight may still get that one notice; no try starts for it afterwards.

#### Scenario: The worker tries a new request at once

- **GIVEN** a fake Telegram that is up
- **WHEN** a valid request is saved
- **THEN** the fake receives the notice and the row's sent time is set, and all of it happens within 10 seconds of the save

#### Scenario: The next due time follows the schedule

- **GIVEN** a request saved at S whose first try fails at S
- **WHEN** the row is read
- **THEN** its next due time is S+1 min
- **AND** after the try at S+1 min fails it is S+5 min, then S+15 min, then S+1 h

#### Scenario: A late try skips the missed times

- **GIVEN** a request saved at S whose first try failed, and a clock moved to S+7 min
- **WHEN** the worker runs and the try fails
- **THEN** the next due time is S+15 min

#### Scenario: A sent request is never tried again

- **GIVEN** a request whose notice was sent
- **WHEN** the worker runs at every later due time
- **THEN** Telegram receives no second notice for it

#### Scenario: A deleted request is never tried

- **GIVEN** a request with a due time in the past that the photographer has deleted
- **WHEN** the worker runs
- **THEN** Telegram receives nothing for it

### Requirement: The Telegram stub and its controls exist only in the test profile

The test profile SHALL replace the Telegram client with an in-memory stub and SHALL add controls on Spring's loopback port only, under `/internal/`, which Caddy answers with 404: set the stub to answer `up`, `down` or `supergroup` (with a new chat ID), read and clear the notices it received, move the server clock forward, reset the hourly counts and set the hourly limit (FR-116, NFR-16). None of these controls or the stub exists in any other profile, and `prod` with `test` together still refuses to start. The real client speaks to `https://api.telegram.org/bot<token>/sendMessage`; its real answers are pinned by one read-only test and one opt-in post to the test chat.

#### Scenario: The controls are absent outside the test profile

- **GIVEN** the server runs in the `prod` profile, or with no profile
- **WHEN** a client calls each control address
- **THEN** each answers 404 from Spring, and the real Telegram client is the one in use

#### Scenario: The controls are not reachable through Caddy

- **GIVEN** the local stack with Caddy in front
- **WHEN** an e2e test calls a control through Caddy and then on `127.0.0.1:8080`
- **THEN** the call through Caddy gets 404 from Caddy, and the call on the loopback port works

#### Scenario: The real Telegram answers keep the shape the code expects

- **GIVEN** the real bot token in `deploy/.env` and the opt-in flag `-Dtelegram.integration=true`
- **WHEN** the integration test calls `getMe`, and then sends one plain-text message to the test requests chat
- **THEN** `getMe` answers `ok` true with the bot's name, and the message call answers `ok` true with a `message_id`
- **AND** a call with a wrong chat ID answers `ok` false with `error_code` 400 and a `description`
- **AND** the test is skipped unless the flag is set

### Requirement: Request admin API

Spring SHALL serve the request pages through these endpoints, all under `/api/admin/` and therefore behind the login check and the CSRF check of the admin-access capability (FR-95 to FR-101): `GET /api/admin/booking-requests` (the list, newest first, each item with `id`, `name`, `contact`, `shootType`, `status`, `noticeSent` and `createdAt`), `GET /api/admin/booking-requests/summary` (`newCount` and `chatIdNotices`), `GET /api/admin/booking-requests/{id}` (every field, with `preferredDate`, `message` and `shootType` as `null` when empty, `consentAt` and `createdAt`), `GET /api/admin/booking-requests/{id}/exists` (204 or 404, no body), `PUT /api/admin/booking-requests/{id}/status` with `{"status": …}` and `DELETE /api/admin/booking-requests/{id}` (204). The status values are `new`, `in_progress`, `done` and `declined`. A request that does not exist, or an `{id}` that is not a positive number that fits the database, answers 404 with the `detail` "This request does not exist". A refused move answers 409 with the `detail` "This status change is not allowed", and an unknown status value answers 400 with an error for `status`. A move to the status the request already has answers 200 and changes nothing (inferred). The answers never hold the notice's try count, due time or any address of a visitor (NFR-12). The endpoint names and codes are (inferred).

#### Scenario: Every request endpoint is closed to a person without a login

- **GIVEN** a client with no admin login
- **WHEN** it calls each of the six endpoints, the changes with no token
- **THEN** each answers 401 and no request data is returned or changed

#### Scenario: A change without the CSRF token is refused

- **GIVEN** a signed-in admin
- **WHEN** she sends the status change and the delete without `X-CSRF-TOKEN`
- **THEN** each answers 403 with the code `csrf`, and the request is unchanged

#### Scenario: The list holds the agreed fields in order

- **GIVEN** requests A, B and C that arrived in that order
- **WHEN** a signed-in admin calls the list
- **THEN** the status is 200 and the ids come in the order C, B, A
- **AND** each item holds exactly `id`, `name`, `contact`, `shootType`, `status`, `noticeSent` and `createdAt`

#### Scenario: The detail holds no internals

- **GIVEN** a saved request
- **WHEN** a signed-in admin calls its detail
- **THEN** the answer holds `id`, `name`, `contact`, `shootType`, `preferredDate`, `message`, `status`, `noticeSent`, `consentAt` and `createdAt`
- **AND** it holds none of `noticeAttempts`, `nextNoticeAt`, `ip` or `address`

#### Scenario: A move to the current status changes nothing

- **GIVEN** a request with status "in_progress"
- **WHEN** the admin puts the status "in_progress"
- **THEN** the answer is 200 and the status is still "in_progress"

#### Scenario: An id that is not a number is 404

- **GIVEN** a signed-in admin
- **WHEN** she calls the detail, status change and delete with the ids `abc`, `0`, `-1` and `99999999999999999999`
- **THEN** each answer is 404 with the `detail` "This request does not exist"
- **AND** no answer is 500

### Requirement: The admin pages show visitor text as plain text

Every text a visitor sent SHALL be shown on the request list and the request page as plain text: it is escaped, line breaks in the message are kept, and a contact is never turned into a link (FR-97). An unusually long word in a value wraps inside its box and adds no sideways scroll (NFR-29).

#### Scenario: Markup in a request is shown as typed

- **GIVEN** a saved request whose name is `<img src=x onerror=alert(1)>`, whose contact is `javascript:alert(2)` and whose message is `<script>alert(3)</script>` on two lines
- **WHEN** the photographer opens the list and the request page
- **THEN** the pages show those characters as text, run no script, hold no `img`, `script` or `a` element made from them, and show the message on two lines

#### Scenario: A very long word does not widen the page

- **GIVEN** a saved request whose message is one word of 2000 letters
- **WHEN** the photographer opens its page at 360 px
- **THEN** the document has no sideways scroll

### Requirement: The summary carries the chat ID notices

`GET /api/admin/booking-requests/summary` SHALL carry the chat ID notices of the requirement "Supergroup chat ID change": one item for each group, `requests` or `errors`, whose stored old chat ID equals the chat ID the server started with, with the `group`, the `newChatId` and the name of the setting that needs the change. The admin shell shows each item above the page content on every admin page, in Ukrainian: "Група Telegram для заявок стала супергрупою. Змініть налаштування TELEGRAM_REQUESTS_CHAT_ID на <new ID> і перезапустіть сервер." and, for the errors group, the same text with "для помилок" and `TELEGRAM_ERRORS_CHAT_ID` (FR-121). The old chat ID is stored in the database when Telegram reports the change, which is what lets the notice survive a restart (FR-120, FR-121). Saving a report twice for one group keeps the newest.

#### Scenario: The notice shows on every admin page

- **GIVEN** the server has received a supergroup error for the requests group, new chat ID -1001234567890
- **WHEN** the photographer opens `/admin` and `/admin/requests`
- **THEN** both pages show above their content the requests-group notice with `TELEGRAM_REQUESTS_CHAT_ID` and -1001234567890

#### Scenario: The summary holds the notice only while the setting is old

- **GIVEN** a stored report for the requests group with old chat ID -123456789
- **WHEN** the summary is read with the server started on -123456789, and again after a start with -1001234567890
- **THEN** the first answer holds one notice and the second holds none

#### Scenario: The errors group notice comes from the same store

- **GIVEN** the Telegram client is asked to send to the errors group and the stub answers the supergroup error with new chat ID -1009876543210
- **WHEN** the photographer opens the admin page
- **THEN** it shows the errors-group notice with `TELEGRAM_ERRORS_CHAT_ID` and -1009876543210

### Requirement: The live notice arrives within 10 seconds

On the live server with the real bot, a request sent through the public form SHALL reach the requests group within 10 seconds of being saved (NFR-22). The proof reads the row's created time and sent time from the live database.

#### Scenario: A live request reaches the group in time

- **GIVEN** the live deploy carries this change and the owner allows one test request
- **WHEN** the tester sends a request through the live Order form and reads its row in the live database
- **THEN** the sent time minus the created time is at most 10 seconds
- **AND** the owner sees the notice in the requests group
- **AND** the tester deletes the test request afterwards in the admin page
