# PlayHex Discord bot

Discord bot for [PlayHex](https://playhex.org).

[Add the official PlayHex bot to your server](https://discord.com/oauth2/authorize?client_id=1566223999887736852&scope=bot+applications.commands&permissions=51200).

## Commands

- `/analyze game:<link or SGF>`: imports any Hex game (PlayHex, Little Golem, HexWorld, AbstractPlay links, SGF, raw moves),
  analyzes it with Katahex on PlayHex, then posts the analysis chart, players, result,
  a link to the original game and, for games not played on PlayHex, a link to explore it on PlayHex.

## Setup

Requires Node >= 22.18 (runs TypeScript directly).

1. Discord application (https://discord.com/developers/applications):
   copy Application ID and Bot token.
   To add the bot to a server: OAuth2 > URL Generator, check scopes `bot` and `applications.commands`,
   bot permissions `Send Messages`, `Embed Links` and `Attach Files`, then open the generated url and choose the server.
   Or directly open `https://discord.com/oauth2/authorize?client_id=<DISCORD_CLIENT_ID>&scope=bot+applications.commands&permissions=51200`.
2. PlayHex OAuth application, acting on its own (no player account), on PlayHex server:
   ``` bash
   pnpm hex oauth:create-client \
       --name "PlayHex Discord" --author "PlayHex" --logo https://playhex.org/images/logo.png \
       --client-credentials --scope games:analyze
   ```
3. `cp .env.dist .env` and fill it.

``` bash
pnpm install
pnpm register-commands # once, and when commands change. Set DISCORD_DEV_GUILD_ID to update instantly in a test server
pnpm start
```

## How it works

The bot gets a PlayHex access token for itself (OAuth `client_credentials`, scope `games:analyze`), then:

1. `POST /api/external-games/import` with the source: returns the PlayHex game, or imports it as an external game (deduplicated)
2. `PUT .../analyze`, then polls `GET .../analyze` until finished (max 13 minutes, Discord interaction token lasts 15 minutes)
3. `GET .../analyze/graph.png` and game info, posted as an embed

Rate limit: 3 analyses per minute and 20 per day per Discord user (in memory).

## License

This library is under [AGPL-v3 license](LICENSE)
