namespace $ {

	export function $bog_harp_store_sqlite( source: string | { prepare( sql: string ): any } ): $bog_harp_reply_data {

		const db = typeof source === 'string'
			? new ( $node[ 'node:sqlite' ].DatabaseSync )( source )
			: source

		const data = {} as $bog_harp_reply_data

		const tables = db.prepare(
			`SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
		).all() as { name: string }[]

		for( const { name } of tables ) {

			const cols = db.prepare( `PRAGMA table_info("${ name }")` ).all() as { name: string, pk: number }[]
			const pk = cols.find( col => col.pk === 1 )?.name ?? 'rowid'

			const links = new Map< string, string >()
			for( const fk of db.prepare( `PRAGMA foreign_key_list("${ name }")` ).all() as { from: string, table: string }[] ) {
				links.set( fk.from, fk.table )
			}

			const table = data[ name ] = {} as Record< string, Record< string, unknown > >

			const rows = db.prepare(
				`SELECT ${ pk === 'rowid' ? 'rowid, ' : '' }* FROM "${ name }"`
			).all() as Record< string, unknown >[]

			for( const row of rows ) {

				const id = String( row[ pk ] )
				const ent = table[ id ] = {} as Record< string, unknown >

				for( const col of Object.keys( row ) ) {

					if( col === pk ) continue

					const val = row[ col ]
					if( val === null ) continue

					const target = links.get( col )
					ent[ col ] = target
						? [ `${ encodeURIComponent( target ) }=${ encodeURIComponent( String( val ) ) }=` ]
						: val

				}

			}

		}

		return data
	}

}
