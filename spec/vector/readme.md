# HARP Conformance Vectors

Language-agnostic test vectors backing the normative behaviors of the [HARP spec](../readme.md). An implementation is conformant when it passes all vectors. Ports validate against these files, not against the reference implementation.

## Files

- `parse.json` — array of `{ name, kind: "parse", query, ast }`: query string → AST.
- `serialize.json` — array of `{ name, kind: "serialize", ast, query }`: AST → query string.
- `canon.json` — array of `{ name, kind: "canon", query, canonical }`: any spelling → canonical form (spec §3.5).
- `execute.json` — `{ graph, vectors }`: shared data graph plus an array of `{ name, kind: "execute", query, data?, reply }` or `{ ..., error }`. `data` defaults to the file-level `graph`. `error` means the implementation must reject the query (servers map this to HTTP 400).

## Comparison rules

- Object keys are **unordered**: compare structurally, not textually.
- Arrays are **ordered**: `reply` lists and link lists carry ordering, range lists carry precedence.
- Numbers, booleans and strings compare strictly (no coercion): `false ≠ "false"`, `7 ≠ "7"`.

## AST shape

The AST is the JSON form of a HARP query node: field names map to child nodes; structural keys are `"+"` (boolean: asc/desc order), `"="` and `"!="` (arrays of ranges, each range is `[exact]` or `[min, max]` with `""` for an open bound). All range bounds are strings; typing is applied at execution time per the target field.

## Running against the reference implementation

`vector.test.ts` here replays every vector through `$hyoo_harp_from_string` / `$hyoo_harp_to_string` / `$bog_harp_reply`:

```sh
npx mam bog/harp/spec/vector
```
