---
description: Test files and titles must not include TC IDs
globs: tests/**/*.{spec,test}.ts
alwaysApply: false
paths:
  - "tests/**/*.{spec,test}.ts"
---

# Test naming (no TC IDs)

## File names

- **Never** put a ticket or TC ID in a file name.
  - ✅ `shop-buy-all-products.spec.ts`
  - ✅ `investment-and-capital/card-visibility.spec.ts` (domain, not TC)
  - ❌ `gd-tc-190-shop-buy-all-products.spec.ts`

## Test names

- **Never** put a TC ID in `test('...')`.
  - ✅ `test('Купівля продуктів в магазині', ...)`
  - ❌ `test('PRJ-TC-190: Купівля продуктів в магазині', ...)`

## Linking to the test case

- Link the test case only through `linkTestCase(190)` (or an equivalent). Never link it through the file name or the test name.

## Splitting by domain

- Split a large scenario into several files by meaning (`program-availability`, `block-availability`). Do not make one `*-verification.spec.ts` that covers the whole epic.
