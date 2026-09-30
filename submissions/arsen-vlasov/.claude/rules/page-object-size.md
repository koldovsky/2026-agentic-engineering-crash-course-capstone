---
description: Page object file size limit and component/facade split
globs: page-objects/**/*.ts
alwaysApply: false
paths:
  - "page-objects/**/*.ts"
---

# Page object size and structure

## Limit

- **~300 lines** per POM or component file. This is a guideline, not dogma.
- If a file has more than 300 lines, split it into components or move repeated blocks into `components/`.

## How to split

1. Identify a **self-contained UI block** (Stripe checkout flow, upcoming activities, sidebar, modal).
2. Create a `*-component.ts` under `page-objects/**/components/`.
3. Make the root page a **facade**. Its constructor builds the components. Its public methods delegate to them.

## Example: HomePage

```
home-page.ts                    # facade: cards, navigation (~800 → target ~300 plus delegation)
components/
  stripe-payment.component.ts   # buyProductWithStripe, overlay, shop retry buttons
  upcoming-activities.component.ts  # "Upcoming activities" block on the home page
  product-cards-component.ts    # reusable product cards
```

```ts
export class HomePage extends LmsBasePage {
  private readonly stripePayment: StripePaymentComponent;

  async buyProductWithStripe(params) {
    return this.stripePayment.buyProductWithStripe(params);
  }
}
```

## God specs (same idea)

- `investment-and-capital-course-verification.spec.ts` (~1100 lines) →
  - `card-visibility.spec.ts`
  - `program-availability.spec.ts`
  - `block-availability.spec.ts`
  - `calendar.spec.ts`
  - `helpers/investment-and-capital-flows.ts`

## Checklist before a PR

- [ ] POM file under ~300 lines, or a justified exception
- [ ] No duplicated locators between the page and its components
- [ ] Specs do not import a component directly. They use it only through the page object.
