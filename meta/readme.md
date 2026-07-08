# $bog_harp_meta

Metadata discovery per [spec §8](../spec/readme.md#8-metadata-discovery): infers the schema graph (`_type` / `_field` / `_server` meta-entities) from a data slice, so the schema is served **by HARP itself** — explorers, autocomplete and code generators are ordinary HARP clients.

- field `kind` is inferred from values: `link` / `string` / `date` / `int` / `float` / `bool`
- `target` links point to `_type` entities — schema is HATEOAS-navigable
- capability flags (`filter` / `sort` / `aggregate`) are honest for the in-memory executor: everything is filterable and sortable, aggregation for numeric kinds
- server limits are published under `_server=this=`

`GET /` on the reference server is equivalent to `GET /_type(name)`.
