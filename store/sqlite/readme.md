# $bog_harp_store_sqlite

Turnkey SQLite adapter: point HARP at an existing SQLite database and get an API. Uses the built-in `node:sqlite` (Node 22.5+), zero npm dependencies.

Mapping:

- table → **type**
- primary key column (or implicit `rowid`) → **id**
- foreign key column → **link list** (`[ "target=id=" ]`)
- other columns → scalar fields; SQL `NULL` → absent field

Current scope: read-only snapshot loaded into memory — right for demos and small datasets. Query push-down to SQL and write-back for `PATCH` are future work.

## Usage

```ts
const data = $bog_harp_store_sqlite( 'path/to/base.sqlite' )
const slice = $bog_harp_reply( 'post(title;author(name))', data )
```

Or serve it over HTTP:

```sh
npx mam bog/harp/serve/demo
HARP_SERVE=1 HARP_SQLITE=path/to/base.sqlite node bog/harp/serve/demo/-/node.js
```
