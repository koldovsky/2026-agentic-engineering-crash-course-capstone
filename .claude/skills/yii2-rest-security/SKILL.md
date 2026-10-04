---
name: yii2-rest-security
description: Documented Yii2 practices for REST authentication, authorization (checkAccess, AccessControl, RBAC), rate limiting, CORS, error responses and general security. Use when securing endpoints or reviewing API security.
---

# Yii2 REST security & errors

Source: `https://www.yiiframework.com/doc/guide/22.0/en/<page>` [rest-authentication, rest-controllers, rest-rate-limiting,
rest-error-handling, security-authentication, security-authorization, security-best-practices, structure-filters].

## Authentication (stateless)
1. `user` component: `enableSession => false` (no session persistence) and `loginUrl => null` (HTTP 403 instead of a redirect).
   If the API is a module, the guide allows `\Yii::$app->user->enableSession = false;` in the module's `init()`.
2. Set the `authenticator` behavior in the REST controller:
   ```php
   $behaviors = parent::behaviors();
   $behaviors['authenticator'] = [
       'class' => CompositeAuth::class,
       'authMethods' => [HttpBasicAuth::class, HttpBearerAuth::class, QueryParamAuth::class],
   ];
   return $behaviors;
   ```
   (or a single method, e.g. `['class' => HttpBearerAuth::class]`).
3. Identity class implements `yii\web\IdentityInterface`: `findIdentity()`, `findIdentityByAccessToken($token, $type = null)`,
   `getId()`, `getAuthKey()`, `validateAuthKey()`; configure `'user' => ['identityClass' => ...]`.
- Methods: Basic (token as username; only when the client can keep it secret), Bearer (OAuth 2 style), query parameter
  (mostly for JSONP; appears in server logs). Send API traffic over HTTPS.
- Failed authentication → 401 with proper headers. Current user: `Yii::$app->user->identity`, `->id`, `->isGuest`.

## Authorization
- `ActiveController::checkAccess($action, $model = null, $params = [])` — throw `ForbiddenHttpException` to deny; called
  by the built-in actions; call it yourself in custom actions.
- Access Control Filter (simple cases): `'access' => ['class' => AccessControl::class, 'only' => [...],
  'rules' => [['allow' => true, 'roles' => ['@']]]]` (`?` guests, `@` authenticated; also `actions`, `ips`, `verbs`).
- RBAC: roles/permissions/rules via `authManager` (`PhpManager` files or `DbManager` tables `auth_item`, `auth_item_child`,
  `auth_assignment`, `auth_rule`); build data in migrations (fixed hierarchy) or console commands; check with
  `Yii::$app->user->can('updatePost', ['post' => $post])`; `defaultRoles` for implicit roles.

## Rate limiting
- Identity implements `yii\filters\RateLimitInterface`: `getRateLimit($request, $action)` (e.g. `[100, 600]`),
  `loadAllowance()` (remaining + timestamp), `saveAllowance()`. Store in DB columns, cache or NoSQL.
- Exceeding → 429. Headers `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`; disable with
  `$behaviors['rateLimiter']['enableRateLimitHeaders'] = false;`.

## CORS
`Cors` must run before the authenticator: remove `authenticator` from `$behaviors`, add
`$behaviors['corsFilter'] = ['class' => \yii\filters\Cors::class];`, re-add the authenticator with
`$behaviors['authenticator']['except'] = ['options'];` (preflight carries no credentials).

## Errors
- Throw HTTP exceptions; Yii serializes `name`, `message`, `code`, `status`. Status codes used: 200, 201, 204, 304, 400,
  401, 403, 404, 405, 415, 422 (validation failed), 429, 500.
- To change the error envelope, handle the `response` component's `beforeSend` event.
- `YII_DEBUG` false in production; remove Gii and the debug toolbar from production.

## Best practices (security-best-practices)
- Treat all input as unsafe; validate against allowed values. Use parameter binding; whitelist column/table names.
- GET requests must not change state; never deserialize untrusted data (parse JSON safely).
- Keep CSRF protection enabled for state-changing browser requests; enforce HTTPS; validate Host headers.
- Restrict/validate file uploads; do not disable SSL peer verification for outgoing calls.
- Hash passwords with the security component (see `security-passwords`); never return hashes/tokens (`fields()`).
