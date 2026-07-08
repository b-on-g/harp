namespace $ {

	const link_parse = /^([^=]+)=.*=$/

	function kind_pick( kinds: Set< string > ) {
		for( const kind of [ 'link', 'string', 'date', 'float', 'int', 'bool' ] ) {
			if( kinds.has( kind ) ) return kind
		}
		return 'string'
	}

	export function $bog_harp_meta(
		data: $bog_harp_reply_data,
		limits: { rate_max?: number } = {},
	): $bog_harp_reply_data {

		const types = {} as Record< string, Record< string, unknown > >
		const fields = {} as Record< string, Record< string, unknown > >

		for( const [ type, table ] of Object.entries( data ) ) {

			if( type.startsWith( '_' ) ) continue

			const info = new Map< string, { kinds: Set< string >, targets: Set< string >, many: boolean } >()

			for( const ent of Object.values( table ) ) {
				for( const [ field, val ] of Object.entries( ent ) ) {

					if( field.startsWith( '_' ) ) continue
					if( val === undefined || val === null ) continue

					let rec = info.get( field )
					if( !rec ) info.set( field, rec = { kinds: new Set(), targets: new Set(), many: false } )

					if( Array.isArray( val ) ) {
						rec.kinds.add( 'link' )
						if( val.length > 1 ) rec.many = true
						for( const uri of val ) {
							const target = link_parse.exec( String( uri ) )?.[1]
							if( target ) rec.targets.add( decodeURIComponent( target ) )
						}
					}
					else if( typeof val === 'number' ) rec.kinds.add( Number.isInteger( val ) ? 'int' : 'float' )
					else if( typeof val === 'boolean' ) rec.kinds.add( 'bool' )
					else if( typeof val === 'string' ) rec.kinds.add( /^\d{4}-\d{2}-\d{2}$/.test( val ) ? 'date' : 'string' )

				}
			}

			types[ type ] = {
				name: type,
				field: [ ... info.keys() ].map( field => `_field=${ encodeURIComponent( `${ type }.${ field }` ) }=` ),
			}

			for( const [ field, rec ] of info ) {

				const kind = kind_pick( rec.kinds )

				const meta = {
					name: field,
					kind,
					many: rec.many,
					filter: true,
					sort: true,
					aggregate: kind === 'int' || kind === 'float',
				} as Record< string, unknown >

				if( rec.targets.size ) {
					meta[ 'target' ] = [ ... rec.targets ].map( target => `_type=${ encodeURIComponent( target ) }=` )
				}

				fields[ `${ type }.${ field }` ] = meta

			}

		}

		const server = {} as Record< string, unknown >
		if( limits.rate_max !== undefined ) server[ 'rateMax' ] = limits.rate_max

		return {
			_type: types,
			_field: fields,
			_server: { this: server },
		}

	}

}
