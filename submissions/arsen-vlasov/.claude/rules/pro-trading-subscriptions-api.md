---
description: Pro Trading subscriptions in tests (grant via admin API, no purchase)
globs: tests/specs/**/*.ts
alwaysApply: false
paths:
  - "tests/specs/**/*.ts"
---

# Pro Trading: granting a subscription through the API (no payment)

## Domain context (matters for tests)

- Pro Trading has **no `accessId`** for `POST /api/v2/admin/granted-access-packages`.
- Pro Trading has **no cycles or streams**, unlike some courses and products.
- A Pro Trading subscription grants access to private Telegram channels and chats.

## How to grant a subscription without a purchase

Use the admin endpoint:

- `POST /api/v2/admin/pro-trading/subscriptions/payment`

It creates the subscription through the payment service. After a page refresh, the LMS shows that the user has an active subscription.

### Request fields (what works in practice for tests)

- **`daysCount`**: required, subscription period (minimum 1). It can be a custom value. It does not have to match the plan period.
- **`lmsUserId`**: required, the user's UUID in the LMS.
- **`planSlug`**: required, which plan or subscription type to grant.
- **`merchantSlug`**: required, which merchant to report to the payment service.
- **`email`**: the endpoint passes it to the payment service. The system does not necessarily resolve it from `lmsUserId`. Pass it explicitly in tests.

Example body:

```json
{
  "lmsUserId": "c613de7c-a0b0-45a7-9705-4b001de1a519",
  "email": "person@example.com",
  "planSlug": "pro-advanced-90d",
  "daysCount": 1,
  "merchantSlug": "stripe"
}
```

## Accepted values (as used in tests)

### `merchantSlug`

- `olypay`
- `yookassa`
- `tinkoff`
- `stripe`

### `planSlug` (the ones tests need)

Advanced:
- `pro-advanced-365d`
- `pro-advanced-90d`
- `pro-advanced-30d`
- `pro-advanced-7d-demo` (demo)

Basic:
- `pro-basic-365d`
- `pro-basic-90d`
- `pro-basic-30d`

Students:
- `pro-students-365d`
- `pro-students-30d`
