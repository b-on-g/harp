# $bog_harp

Development home of the **HARP protocol** (Humane API REST Protocol) — a declarative, normalized graph protocol for REST-full APIs. An alternative to GraphQL that stays HTTP-native: one-line queries in the URI, cacheable GETs, normalized replies.

Upstream idea & query-language implementation: [$hyoo_harp](https://github.com/hyoo-ru/harp.hyoo.ru). This module turns those ideas into a normative spec and a reference implementation.

## Structure

- [`spec/`](./spec) — normative protocol specification (draft).
- [`spec/vector/`](./spec/vector) — language-agnostic conformance test vectors + reference runner.
- [`reply/`](./reply) — reference reply builder: query + data graph → normalized slice (`$bog_harp_reply`).
- [`patch/`](./patch) — reference write engine: atomic `PATCH` merge per spec §7 (`$bog_harp_patch`).
- [`serve/`](./serve) — reference Node HTTP server: spec §5 statuses (200/207/400/409/413), `PATCH`, CORS, content negotiation (JSON/XML/Tree), runnable demo.
- [`store/sqlite/`](./store/sqlite) — turnkey SQLite adapter: tables → types, FK → links, zero npm deps.
- [`app/`](./app) — API explorer: live queries against any HARP endpoint, HATEOAS navigation by clicking links.
- `client/` (planned) — framework-agnostic TS client with normalized cache.

## Roadmap

1. Spec draft covering query, reply, HTTP binding, writes, errors, metadata, watch. ✅ (see `spec/`)
2. Reply builder + conformance vectors. ✅ (`npx mam bog/harp/spec/vector` runs everything)
3. Node server ✅ + `PATCH` ✅ + SQLite store ✅ (demo: `HARP_SERVE=1 [HARP_SQLITE=db.sqlite] node bog/harp/serve/demo/-/node.js`).
4. Explorer ✅ (`bog/harp/app`); metadata-driven autocomplete pending (needs spec §8 implementation).
5. Metadata discovery (`_type`/`_field`/`_server`), WATCH over WS.
6. TS client, then conformance-validated ports (Go, Python).
