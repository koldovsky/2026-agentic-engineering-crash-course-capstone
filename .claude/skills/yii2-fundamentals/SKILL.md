---
name: yii2-fundamentals
description: Core Yii2 framework facts (application, config, components, DI, controllers/actions, models, request/response, routing, error handling, bootstrapping, events, behaviors, console). Use before writing or reviewing any Yii2 PHP code so it follows documented framework behaviour.
---

# Yii2 fundamentals

Source: the Yii 2 Definitive Guide, `https://www.yiiframework.com/doc/guide/22.0/en/<page>` (page names in brackets).
Only documented behaviour is listed. For anything else, fetch the page; do not guess.

## Application [structure-applications, structure-overview]
- Required config: `id`, `basePath`. Key properties: `bootstrap`, `components` ("the single most important property",
  read as `\Yii::$app->componentID`), `modules`, `params`, `controllerNamespace` (default `app\controllers`),
  `controllerMap`, `aliases`, `language`, `timeZone`, `vendorPath`, `runtimePath`.
- Lifecycle: entry script loads config → `preInit()` → properties → `init()` → `bootstrap()` → `EVENT_BEFORE_REQUEST` →
  request handling → `EVENT_AFTER_REQUEST` → response sent. Also `EVENT_BEFORE_ACTION` / `EVENT_AFTER_ACTION`.
- Request cycle: entry script → application → filters → controller → model/view.

## Configuration [concept-configurations]
- Config array: `'class' => ...`, property values, `'on eventName' => handler`, `'as behaviorName' => config`.
- `Yii::createObject($config)` creates; `Yii::configure($object, $config)` configures an existing object (no `class`).
- Complex configs live in separate PHP files that `return` arrays. `YII_ENV` is `prod`, `dev` or `test`.
- App config has a `container` key (2.0.11+) for DI definitions.

## Service locator & DI [concept-service-locator, concept-di-container]
- `\Yii::$app` is the main service locator; components are created lazily and reused.
- Modules are hierarchical locators (2.0.13+): inside a module prefer `$this->get('db')` over `Yii::$app->get('db')`.
  Component configs are not merged between module levels.
- DI container: constructor injection by type hints; `$container->set()` (new instance each time) and
  `setSingleton()`; register in app config `'container'` (applications) or in a bootstrap class (extensions).
  `'__construct()' => [...]` passes constructor args; `Instance::of('id')` references another definition.
- Controllers are created through the container (`Yii::createObject()` calls the container's `get()`), so their
  constructors get dependencies injected. Documented signature: `__construct($id, $module, BookingInterface $service,
  $config = [])` - dependencies between `$module` and `$config`, then `parent::__construct($id, $module, $config)`. An
  unregistered interface fails ("cannot be instantiated") until it is bound. Action parameters can be injected too
  (2.0.36+): `actionBook($id, BookingInterface $service)`.
- Verified in this project (Yii 2.0.55, `yii\web\Controller::bindInjectedParams`): action-parameter injection resolves a type
  only if it is a module component of the same name or **registered** in the container (`Yii::$container->has()`) - even a
  concrete class; otherwise "Could not load required service: <param>". Constructor injection builds concrete classes
  without registration.
- Verified: `yii\rest\Controller` includes a `rateLimiter` behavior that calls `Yii::$app->getUser()`; without
  `user.identityClass` this throws `User::identityClass must be set` on every request. Remove the behavior until an identity
  class exists. The default `authenticator` (`CompositeAuth` with no methods) does not need the user component.

## Controllers & actions [structure-controllers]
- Route = `controllerID/actionID`, or `moduleID/controllerID/actionID`.
- Controller ID `post-comment` → class `PostCommentController` in `controllerNamespace`; action ID `hello-world` →
  method `actionHelloWorld()`. Standalone actions extend `yii\base\Action` and are declared in `actions()`.
- Action params are bound from `$_GET` by name. Lifecycle: `init()` → `beforeAction()` → action → `afterAction()`.
- Keep controllers light; put data processing in models.

## Models [structure-models, input-validation]
- Attributes, `attributeLabels()`, `scenarios()`, `rules()`, mass assignment (`$model->attributes = $data` only
  fills safe attributes), export via `toArray()` / `fields()` / `extraFields()`.
- Rules: `[attributes, validator, options]`; options `on`, `except`, `when`, `skipOnError`, `message`.
  Validate with `$model->load($data); $model->validate(); $model->errors`. Never trust user input.
- Ad hoc validation: `DynamicModel::validateData($data, $rules)`.
- Best practice: fat models (business logic), no HTML in models, avoid many scenarios per model.

## Request / response [runtime-requests, runtime-responses]
- `Yii::$app->request`: `get()`, `post()`, `getBodyParam()`/`bodyParams` (PUT/PATCH), `method`, `headers`,
  `isAjax/isGet/isPost/isPut`. Behind a proxy set `trustedHosts`, `ipHeaders`, `secureHeaders`.
- `Yii::$app->response`: `statusCode`, `headers->add/set/remove`, `format` + `data`
  (`Response::FORMAT_JSON`), formatters HTML/XML/JSON/JSONP/RAW, `sendFile()`, `redirect()`.
  Events: `EVENT_BEFORE_SEND`, `EVENT_AFTER_PREPARE`, `EVENT_AFTER_SEND`.
- Predefined exceptions: `BadRequestHttpException`, `NotFoundHttpException`, `ServerErrorHttpException`,
  or `new \yii\web\HttpException($code)`.

## Routing [runtime-routing]
- Pretty URLs: `urlManager` with `enablePrettyUrl`, `showScriptName`, `enableStrictParsing`, `rules`.
- Rule forms: `'posts' => 'post/index'`, `'post/<id:\d+>' => 'post/view'`, `'PUT,POST post/<id:\d+>' => 'post/update'`,
  or array with `pattern`, `route`, `suffix`. Rules with HTTP methods are parse-only unless they include `GET`.
- URLs: `Url::to(['post/view', 'id' => 100])`, second arg `true` = absolute. Default route `site/index`
  (`defaultRoute`). For speed: parameterised rules, specific rules first, `GroupUrlRule` for shared prefixes.

## Errors [runtime-handling-errors]
- `YII_DEBUG` true shows call stacks; keep it false in production. Throw HTTP exceptions for proper status codes.
- For non-HTML formats the error handler puts `name`, `message`, `code`, `status` into `Response::$data`; reshape it in
  the `response` component's `beforeSend` event.

## Bootstrapping [runtime-bootstrapping]
- App `bootstrap` property accepts component IDs, module IDs, class names, config arrays, closures. Extensions declare
  bootstrap classes (discovered through `vendor/yiisoft/extensions.php`). Keep bootstrapping light.

## Events & behaviors [concept-events, concept-behaviors]
- `$obj->on(NAME, $handler)`, `off()`, `trigger()`; handler gets `$event`; use class constants for event names;
  `$event->handled = true` stops propagation; class-level `Event::on(ActiveRecord::class, ...)`.
- Behaviors extend `yii\base\Behavior` (`$this->owner`); attach via `behaviors()` or `attachBehavior()`. Built-in:
  `TimestampBehavior`, `BlameableBehavior`, `SluggableBehavior`, `AttributeBehavior`.

## Console [tutorial-console]
- Commands extend `yii\console\Controller`; run `yii <route> [--option=value argument]`; `options()`, `optionAliases()`;
  return `ExitCode::OK` / `ExitCode::UNSPECIFIED_ERROR`. Console app has its own config (`console.php`).

## Testing [test-overview]
- Unit, functional and acceptance tests exist; the guide recommends test-first development for larger/long-lived projects.
