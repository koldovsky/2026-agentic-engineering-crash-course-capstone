# Spec Delta

## Purpose

Defines the structure, content, navigation and responsive behavior of the single AgentFlow landing page served at `/`, so that the page can be verified section by section at mobile and desktop widths.

## ADDED Requirements

### Requirement: Single page at root
The product SHALL consist of exactly one page served at `/`. It MUST NOT expose additional pages, API routes or authentication flows.

#### Scenario: Landing page is served at the root
- **WHEN** a visitor opens `/`
- **THEN** the AgentFlow landing page is displayed instead of the generic scaffold content

### Requirement: Eight sections in fixed order
The page SHALL contain these eight sections in this order: Navbar, Hero, Features, How It Works, Pricing, FAQ, Waitlist CTA, Footer. Each section SHALL be identifiable on the page by a stable landmark or section identifier so it can be located and linked.

#### Scenario: All sections render in order
- **WHEN** the page is loaded
- **THEN** all eight sections are present and appear in the order listed above

### Requirement: Navbar
The Navbar SHALL show the AgentFlow brand and links to the in-page sections Features, How It Works, Pricing, FAQ and Waitlist.

#### Scenario: Navbar link scrolls to its section
- **WHEN** a visitor activates the Pricing link in the Navbar
- **THEN** the Pricing section is brought into view without leaving `/`

### Requirement: Hero
The Hero SHALL present the AgentFlow value proposition (define a task, implement it against a specification, verify the result) and a primary call to action for joining the waitlist.

#### Scenario: Hero call to action reaches the form
- **WHEN** a visitor activates the Hero waitlist call to action
- **THEN** the page scrolls to the waitlist form

### Requirement: Static informational sections
The Features section SHALL list a short static set of benefits. The How It Works section SHALL present three ordered steps: specification, implementation, verification. The FAQ section SHALL present static questions with their answers visible or revealed by native disclosure without any network request.

#### Scenario: How It Works shows the three steps in order
- **WHEN** the How It Works section is displayed
- **THEN** it shows exactly three steps in the order specification, implementation, verification

#### Scenario: Features and FAQ are non-empty
- **WHEN** the Features and FAQ sections are displayed
- **THEN** Features shows at least three benefits and FAQ shows at least three question-and-answer pairs

### Requirement: Illustrative pricing without purchasing
The Pricing section SHALL show illustrative plans clearly marked as examples. It MUST NOT contain any purchase, checkout or payment control; each plan's call to action SHALL lead to the waitlist form.

#### Scenario: Plan call to action reaches the form
- **WHEN** a visitor activates a call to action on a pricing plan
- **THEN** the page scrolls to the waitlist form and no payment interface appears

### Requirement: Single waitlist form
Every signup call to action on the page (Navbar, Hero, Pricing plans) SHALL lead to the same waitlist form located in the Waitlist CTA section. The page SHALL contain no other form.

#### Scenario: One form on the page
- **WHEN** the page is inspected
- **THEN** exactly one form exists, inside the Waitlist CTA section

### Requirement: Footer
The Footer SHALL show the AgentFlow brand and a short description of the service.

#### Scenario: Footer content
- **WHEN** the end of the page is displayed
- **THEN** the Footer shows the brand and a short description

### Requirement: Ukrainian user-facing copy
All user-facing text on the page, including labels, error messages and success messages, SHALL be in Ukrainian. The brand name AgentFlow MAY remain in Latin script, and the document language SHALL be declared as Ukrainian.

#### Scenario: Page language
- **WHEN** the page is loaded
- **THEN** the document language is Ukrainian and visible copy is Ukrainian apart from the brand name

### Requirement: Responsive layout without horizontal overflow
The page SHALL be usable at a 375 px wide mobile viewport and a 1440 px wide desktop viewport. At both widths the page MUST NOT scroll horizontally, and all eight sections and the form MUST remain reachable.

#### Scenario: No horizontal overflow at mobile width
- **WHEN** the page is rendered at a 375 px wide viewport
- **THEN** the document's scroll width does not exceed the viewport width

#### Scenario: No horizontal overflow at desktop width
- **WHEN** the page is rendered at a 1440 px wide viewport
- **THEN** the document's scroll width does not exceed the viewport width

### Requirement: Simple styling
The page SHALL use simple static styling and MUST NOT rely on complex animations.

#### Scenario: Page is readable without motion
- **WHEN** the page is displayed
- **THEN** all content is visible without waiting for an animation to complete
