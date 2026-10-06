# waitlist-signup Specification

## Purpose
Defines the demo waitlist form, the only interactive feature of AgentFlow: how an email address is validated, how feedback is shown, and the guarantee that no data leaves the browser or persists.

## Requirements

### Requirement: Labeled, accessible email field
The waitlist form SHALL contain one email input with a visible text label and a submit button. The form MUST be fully operable with the keyboard, and validation and success feedback MUST be exposed to assistive technology (for example through an associated, announced message).

#### Scenario: Field is labeled and keyboard operable
- **WHEN** a visitor focuses the email input using the Tab key, types an address and presses Enter
- **THEN** the form is submitted and the input is associated with its visible label

#### Scenario: Feedback is exposed to assistive technology
- **WHEN** a visitor submits an invalid email and then a valid one
- **THEN** the error is programmatically associated with the input or announced through an alert region, and the success message is announced through a status region

### Requirement: Email is required
The system SHALL reject an empty value or a value consisting only of whitespace with an error message stating that the email is required, and MUST NOT show a success state.

#### Scenario: Empty submission
- **WHEN** a visitor submits the form with an empty email field
- **THEN** the error "Введіть електронну пошту." is shown and no success message is shown

#### Scenario: Whitespace-only submission
- **WHEN** a visitor submits the form with an email field containing only spaces
- **THEN** the error "Введіть електронну пошту." is shown and no success message is shown

### Requirement: Email format is validated
The system SHALL reject a non-empty value that is not a valid email address with an error message stating that the address is invalid, and MUST NOT show a success state. Leading and trailing whitespace SHALL be ignored when validating.

#### Scenario: Invalid format
- **WHEN** a visitor submits `not-an-email`
- **THEN** the error "Введіть коректну адресу електронної пошти." is shown and no success message is shown

#### Scenario: Valid address with surrounding whitespace
- **WHEN** a visitor submits `  user@example.com  `
- **THEN** the submission is treated as valid and the success state is shown

### Requirement: Successful simulated submission
When a valid email is submitted, the system SHALL show a visible success state that states the submission was a demo, and SHALL clear any earlier error message.

#### Scenario: Valid email
- **WHEN** a visitor submits `user@example.com`
- **THEN** the success message "Дякуємо! Це демо: вас не додано до списку, лист не надсилається." is shown and no error message is shown

### Requirement: Correction and resubmission
After a validation error, the visitor SHALL be able to edit the value and submit again without reloading the page; a corrected valid value MUST lead to the success state and remove the error. While an error is displayed, every edit of the field SHALL re-validate the current value: a valid value MUST remove the error immediately without a submit, and a still-invalid value SHALL show the message for the current value. Editing MUST NOT display an error when none is displayed, and MUST NOT change the success state.

#### Scenario: Correct an invalid email
- **WHEN** a visitor submits `user@`, sees the invalid-format error, replaces the value with `user@example.com` and submits again
- **THEN** the error disappears and the success message is shown

#### Scenario: Error clears as soon as the value becomes valid
- **WHEN** a visitor submits `user@`, sees the invalid-format error, and edits the field to `user@example.com` without submitting
- **THEN** the error message disappears, the input is no longer marked invalid and no success message is shown

#### Scenario: Error text follows the current value while invalid
- **WHEN** a visitor submits an empty value, sees the required error, and types `a`
- **THEN** the error changes to "Введіть коректну адресу електронної пошти." and remains until the value becomes valid

#### Scenario: Typing before the first submit shows no error
- **WHEN** a visitor types `user@` into a pristine form without submitting
- **THEN** no error message is shown

#### Scenario: Cleared error does not return while typing
- **WHEN** a visitor has submitted `user@`, edited the field to `user@example.com` (error cleared) and then edits it back to `user@`
- **THEN** no error is shown until the next submit

#### Scenario: Editing after success keeps the success state
- **WHEN** a visitor has seen the success state and then edits the field to `user@`
- **THEN** the success message remains shown and no error is shown until the next submit

#### Scenario: Error after success
- **WHEN** a visitor has seen the success state, then submits an empty value
- **THEN** the required-email error is shown and the success message is no longer shown

### Requirement: Demo notice
The Waitlist CTA section SHALL display, beside the form, a note that this is a demo and that no real signup or email delivery takes place.

#### Scenario: Notice visible near the form
- **WHEN** the Waitlist CTA section is displayed
- **THEN** a demo note is visible next to the form before any submission

### Requirement: Local-only, non-persistent submission
Submitting the form MUST NOT send the email over the network and MUST NOT persist it (cookies, web storage or any other mechanism). After a page reload the form SHALL return to its initial empty state.

#### Scenario: No network request on submit
- **WHEN** a visitor submits a valid email
- **THEN** no network request carrying the email is made

#### Scenario: State is not persisted
- **WHEN** a visitor submits a valid email and then reloads the page
- **THEN** the email field is empty and no success message is shown

### Requirement: Validation rules are unit-testable
The validation rules and messages SHALL be defined once and be testable independently of the user interface; the form and the unit tests MUST use the same definition.

#### Scenario: Rules are covered by unit tests
- **WHEN** the unit test suite runs
- **THEN** it verifies the empty, whitespace-only, invalid-format and valid cases, and the exact required and invalid-format messages, against the same rules the form uses

### Requirement: End-to-end coverage at two viewports
End-to-end tests SHALL run in Chromium at 375 px and 1440 px viewport widths and cover section rendering, call-to-action navigation, empty and invalid errors, success, correction followed by resubmission, and horizontal overflow.

#### Scenario: Both viewport projects run
- **WHEN** the end-to-end suite runs
- **THEN** the same scenarios execute at 375 px and at 1440 px in Chromium and all pass
