namespace $ {

	function same( left: unknown, right: unknown ) {
		return JSON.stringify( left ) === JSON.stringify( right )
	}

	export function $bog_harp_watch_delta(
		prev: $bog_harp_reply_slice,
		next: $bog_harp_reply_slice,
	): $bog_harp_reply_slice | null {

		const delta = {} as $bog_harp_reply_slice

		const query_prev = prev[ '_query' ] ?? {}
		for( const [ key, info ] of Object.entries( next[ '_query' ] ?? {} ) ) {
			if( same( query_prev[ key ], info ) ) continue
			const bag = delta[ '_query' ] = delta[ '_query' ] ?? {}
			bag[ key ] = info
		}

		for( const [ type, table ] of Object.entries( next ) ) {
			if( type === '_query' ) continue
			for( const [ id, ent ] of Object.entries( table ) ) {

				const ent_prev = prev[ type ]?.[ id ]

				const put = ( field: string, val: unknown )=> {
					const table_delta = delta[ type ] = delta[ type ] ?? {}
					const ent_delta = table_delta[ id ] = table_delta[ id ] ?? {}
					ent_delta[ field ] = val
				}

				for( const [ field, val ] of Object.entries( ent as Record< string, unknown > ) ) {
					if( ent_prev && same( ent_prev[ field ], val ) ) continue
					put( field, val )
				}

				if( ent_prev ) for( const field of Object.keys( ent_prev ) ) {
					if( field in ( ent as object ) ) continue
					put( field, null )
				}

			}
		}

		return Object.keys( delta ).length ? delta : null

	}

}
