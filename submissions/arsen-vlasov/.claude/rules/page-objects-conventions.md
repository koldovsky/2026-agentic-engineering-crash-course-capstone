---
description: Page Objects conventions (POM, modals, components, facade)
globs: page-objects/**/*.ts
alwaysApply: false
paths:
  - "page-objects/**/*.ts"
---

# Page Object conventions (POM)

Goal: one consistent style, readable code, and files under ~300 lines (details in `page-object-size.md`).

## 1) Method names

- Use `shouldSeePage()` for the basic page check.
- Name a method after its intent: `clickAddDeal`, `openCalendar`, `shouldSeeDeleteButton`.

## 2) Components and the facade

- Put each separate overlay or block into its own class under `page-objects/**/components/`.
- The page builds its components in the constructor. Its public methods **delegate** to them (facade):

```ts
// HomePage as a facade
private readonly stripePayment: StripePaymentComponent;
private readonly upcomingActivities: UpcomingActivitiesComponent;

async buyProductWithStripe(params) {
  await this.stripePayment.buyProductWithStripe(params);
}
```

Example components: `stripe-payment.component.ts`, `upcoming-activities.component.ts`, `product-cards-component.ts`.

## 3) Assertions in POM

- Use `utils/assertions/ui-assertions.ts` with a **descriptive message** instead of a bare `expect`.
- The POM exposes `shouldSee*` methods. Inside them, it calls `expectVisible` / `expectText` / `expectCount`.

## 4) Modals and overlays

- Extend `BaseModalForm`.
- If the modal has no standard `messages`, write `protected readonly messages = undefined`.
- The page exposes a **public getter** for each modal, so that specs can reach it. Examples: `get demoPaymentModal()`, `get demoPaymentConfirmationModal()`, `get getProTradingChannels()`.
- In the test: `await proTradingPage.demoPaymentModal.shouldSeeModalForm()`.

## 5) Files and uploads

- Fixtures come from `test-data/files/**`. Refer to them by name through `TEST_FILES`.
- Do not generate `Buffer` stubs unless there is a reason to.

## 6) Waiting (prohibitions)

- **Forbidden**: `waitForTimeout`, `this.wait()`, `waitUntil: 'networkidle'`.
- **Allowed**: `toBeVisible({ timeout })`, `waitForSelector`, `expect(...).toPass()`, `DateHelper`. See `no-hardcoded-waits.md`.

## 7) Comments

- Do not write AI-style descriptions.
- Write a single short comment only for a non-obvious workaround (for example, why you replaced `networkidle`).
