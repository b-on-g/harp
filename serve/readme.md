# $bog_harp_serve

Reference HTTP server for the [HARP protocol](../spec): spec §5 binding on top of [`$bog_harp_reply`](../reply).

Implemented:

- `GET` with the query in the URI path.
- Status codes per spec §5.1: `200` full success, `207` on any in-band `_error`, `400` malformed query / unknown type, `413` over the rate limit (`$hyoo_harp_rate`), `501` for not-yet-implemented methods.
- Content negotiation per spec §4.3: JSON by default, XML for browsers (their `Accept` asks for it), Tree via `Accept: application/x-tree;harp`. `Vary: Accept` always.

Pending: `PATCH` (spec §7), `WATCH`/`FORGET` over WebSocket (spec §9), metadata discovery at `GET /` (spec §8), pluggable stores.

## Usage

The pure core is `$bog_harp_serve_response( uri, data, accept, rate_max )` → `{ status, mime, headers, body }` — testable without a socket. The `$bog_harp_serve` class wraps it with `$node.http`; subclass and override `data()` / `port()` / `rate_max()`.

## Demo

```sh
npx mam bog/harp/serve/demo
HARP_SERVE=1 node bog/harp/serve/demo/-/node.js
curl 'http://localhost:9181/user=jin=(name;friend(name))'
curl -H 'Accept: application/x-tree;harp' 'http://localhost:9181/pullRequest(state=closed=merged=;-updateTime)'
```
