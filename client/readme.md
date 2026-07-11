# $bog_harp_client

Framework-agnostic HARP client with a **normalized cache**. Because HARP replies are already normalized (spec §4), the cache is a trivial `type → id → field → value` map — no Apollo-grade normalization engine needed. Plain `fetch` / `Promise` / `WebSocket`, zero dependencies, works in browsers and Node 22+.

```ts
const client = new $bog_harp_client( 'http://localhost:9181' )

const slice = await client.get( 'user=jin=(name;friend(name))' )
const uris = await client.list( 'user(age=18@=;name)' )    // ordered entity URIs
client.entity( 'user=jin=' )                                // cached fields of an entity

await client.patch({ user: { jin: { age: 31 } } })          // atomic write, echo merged into cache

const sub = client.watch( 'user(age=18@=;name)', ( body, status )=> {
	// first call: full reply; then: delta slices — both merged into cache automatically
} )
sub.forget()
```

Every reply, echo and delta merges into `client.cache` with the same three-line rule: field present → replace, `null` → clear. Entities are shared across queries, so two queries touching the same entity never disagree.

In a $mol app just wrap calls with `$mol_wire_sync` or use `$mol_fetch` directly — this client targets non-$mol codebases (React, plain TS) as an incremental adoption path.
