## MODIFIED Requirements

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
