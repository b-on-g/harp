# HARP Protocol Specification

**Status: Draft 1.** This document turns the [$hyoo_harp](https://github.com/hyoo-ru/harp.hyoo.ru) ideas into normative rules. Where it deliberately differs from the upstream readme, the difference is listed in [§13 Errata & changes](#13-errata--changes-vs-hyoo_harp-readme).

The key words MUST, MUST NOT, SHOULD, MAY are to be interpreted as described in RFC 2119.

---

## 1. Overview

HARP is a protocol for reading and writing slices of a domain **graph** over HTTP and WebSocket.

- A **query** is a one-line expression placed in the URI path. It declares which entities to fetch, which of their fields, how to filter, order, slice and aggregate — recursively through links.
- A **reply** is a **normalized** slice of the graph: every entity appears at most once, relations are lists of entity URIs. No data duplication, ever.
- Reads are `GET` (cacheable, shareable, debuggable in a browser address bar). Writes are `PATCH` (idempotent merge). Subscriptions are `WATCH`/`FORGET` over WebSocket.
- Request and response share one data model: the reply echoes the query, a write body is the same normalized slice format as a read reply.

## 2. Terminology

- **Entity** — a node of the domain graph, identified by the pair (**type**, **id**).
- **Type** — a non-empty string naming an entity class, e.g. `user`.
- **Id** — a non-empty, case-sensitive, **opaque** string, unique within its type.
- **Entity URI** — the string `type=id=`, globally unique, e.g. `user=jin=`. It is simultaneously a valid HARP query selecting that entity by primary key.
- **Field** — a named property of an entity. A field value is either a **scalar** or a **link list**.
- **Link** — a reference to an entity, serialized as its entity URI. Relations are ALWAYS lists of links, even when the cardinality is 0..1.
- **Slice** — a normalized subset of the graph: `type → id → field → value`.
- **Fetch** — one element of a query: a field name with optional order/filter predicates and an optional sub-query.

### 2.1 Names

- Type and field names SHOULD match `[a-zA-Z][a-zA-Z0-9]*` (camelCase by convention).
- Names and ids MUST be percent-encoded in queries (`encodeURIComponent`); a name starting with `+` or `-` MUST encode its first character.
- The `_` prefix is **reserved for the protocol** (functions `_num`, `_len`, …; meta types `_type`, `_field`; pseudo-fields `_error`, `_etag`). User schemas MUST NOT define names starting with `_`.

### 2.2 Ids are client-grade

Ids are opaque strings. Clients MAY generate ids (UUID or similar) to create entities via `PATCH`. Servers MUST NOT rewrite or alias a client-supplied id: links the client built before the request must stay valid after it. A server-side sequence number, when needed, is an ordinary field — never the id.

## 3. Query language

### 3.1 Grammar

```
query   = fetch *( separator fetch )
fetch   = [ order ] name [ filter ] [ sub ]
order   = "+" / "-"
name    = 1*pchar                    ; percent-encoded
filter  = ( "=" / "!=" ) *( range "=" )
range   = value / [ value ] "@" [ value ]
value   = *pchar                     ; percent-encoded, "=" terminated
sub     = "(" query ")"
separator = ";"                      ; aliases, see §3.6
```

Characters `; ( ) = @ + -` (and separator aliases) are structural; occurrences inside names and values MUST be percent-encoded.

### 3.2 Semantics of a fetch

- `name` — fetch this field of the parent context. At the top level, `name` is a **type**: the fetch addresses that type's collection.
- `name(sub)` — additionally fetch fields of the linked entities (recursive, unlimited depth up to server limits).
- `name=v1=v2=` — **filter**: keep entities where the field value is in the given set. On the type position it filters by id, so `user=jin=` selects a single entity by primary key.
- `name!=v1=` — negative filter: exclude matching values.
- `+name` / `-name` — **order** ascending / descending. Priority of multiple orderings = their document order in the query.

Filters on different fields combine with AND. Ranges/values inside one filter combine with OR. A field mentioned with any predicate is also fetched (predicates imply selection).

### 3.3 Ranges

`a@b` is a **half-open interval `[a, b)`**: from `a` inclusive to `b` exclusive.

- `18@` — greater or equal 18.
- `@50` — strictly lower than 50.
- `0@100` — first hundred, when applied to `_num`.
- Exact value: `v=`. Union: `a@b=c=d@=` (interval OR value OR tail).

Bounds omitted on either side make the interval open on that side. Values are compared according to the field kind declared in metadata (§8): numerically for numeric kinds, codepoint-wise for strings, chronologically for dates.

> Rationale for half-open: it matches slice conventions programmers already hold (Python, iterators, SQL paging) and makes pagination idioms exact: `_num=0@100=` is the first page, `_num=100@200=` the second, no off-by-one. See errata §13.

### 3.4 Functions

Functions are `_`-prefixed pseudo-fields:

- `_num` — index of the entity in the fetched list **after ordering**, 0-based. Filter it to paginate: `_num=20@30=`.
- `_len(sub)` — count of entities matching each sub-fetch.
- `_sum(sub)` / `_min(sub)` / `_max(sub)` — aggregate over values of each sub-fetch.

Aggregation results are keyed by the canonical string of their sub-query (see reply examples in §4).

### 3.5 Canonical form

Two queries differing only in fetch order (except order-predicated fetches) are semantically identical, but HTTP caches key on the exact URI. Therefore:

- Serializers MUST emit the **canonical form**: within each sub-query, order-predicated fetches first (in priority order), then all remaining fetches sorted by codepoint.
- Servers MUST accept fetches in any order.

### 3.6 Compatibility separators

For backward compatibility with common URI shapes, parsers MUST also accept `& / ? # :` as fetch separators, equivalent to `;`. Thus `user=jin&age=100500` (query-string style) and `users/jin/comments` (path style) are valid HARP. Serializers MUST emit `;` only.

The characters `$` and `,` are unassigned and **reserved for future versions**.

## 4. Reply

A reply is a slice plus a `_query` echo section.

### 4.1 Model

- Four levels: `type → id → field → value`.
- Each fetched entity appears **exactly once** under its type/id, holding only the requested fields (union of fields across all fetches that reached it).
- Scalars are emitted as-is; relations as arrays of entity URIs.
- `_query` maps each top-level fetch (canonical string) to `reply`: the **ordered** list of matching entity URIs. Order in `reply` is the only ordering carrier; the slice itself is unordered.

### 4.2 JSON representation (normative reference)

```json
{
	"_query": {
		"pullRequest(-updateTime;+repository(_len(issue);name;owner(name);private);_num=20@30=;author(name);state=closed=merged=)": {
			"reply": [ "pullRequest=first=", "pullRequest=second=" ]
		}
	},
	"pullRequest": {
		"first": {
			"state": "closed",
			"repository": [ "repo=mol=" ],
			"author": [ "user=jin=" ],
			"updateTime": "2022-07-22"
		},
		"second": {
			"state": "merged",
			"repository": [ "repo=mol=" ],
			"author": [ "user=jin=" ],
			"updateTime": "2022-07-21"
		}
	},
	"repo": {
		"mol": {
			"name": "mol",
			"private": false,
			"owner": [ "user=jin=" ],
			"_len": { "issue": 100500 }
		}
	},
	"user": {
		"jin": { "name": "Jin" }
	}
}
```

### 4.3 Content negotiation

- `application/json` — normative reference representation. Default when the client sends no `Accept` or `*/*`.
- `application/xml` — XML representation with an attached XSLT viewer. Served to browsers naturally, since browser `Accept` headers request XML — this gives a zero-install human-readable API explorer.
- `application/x-tree;harp` — [Tree](https://github.com/nin-jin/tree.d) representation.

Servers MUST send `Vary: Accept`.

## 5. HTTP binding

| Method  | Transport   | Meaning                                    |
|---------|-------------|--------------------------------------------|
| `GET`   | HTTP, WS    | read a slice                               |
| `PATCH` | HTTP, WS    | idempotent write (merge), atomic           |
| `WATCH` | WS only     | read + subscribe to updates                |
| `FORGET`| WS only     | unsubscribe                                |

`POST` and `DELETE` are intentionally absent: creation is `PATCH` with a client-generated id (§2.2); deletion is modeled by hiding/unlinking (§7.5).

### 5.1 Status codes

| Code | Meaning | Cacheable |
|------|---------|-----------|
| 200  | complete success | yes |
| 207  | partial success: reply produced, but some entities/fields carry `_error` | no |
| 400  | malformed query, unknown type/field, invalid value for field kind | — |
| 401 / 403 | not authenticated / whole request denied | — |
| 409  | atomic write aborted (any entity failed; see §7.3) | — |
| 413  | query rate over server limit; body carries the computed rate | — |
| 429  | request frequency limit | — |

**Partial errors MUST NOT ride on a 200.** A 200 body is guaranteed error-free and safe for any shared cache; anything degraded is 207 and stays out of caches. (This is the deliberate opposite of GraphQL's errors-inside-200, which breaks HTTP caching and monitoring.)

### 5.2 Caching

- 200 GET replies are cacheable per standard HTTP rules.
- Replies to authenticated requests MUST carry `Cache-Control: private` (or stricter) — a shared cache must never serve one user's slice to another.
- Canonical query form (§3.5) maximizes cache hit rate.

### 5.3 Authentication

HARP defines no authentication of its own. Standard HTTP mechanisms (`Authorization` header, cookies) apply. Authorization failures scoped to particular entities or fields are expressed in-band via `_error` (§6) with a 207.

## 6. Errors

### 6.1 Structure

An error is an object with a machine-readable `code` (string, from the registry below), an optional human-readable `message`, and optional implementation `meta`.

Registry: `denied` (authorization), `absent` (no such entity), `gone` (entity physically deleted), `invalid` (value/schema violation), `conflict` (precondition failed, §7.4), `limit` (cost/size), `internal`.

### 6.2 Placement

Errors attach to the entity via the `_error` pseudo-field: a map from **field name** to error, where the empty key `""` means the entity as a whole:

```json
{
	"user": {
		"jin": {
			"name": "Jin",
			"_error": {
				"salary": { "code": "denied" }
			}
		},
		"boss": {
			"_error": {
				"": { "code": "denied", "message": "Access denied" }
			}
		}
	}
}
```

Query-level errors (a fetch that failed entirely) attach under `_query.<fetch>._error` in the same shape.

### 6.3 Dangling links

A link may point to an entity the server no longer stores. Servers MUST reply for such targets with `_error.code = "gone"` (or `absent`), not with transport failure. Clients MUST tolerate dangling links.

## 7. Writes: `PATCH`

### 7.1 Body

The `PATCH` body is a slice in the same representation as replies (content-type negotiated identically). The URI query names what is being written and is used for the echo reply.

```
PATCH /user=jin=;user=a1b2=

{
	"user": {
		"jin":  { "balance": 900 },
		"a1b2": { "name": "New Guy", "friend": [ "user=jin=" ] }
	}
}
```

### 7.2 Merge semantics

- A **present** field replaces its whole value (link lists are replaced whole; incremental list operations are out of scope of this version).
- `null` clears the field.
- An **absent** field is untouched.
- Writing to a nonexistent id **creates** the entity (upsert), subject to schema and authorization.
- Granularity of concurrency is the **field**: two PATCHes touching different fields of one entity both apply. Two PATCHes touching the same field resolve by **server arrival order** — last writer wins. HARP does not use client timestamps and does not claim conflict-free merge; that is the domain of CRDT sync layers underneath.

### 7.3 Atomicity

One `PATCH` request is one transaction: **all or nothing**, across all entities in the body. If any entity fails (denied, invalid, conflict), the server applies nothing, responds `409`, and the body locates every failure via `_error` per entity/field (§6). On success the server responds `200` with a reply slice echoing the applied state of the written entities.

### 7.4 Optimistic concurrency (optional)

Servers MAY support compare-and-swap via the `_etag` pseudo-field:

- `GET` replies include `_etag` per entity (opaque string, changes on every applied write to that entity).
- A `PATCH` body MAY carry `_etag` per entity as a precondition. Mismatch → error `conflict` → atomic abort (§7.3).

### 7.5 No DELETE

Physical deletion breaks referential integrity and is not a protocol operation. Model removal as hiding (a conventional field) and/or unlinking. When data is physically erased out-of-band (retention, GDPR), subsequent reads answer `_error.code = "gone"` (§6.3).

## 8. Metadata discovery

Metadata is served **by HARP itself**, through reserved meta-types. The explorer, autocomplete and code generators are ordinary HARP clients.

### 8.1 Meta-types

`_type` — one entity per domain type. Id = type name.

| field | kind | meaning |
|-------|------|---------|
| `name` | string | type name |
| `field` | link list → `_field` | fields of the type |

`_field` — one entity per field. Id = `type.field`.

| field | kind | meaning |
|-------|------|---------|
| `name` | string | field name |
| `kind` | string | `string` `int` `float` `bool` `date` `time` `link` |
| `target` | link list → `_type` | link target type(s), for `kind=link` |
| `many` | bool | list cardinality hint (link lists are always lists on the wire; `many=false` promises 0..1) |
| `filter` | bool | server accepts filter predicates on this field |
| `sort` | bool | server accepts order predicates on this field |
| `aggregate` | bool | field usable inside `_sum`/`_min`/`_max` |
| `deprecated` | string | non-empty = deprecation notice |

`_server` — single entity `_server=this=` with operational limits: `rateMax` (max query rate, §10), `depthMax`, `numMax` (max `_num` window).

**Capability flags are load-bearing**: not every field is indexed, and a server MUST be able to declare "not sortable" instead of timing out. Tooling MUST only offer predicates where flags allow.

### 8.2 Root discovery

`GET /` MUST be equivalent to `GET /_type(name)` — a cheap listing of all types. Deeper schema exploration uses explicit queries, e.g. `GET /_type(name;field(name;kind;target(name)))`.

### 8.3 Evolution

Adding types and fields is always backward-compatible. Removing or re-typing is a breaking change; the `deprecated` flag is the migration signal. HARP has no query-level versioning: version the schema, not the protocol.

## 9. Subscriptions: `WATCH` / `FORGET`

Over WebSocket, messages are JSON envelopes:

```json
{ "id": 1, "method": "WATCH", "uri": "user=jin=(name;friend(name))" }
{ "id": 1, "status": 200, "body": { /* full reply slice */ } }
{ "id": 1, "status": 200, "body": { /* delta slice */ } }
{ "id": 1, "method": "FORGET" }
```

- `id` is a client-chosen subscription key, unique per connection.
- The first response is the full reply. Subsequent messages are **delta slices in the exact same format**: only changed `type/id/field` triples. Normalization is what makes this possible — no separate diff format exists.
- When the membership of a fetch result changes, the server resends that fetch's `_query.….reply` list (the ordering carrier). Entities that left the view are simply no longer referenced; clients drop unreferenced cache entries at their discretion.
- No resume: a reconnect starts with a fresh `WATCH` and a full reply. Sequence numbers, backpressure and delta compression are explicitly out of scope of this version.
- `GET` and `PATCH` MAY also be sent over the same socket using the same envelope.

## 10. Cost control

A public GET endpoint with unbounded depth and joins is a DoS vector by default. Therefore:

- Servers MUST compute a **rate** (cost estimate) for every query before execution and reject over-limit queries with `413`, echoing the computed rate and the limit in the error body. The algorithm of [`$hyoo_harp_rate`](https://github.com/hyoo-ru/harp.hyoo.ru/tree/master/rate) is a non-normative baseline; servers MAY refine it.
- Limits are published in `_server=this=` (§8.1) so clients and tooling can pre-validate.
- Frequency limiting uses standard `429`.

## 11. Conformance vectors

Every normative behavior is backed by language-agnostic test vectors (JSON files in [`vector/`](./vector)), so independent implementations validate against the spec, not against each other. Vector shape:

```json
{
	"name": "half open range",
	"kind": "execute",
	"query": "user(age=18@30=;name)",
	"reply": { "_query": { "user(age=18@30=;name)": { "reply": [ "user=john=" ] } }, "user": { "john": { "age": 18, "name": "John" } } }
}
```

`kind` ∈ `parse` (query string → AST), `serialize` (AST → query string), `canon` (any spelling → canonical form, §3.5), `execute` (query + data graph → reply; `error` instead of `reply` means the query must be rejected), `patch` (`{ state, body, state2, reply }` for applied writes, `{ state, body, errors }` for atomic aborts — state must stay untouched). One JSON file per kind; `execute.json` carries a file-level shared `graph` which vectors may override with their own `data`. In error objects the `message` text is non-normative — conformance compares `code` only.

Comparison rules: object keys are unordered (compare structurally), arrays are ordered (`reply` lists and link lists carry ordering), scalars compare strictly without coercion. Details and the reference runner: [`vector/readme.md`](./vector/readme.md).

## 12. Design positions (short rationale)

- **Normalized reply** is the core value: it removes GraphQL's exponential duplication on deep fetches and makes the client cache a trivial `type/id/field` map instead of an Apollo-grade normalization engine.
- **Query in the URI** keeps the entire HTTP toolchain working: shared caches, CDNs, curl, browser address bar, server logs, link sharing.
- **Deliberately limited filter logic** (AND across fields, OR within a field) keeps queries statically optimizable and cost-computable. Arbitrary boolean trees are out of scope; model complex predicates as server-side derived fields.
- **Minimal type system** (scalars + links + capability flags). No unions, interfaces or non-null modifiers in this version — adding is cheap, removing is impossible.

## 13. Errata & changes vs $hyoo_harp readme

Differences from the upstream readme/article, all deliberate:

1. **Range semantics.** Upstream defines `1@5` as strictly-between (`2,3,4`), yet its own examples assume half-open (`_num=30@40` described as "10 issues", demo uses `_num=0@100` for the first hundred — both wrong under strictly-between). This spec fixes **half-open `[a, b)`** (§3.3), which matches the examples and standard slice conventions.
2. **`_error` is structured** (`code`/`message`, per-entity and per-field via keyed map, §6), not a bare string.
3. **Partial failures are `207`**, never `200` (§5.1) — protects HTTP caching, unlike GraphQL's errors-inside-200.
4. **Default representation is JSON**, not XML; browsers still get XML+XSLT naturally via their `Accept` header (§4.3).
5. **LWW clarified** as field-granular, server-arrival order; optional `_etag` CAS added (§7.2, §7.4). No client timestamps.
6. **`PATCH` atomicity made normative**: all-or-nothing with `409` (§7.3).
7. **Canonical query form** defined for cache friendliness (§3.5).
8. **Metadata format** defined via reserved `_type`/`_field`/`_server` meta-entities with capability flags (§8); upstream only stated that metadata queries exist.
9. **`WATCH` update format** defined as delta slices + reply-list resend (§9); upstream left it unspecified.
10. The 2022 article's `[ ] ,` syntax is superseded by the repo's `( ) ;` syntax; this spec standardizes the latter. `$` and `,` are reserved for the future.
