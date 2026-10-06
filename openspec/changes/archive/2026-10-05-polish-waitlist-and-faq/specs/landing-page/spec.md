## MODIFIED Requirements

### Requirement: Static informational sections
The Features section SHALL list a short static set of benefits. The How It Works section SHALL present three ordered steps: specification, implementation, verification. The FAQ section SHALL present static questions with their answers revealed by native disclosure without any network request; opening and closing an item SHALL be animated, in browsers that support animating native disclosure content (Chromium is the verified target), and its marker SHALL rotate smoothly between the closed and open positions. Each transition MUST last at most 250 ms.

#### Scenario: How It Works shows the three steps in order
- **WHEN** the How It Works section is displayed
- **THEN** it shows exactly three steps in the order specification, implementation, verification

#### Scenario: Features and FAQ are non-empty
- **WHEN** the Features and FAQ sections are displayed
- **THEN** Features shows at least three benefits and FAQ shows at least three question-and-answer pairs

#### Scenario: FAQ marker rotates and content animates
- **WHEN** a visitor opens a FAQ item
- **THEN** the item's answer becomes visible, its marker is rotated to the open position through a CSS transition rather than a glyph swap, and the item's content height transitions rather than jumping

#### Scenario: Answer is available when opening starts
- **WHEN** a visitor opens a FAQ item
- **THEN** the answer is rendered and exposed to assistive technology from the moment the open transition starts, and the transition lasts at most 250 ms

#### Scenario: FAQ item closes with animation
- **WHEN** a visitor closes an open FAQ item
- **THEN** its marker rotates back to the closed position through a transition and the content height transitions to zero before the answer is hidden

#### Scenario: Reduced motion disables FAQ animation
- **WHEN** the visitor's system prefers reduced motion and they open or close a FAQ item
- **THEN** the item changes state immediately with no animated transition

### Requirement: Simple styling
The page SHALL use simple styling and MUST NOT rely on complex animations. The only permitted motion is a CSS transition of at most 250 ms on the FAQ answer area and the FAQ marker, which MUST be implemented in CSS alone, MUST NOT delay access to content, and MUST be disabled when the visitor prefers reduced motion.

#### Scenario: Page is readable without motion
- **WHEN** the page is displayed
- **THEN** all content is visible without waiting for an animation to complete

#### Scenario: No animation beyond the FAQ
- **WHEN** the page is loaded
- **THEN** no element or pseudo-element other than the FAQ answer area and the FAQ marker has an animation or transition of non-zero duration
