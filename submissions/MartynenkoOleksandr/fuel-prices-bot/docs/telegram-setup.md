# Telegram setup

## 1. Create the bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot`.
3. Enter the bot's display name, for example `Ціни на пальне`.
4. Enter a username ending in `bot`, for example `fuel_prices_ua_bot`.
5. BotFather returns a **token** like `1234567890:AAH...`. It is a secret: never commit it and never show it to anyone.

## 2. Create the channel

1. In Telegram: "New Channel".
2. For a public channel, set a link such as `t.me/fuel_prices_ua`. The bot's `chat_id` is then `@fuel_prices_ua`.
3. For a private channel, the `chat_id` is a number like `-1001234567890` (how to find it is below).

## 3. Add the bot to the channel

1. Channel settings → "Administrators" → "Add Admin".
2. Find the bot by its username.
3. Keep the **"Post Messages"** permission; the rest can be turned off.

## 4. Check

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d chat_id=@fuel_prices_ua \
  -d text="Test"
```

A response with `"ok":true` means everything is set up. The message "Test" appears in the channel.

## Finding the numeric ID of a private channel

1. Post any message in the channel.
2. Run:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates"
   ```
3. Find `"chat":{"id":-100...}` in the response: that is the `chat_id`.

## Chat for technical notices

The bot should have a separate chat for errors (a site did not answer, prices look suspicious and so on), so they do not clutter the channel.

1. Send the bot any private message (otherwise the bot cannot write to you first).
2. Run `getUpdates` and find `"chat":{"id":123456789}`: that is your personal `chat_id`.
3. Put it in `TELEGRAM_ADMIN_CHAT_ID` (see [Configuration](configuration.md)).

## Bot API methods used

| Method | Why |
|---|---|
| `sendMessage` | The channel post and the admin notices |

The call as `src/telegram/client.js` makes it (simplified, without retries and token redaction):

```js
const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: channelId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  }),
});
const data = await res.json();
if (!data.ok) throw new Error(`Telegram: ${data.description}`);
```
