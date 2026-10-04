---
name: yii2-data-layer
description: Yii2 Active Record, Query Builder and validation usage (queries, saving, relations, transactions, safe parameter binding). Use when writing models, queries or persistence code.
---

# Yii2 data layer

Source: `https://www.yiiframework.com/doc/guide/22.0/en/<page>` [db-active-record, db-query-builder, input-validation].

## Active Record
- Extend `yii\db\ActiveRecord`; override `tableName()` (default: class name → snake_case). Uses the `db` component;
  override `getDb()` for another connection.
- Query: `Customer::findOne(123)`, `findAll([...])`, `Customer::find()->where(['status' => 1])->all()`,
  `->asArray()->all()`, `->batch(10)` / `->each(10)` for big sets.
- Save: `$m->save()` (insert or update by `isNewRecord`; runs validation); `$m->attributes = [...]` (safe attributes only);
  `updateAll(attrs, condition)`, `deleteAll(condition)`, `$m->delete()`, `updateCounters([...])`.
- Relations: `getOrders() { return $this->hasMany(Order::class, ['customer_id' => 'id']); }`,
  `hasOne(...)`, `->viaTable('order_item', ['order_id' => 'id'])`; access `$customer->orders` (lazy) or
  `getOrders()->where(...)`; eager: `Customer::find()->with('orders')->all()`.
- Save lifecycle: `beforeValidate` → validate → `afterValidate` → `beforeSave` (`EVENT_BEFORE_INSERT/UPDATE`) → write →
  `afterSave`. Find: `init` → `afterFind`.
- Transactions: `Customer::getDb()->transaction(function ($db) { ... })` or declare `transactions()` per scenario.
- `getDirtyAttributes()`; optimistic locking via `optimisticLock()` (throws `StaleObjectException`).

## Query Builder
- `select()`, `from()`, `where()` (string with `:params`, hash `['status' => 10, 'id' => [4, 8]]`, operator
  `['>', 'age', 10]`), `orderBy()`, `groupBy()`, `having()`, `limit()`, `offset()`; execute with `all()`, `one()`,
  `count()`, `scalar()`; `batch()` / `each()` for large data.
- **Never embed variables into condition strings** (SQL injection). Hash/operator formats bind parameters.
  Column names are NOT escaped — validate user-supplied column names against an allow-list.

## Validation
- `rules()` returns `[attributes, validator, options]`; scenarios via `on` / `except`; conditional via `when`.
- Inline validators (method name or closure) and standalone `Validator` subclasses (`validateAttribute()`).
- `DynamicModel::validateData()` for ad hoc validation. Available core validators: see `tutorial-core-validators`.
