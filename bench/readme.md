# $bog_harp_bench

Reproducible payload benchmark: HARP vs GraphQL vs REST on the same data and the same fetch plan. Deterministic (seeded PRNG, no clocks) — rerunning yields byte-identical numbers.

```sh
npx mam bog/harp/bench
HARP_BENCH=1 node bog/harp/bench/-/node.js
```

## Scenarios

1. **200 pull requests + repos + authors** — a dashboard page: 200 PRs referencing 5 repos and 10 users. Classic shared-reference duplication: GraphQL repeats each repo/author object per PR.
2. **Friends of friends, 30 roots** — the graph-explosion case: 100 users, 10 friends each, fetched 2 levels deep. GraphQL returns ~3300 user objects for ≤100 distinct users.

## Methodology (deliberately generous to competitors)

- **HARP** — real bytes: the actual `$bog_harp_reply` output including the `_query` echo section, compact JSON (the reference server pretty-prints for DX; wire comparison uses compact for all three).
- **GraphQL** — the canonical response tree for the equivalent query: `{ "data": ... }`, exactly the requested fields plus `id`. No `__typename` (Apollo adds it by default; omitting it favors GraphQL).
- **REST** — per-resource endpoints with an **ideally caching client**: the root collection in one request, every referenced entity fetched exactly once (a real client without a cache does much worse). Resources are returned whole, as typical REST does — that overfetch is REST's well-known cost, not a strawman.
- `gzipped` — each HTTP response compressed independently (as on the wire); this matters because compression eats much of the duplication, so raw-bytes-only comparisons overstate the win.
- `entity copies` — how many entity objects the payload carries; HARP's count equals the number of distinct entities by construction.

Current numbers live in the [root readme](../readme.md#payload-benchmark).
