---
name: yii2-rest-endpoint
description: Build REST endpoints the documented Yii2 way - resource model (fields/extraFields), ActiveController/Controller, yii\rest\UrlRule routing, response formatting, filtering, pagination/sorting, versioning. Use when adding or changing API endpoints.
---

# Yii2 REST endpoints

Source: `https://www.yiiframework.com/doc/guide/22.0/en/<page>` [rest-quick-start, rest-resources, rest-controllers,
rest-routing, rest-response-formatting, rest-filtering-collections, rest-versioning].

## 1. Resource (model)
- Resources are `yii\base\Model` / `yii\db\ActiveRecord` objects (Model gives `Arrayable`, validation; AR gives DB access).
- `fields()` = default output fields; `extraFields()` = opt-in via `?expand=`. Clients can narrow with `?fields=id,email`.
  `ActiveRecord::fields()` returns populated attributes; `extraFields()` returns populated relations.
- Field definitions: `'id'`, `'email' => 'email_address'`, `'name' => function ($model) { ... }`.
  List fields explicitly to keep the API stable when the table changes, or `unset($fields['auth_key'], $fields['password_hash'])`
  — the default exposes ALL attributes, so remove sensitive ones.
- HATEOAS: implement `yii\web\Linkable::getLinks()` (`Link::REL_SELF => Url::to([...], true)`); output gets `_links`.

## 2. Controller
- `yii\rest\ActiveController` (needs `public $modelClass = ...;`, gives `index`, `view`, `create`, `update`, `delete`,
  `options`) or `yii\rest\Controller` (write actions yourself and **return data**, e.g. `return User::findOne($id);`).
  Class name = singular resource type (`UserController`).
- Both provide, in this order: `contentNegotiator`, `verbFilter`, `authenticator`, `rateLimiter` (configure in `behaviors()`).
- Customize/disable actions in `actions()`:
  ```php
  $actions = parent::actions();
  unset($actions['delete'], $actions['create']);
  $actions['index']['prepareDataProvider'] = [$this, 'prepareDataProvider'];
  return $actions;
  ```
- Pagination/sorting of `index`: `ArrayHelper::merge(parent::actions(), ['index' => ['pagination' => ['pageSize' => 10],
  'sort' => ['defaultOrder' => ['created_at' => SORT_DESC]]]])`.
- Collections: return an `ActiveDataProvider` (`['query' => Post::find()]`); the serializer sends
  `X-Pagination-Total-Count`, `X-Pagination-Page-Count`, `X-Pagination-Current-Page`, `X-Pagination-Per-Page`, `Link`.
- Authorization hook: `checkAccess($action, $model = null, $params = [])` (see `yii2-rest-security`).

## 3. Routing
```php
'urlManager' => [
    'enablePrettyUrl' => true,
    'enableStrictParsing' => true,
    'showScriptName' => false,
    'rules' => [
        ['class' => 'yii\rest\UrlRule', 'controller' => 'user'],
    ],
],
```
Generates `GET|HEAD /users`, `POST /users`, `GET|HEAD /users/123`, `PUT|PATCH /users/123`, `DELETE /users/123`,
`OPTIONS /users[/123]`. Options: `only`, `except`, `extraPatterns` (`'GET search' => 'search'`), `patterns`,
`pluralize => false`, `'controller' => ['u' => 'user']`, `ruleConfig` (e.g. `defaults => ['expand' => 'profile']`).
Controller IDs are pluralised automatically (`Inflector::pluralize()`).

## 4. Input & output format
- Enable JSON bodies: `'request' => ['parsers' => ['application/json' => 'yii\web\JsonParser']]` (otherwise only
  form-urlencoded and multipart are parsed).
- Content negotiation via `ContentNegotiator` (`Accept` header); JSON and XML by default. Add formats:
  `$behaviors['contentNegotiator']['formats']['text/html'] = Response::FORMAT_HTML;`.
- Wrap collections: `public $serializer = ['class' => 'yii\rest\Serializer', 'collectionEnvelope' => 'items'];`.
- JSON options: `response.formatters[Response::FORMAT_JSON]` with `yii\web\JsonResponseFormatter`, `prettyPrint`, `encodeOptions`.

## 5. Filtering collections
```php
$filter = new ActiveDataFilter(['searchModel' => 'app\models\PostSearch']);
$condition = null;
if ($filter->load(Yii::$app->request->get())) {
    $condition = $filter->build();
    if ($condition === false) { return $filter; }   // validation errors
}
$query = Post::find();
if ($condition !== null) { $query->andWhere($condition); }
return new ActiveDataProvider(['query' => $query]);
```
- `searchModel` (a model with `rules()`, or `DynamicModel`) defines which attributes may be filtered — required.
- Request: `?filter[id][in][]=2&filter[title][like]=cheese` or JSON `{"filter": {"id": {"in": [2,5,9]}}}`.
  Operators: `and or not lt gt lte gte eq neq in nin like`. Options: `attributeMap`, `nullValue`, `filterAttributeName`.
- With ActiveController configure `IndexAction::$dataFilter` in `actions()`.

## 6. Versioning
Major version = a module whose ID is the version (`v1`, `v2`), rules `['class' => 'yii\rest\UrlRule', 'controller' =>
['v1/user', 'v1/post']]`; shared base controllers/models can live in a common place and be subclassed per version.
Minor versions: `Accept: application/json; version=v1` → read from `Response::$acceptParams`.
For a module that versions an API, add its URL rules directly in the app's `urlManager` config (structure-modules).

## Checklist
- [ ] `fields()` hides sensitive data; `rules()` validate writes (failed validation → 422 automatically)
- [ ] URL rule added; endpoint exercised with curl for 200/201/204/400/401/403/404/422
- [ ] Custom actions return data and call `checkAccess()` if they need authorization
