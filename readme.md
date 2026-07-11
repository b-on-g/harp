# $bog_harp

Development home of the **HARP protocol** (Humane API REST Protocol) — a declarative, normalized graph protocol for REST-full APIs. An alternative to GraphQL that stays HTTP-native: one-line queries in the URI, cacheable GETs, normalized replies.

Upstream idea & query-language implementation: [$hyoo_harp](https://github.com/hyoo-ru/harp.hyoo.ru). This module turns those ideas into a normative spec and a reference implementation.

## Structure

- [`spec/`](./spec) — normative protocol specification (draft).
- [`spec/vector/`](./spec/vector) — language-agnostic conformance test vectors + reference runner.
- [`reply/`](./reply) — reference reply builder: query + data graph → normalized slice (`$bog_harp_reply`).
- [`patch/`](./patch) — reference write engine: atomic `PATCH` merge per spec §7 (`$bog_harp_patch`).
- [`meta/`](./meta) — metadata discovery per spec §8: `_type` / `_field` / `_server` inferred from data.
- [`watch/`](./watch) — subscription deltas per spec §9: normalized slice diff (`$bog_harp_watch_delta`).
- [`serve/`](./serve) — reference Node server: HTTP + WebSocket, spec §5 statuses, `PATCH`, `WATCH`, metadata at `GET /`, CORS, content negotiation (JSON/XML/Tree), runnable demo.
- [`store/sqlite/`](./store/sqlite) — turnkey SQLite adapter: tables → types, FK → links, zero npm deps.
- [`app/`](./app) — API explorer: live queries against any HARP endpoint, HATEOAS navigation by clicking links, metadata-driven field autocomplete.
- [`client/`](./client) — framework-agnostic TS client with normalized cache: `get` / `patch` / `watch`, zero dependencies.
- [`bench/`](./bench) — reproducible payload benchmark vs GraphQL and REST.

## Payload benchmark

Same data, same fetch plan, three protocols. Reproducible: `HARP_BENCH=1 node bog/harp/bench/-/node.js` ([methodology](./bench), deliberately generous to competitors — no `__typename` for GraphQL, ideally caching client for REST).

| Scenario | Metric | REST | GraphQL | HARP |
|----------|--------|------|---------|------|
| 200 PRs + repos + authors | payload | 34.4 KB | 68.2 KB | **32.4 KB** |
|  | gzipped | 5.3 KB | **3.0 KB** | 3.4 KB |
|  | requests | 16 | 1 | 1 |
|  | entity copies | 215 | 800 | **215** |
| friends of friends (30 roots) | payload | 33.0 KB | 288.7 KB | **20.6 KB** |
|  | gzipped | 18.3 KB | 9.6 KB | **2.9 KB** |
|  | requests | 71 | 1 | 1 |
|  | entity copies | 100 | 3330 | **100** |

The honest read: on shallow duplication gzip hides most of GraphQL's redundancy (it even edges out HARP on wire bytes there), but the client still receives and parses 800 objects instead of 215. Once duplication grows with depth — the friends-of-friends case — normalization wins on every metric: 14× less raw payload, 3.3× less gzipped, 33× fewer objects to parse and hold in memory.

## Roadmap

1. Spec draft covering query, reply, HTTP binding, writes, errors, metadata, watch. ✅ (see `spec/`)
2. Reply builder + conformance vectors. ✅ (`npx mam bog/harp/spec/vector` runs everything)
3. Node server ✅ + `PATCH` ✅ + SQLite store ✅ (demo: `HARP_SERVE=1 [HARP_SQLITE=db.sqlite] node bog/harp/serve/demo/-/node.js`).
4. Explorer ✅ with metadata-driven autocomplete ✅ (`bog/harp/app`).
5. Metadata discovery ✅ + WATCH over WS ✅.
6. TS client ✅ (`bog/harp/client`).
7. Conformance-validated ports (Go, Python) — open for contributions, validate against `spec/vector/`.
