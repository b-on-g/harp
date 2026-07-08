# $bog_harp_serve

Reference HTTP server for the [HARP protocol](../spec): spec §5 binding on top of [`$bog_harp_reply`](../reply).

Implemented:

- `GET` with the query in the URI path.
- `PATCH` per spec §7: atomic merge, upsert, `_etag` CAS — `200` applied / `409` aborted.
- `WATCH` / `FORGET` / `GET` / `PATCH` over WebSocket per spec §9 (same port): JSON envelopes, initial full reply, then delta slices in the same normalized format.
- Metadata discovery per spec §8: `_type` / `_field` / `_server` inferred from data ([`$bog_harp_meta`](../meta)); `GET /` ≡ `GET /_type(name)`.
- Status codes per spec §5.1: `200` full success, `207` on any in-band `_error`, `400` malformed query / unknown type, `413` over the rate limit (`$hyoo_harp_rate`), `501` for unknown methods.
- Content negotiation per spec §4.3: JSON by default, XML for browsers (their `Accept` asks for it), Tree via `Accept: application/x-tree;harp`. `Vary: Accept` always. CORS is open (`*`).

Pending: query push-down and write-back for stores, resolver interface, auth hooks.

## Usage

The pure core is `$bog_harp_serve_response( uri, data, accept, rate_max )` → `{ status, mime, headers, body }` and `$bog_harp_serve_patch( uri, body_text, data )` — testable without a socket. The `$bog_harp_serve` class wraps them with `$node.http` + `ws`; subclass and override `data()` / `port()` / `rate_max()`.

## Demo

```sh
npx mam bog/harp/serve/demo
HARP_SERVE=1 node bog/harp/serve/demo/-/node.js
curl 'http://localhost:9181/'
curl 'http://localhost:9181/user=jin=(name;friend(name))'
curl -X PATCH -d '{"user":{"neo":{"name":"Neo"}}}' 'http://localhost:9181/user=neo='
curl -H 'Accept: application/x-tree;harp' 'http://localhost:9181/pullRequest(state=closed=merged=;-updateTime)'
```

Subscriptions:

```js
const ws = new WebSocket( 'ws://localhost:9181/' )
ws.onopen = ()=> ws.send( JSON.stringify({ id: 1, method: 'WATCH', uri: 'user(age=18@=;name)' }) )
ws.onmessage = event => console.log( JSON.parse( event.data ) ) // full reply, then deltas
```
