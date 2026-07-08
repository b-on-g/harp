# $bog_harp

Development home of the **HARP protocol** (Humane API REST Protocol) — a declarative, normalized graph protocol for REST-full APIs. An alternative to GraphQL that stays HTTP-native: one-line queries in the URI, cacheable GETs, normalized replies.

Upstream idea & query-language implementation: [$hyoo_harp](https://github.com/hyoo-ru/harp.hyoo.ru). This module turns those ideas into a normative spec and a reference implementation.

## Structure

- [`spec/`](./spec) — normative protocol specification (draft).
- [`spec/vector/`](./spec/vector) — language-agnostic conformance test vectors + reference runner.
- [`reply/`](./reply) — reference reply builder: query + data graph → normalized slice (`$bog_harp_reply`).
- `serve/` (planned) — reference Node HTTP server with resolver interface and content negotiation.
- `store/` (planned) — turnkey storage adapters (SQLite first).
- `app/` (planned) — API explorer UI, descendant of `$hyoo_harp_app`.
- `client/` (planned) — framework-agnostic TS client with normalized cache.

## Roadmap

1. Spec draft covering query, reply, HTTP binding, writes, errors, metadata, watch. ✅ (see `spec/`)
2. Reply builder + conformance vectors. ✅ (`npx mam bog/harp/spec/vector` runs everything)
3. Node server + SQLite demo dataset.
4. Explorer with metadata-driven autocomplete.
5. TS client, then conformance-validated ports (Go, Python).
