# Release notes

## Setup

### Before you start

A paragraph with **bold**, _italic_, `pnpm check` and a [link](https://example.com/a?b=1).

A [star link](https://example.com/*a*/b), an image ![](https://example.com/i.png), `` a ` b `` and `{name}`.

Text with List\<String> and a \`tick\` stays text.

h2. looks like a heading

bq. looks like a quote

Markup characters stay text: {name}, [id], 2 * 3, snake_case, a|b and wow!
So do \*not bold\* and \[not|a link\].

\# is not a heading, and a-b is not a strike.

\- is not a list item.

```ts
const a = { b: [1] };
```

```
no language, and *no* markup
```

````
```
inner fence
```
````

- bullet
  1. numbered
  2. second
- next
  - deeper

1. first
   - under a number
2. second

A list with code:

- item with code
  ```js
  let x
  ```
- after

An item that starts with code:

- ```js
  let y
  ```
- after

> First quote paragraph.
>
> Second one with **bold**.

---

The last line.
