namespace $ {

	export type $bog_harp_reply_data = Record< string, Record< string, Record< string, unknown > > >

	export type $bog_harp_reply_error = {
		code: 'absent' | 'gone' | 'denied' | 'invalid' | 'conflict' | 'limit' | 'internal'
		message?: string
	}

	export type $bog_harp_reply_slice = Record< string, Record< string, any > >

	const aggs = new Set([ '_len', '_sum', '_min', '_max' ])

	function sub_node( node: $hyoo_harp_query, field: string ): $hyoo_harp_query {
		return ( node as any )[ field ]
	}

	function kids( node: $hyoo_harp_query ) {
		return Object.keys( node ).filter( key =>
			key !== '' && key !== '+' && key !== '=' && key !== '!='
		)
	}

	function uri_make( type: string, id: string ) {
		return `${ encodeURIComponent( type ) }=${ encodeURIComponent( id ) }=`
	}

	function uri_parse( uri: unknown ) {
		if( typeof uri !== 'string' ) return null
		const found = /^([^=]+)=(.*?)=?$/.exec( uri )
		if( !found ) return null
		return {
			type: decodeURIComponent( found[1] ),
			id: decodeURIComponent( found[2] ),
		}
	}

	function value_eq( val: unknown, bound: string ) {
		if( typeof val === 'number' ) return val === Number( bound )
		return String( val ) === bound
	}

	function bound_cmp( val: unknown, bound: string ) {
		if( typeof val === 'number' ) {
			const num = Number( bound )
			return val < num ? -1 : val > num ? 1 : 0
		}
		const str = String( val )
		return str < bound ? -1 : str > bound ? 1 : 0
	}

	function ranges_match( val: unknown, ranges: readonly ( readonly unknown[] )[] ): boolean {
		if( Array.isArray( val ) ) return val.some( item => ranges_match( item, ranges ) )
		if( val === undefined || val === null ) return false
		return ranges.some( range => {
			if( range.length === 1 ) return value_eq( val, String( range[0] ) )
			const min = String( range[0] ?? '' )
			const max = String( range[1] ?? '' )
			if( min !== '' && bound_cmp( val, min ) < 0 ) return false
			if( max !== '' && bound_cmp( val, max ) >= 0 ) return false
			return true
		} )
	}

	function order_cmp( left: unknown, right: unknown ) {
		if( Array.isArray( left ) ) left = left[0]
		if( Array.isArray( right ) ) right = right[0]
		const left_void = left === undefined || left === null
		const right_void = right === undefined || right === null
		if( left_void && right_void ) return 0
		if( left_void ) return 1
		if( right_void ) return -1
		if( typeof left === 'number' && typeof right === 'number' ) return left < right ? -1 : left > right ? 1 : 0
		const left_str = String( left )
		const right_str = String( right )
		return left_str < right_str ? -1 : left_str > right_str ? 1 : 0
	}

	function sift< Item >(
		items: readonly Item[],
		node: $hyoo_harp_query,
		read: ( item: Item, field: string )=> unknown,
	): Item[] {

		let list = [ ... items ]

		for( const field of kids( node ) ) {
			if( field === '_num' || aggs.has( field ) ) continue
			const child = sub_node( node, field )
			const pos = child['=']
			const neg = child['!=']
			if( pos ) list = list.filter( item => ranges_match( read( item, field ), pos ) )
			if( neg ) list = list.filter( item => !ranges_match( read( item, field ), neg ) )
		}

		const orders = kids( node ).filter( field => {
			if( field === '_num' || aggs.has( field ) ) return false
			return sub_node( node, field )['+'] !== undefined
		} )

		if( orders.length ) list.sort( ( left, right )=> {
			for( const field of orders ) {
				const sign = sub_node( node, field )['+'] ? 1 : -1
				const res = order_cmp( read( left, field ), read( right, field ) )
				if( res ) return res * sign
			}
			return 0
		} )

		const num = sub_node( node, '_num' )
		if( num?.['='] ) list = list.filter( ( item, index )=> ranges_match( index, num['=']! ) )

		return list
	}

	function canon_fields( node: $hyoo_harp_query ) {
		const fields = kids( node )
		const ordered = fields.filter( field => sub_node( node, field )['+'] !== undefined )
		const rest = fields.filter( field => sub_node( node, field )['+'] === undefined ).sort()
		return [ ... ordered, ... rest ]
	}

	export function $bog_harp_reply_canon( query: $hyoo_harp_query ): $hyoo_harp_query {

		const res = {} as any

		for( const key of [ '+', '=', '!=' ] as const ) {
			if( key in query ) res[ key ] = query[ key ]
		}

		for( const field of canon_fields( query ) ) {
			res[ field ] = $bog_harp_reply_canon( sub_node( query, field ) )
		}

		return res
	}

	function link_read( data: $bog_harp_reply_data ) {
		return ( uri: string, field: string )=> {
			const point = uri_parse( uri )!
			return data[ point.type ]?.[ point.id ]?.[ field ]
		}
	}

	function scalars(
		data: $bog_harp_reply_data,
		type: string,
		id: string,
		node: $hyoo_harp_query,
	): unknown[] {

		const entity = data[ type ]?.[ id ]
		if( !entity ) return []

		const res = [] as unknown[]

		for( const field of kids( node ) ) {

			if( field === '_num' || aggs.has( field ) ) continue

			const child = sub_node( node, field )
			if( child['='] || child['!='] ) continue

			const val = entity[ field ]
			if( val === undefined ) continue

			if( Array.isArray( val ) && val.every( item => uri_parse( item ) ) ) {

				const links = sift( val as string[], child, link_read( data ) )

				const deep = kids( child ).filter( sub => {
					if( sub === '_num' || aggs.has( sub ) ) return false
					const grand = sub_node( child, sub )
					return !( grand['='] || grand['!='] )
				} )

				if( deep.length ) {
					for( const uri of links ) {
						const point = uri_parse( uri )!
						res.push( ... scalars( data, point.type, point.id, child ) )
					}
				} else {
					res.push( ... links )
				}

			} else {
				res.push( val )
			}

		}

		return res
	}

	function agg_calc( kind: string, values: unknown[] ): unknown {
		switch( kind ) {
			case '_len': return values.length
			case '_sum': return values.reduce( ( sum: number, val )=> sum + ( typeof val === 'number' ? val : Number( val ) || 0 ), 0 )
			case '_min': {
				let res = undefined as unknown
				for( const val of values ) if( res === undefined || order_cmp( val, res ) < 0 ) res = val
				return res ?? null
			}
			case '_max': {
				let res = undefined as unknown
				for( const val of values ) if( res === undefined || order_cmp( val, res ) > 0 ) res = val
				return res ?? null
			}
		}
	}

	function entity_error( ent: any, field: string, code: $bog_harp_reply_error['code'] ) {
		const errors = ent[ '_error' ] = ent[ '_error' ] ?? {}
		errors[ field ] = { code }
	}

	function emit(
		out: $bog_harp_reply_slice,
		data: $bog_harp_reply_data,
		type: string,
		id: string,
		node: $hyoo_harp_query,
	) {

		const table = out[ type ] = out[ type ] ?? {}
		const ent = table[ id ] = table[ id ] ?? {}

		const entity = data[ type ]?.[ id ]
		if( !entity ) return entity_error( ent, '', 'absent' )

		for( const field of canon_fields( node ) ) {

			if( field === '_num' ) continue

			const child = sub_node( node, field )

			if( aggs.has( field ) ) {
				const bag = ent[ field ] = ent[ field ] ?? {}
				for( const sub of kids( child ) ) {
					const single = { [ sub ]: sub_node( child, sub ) } as $hyoo_harp_query
					const key = $hyoo_harp_to_string( $bog_harp_reply_canon( single ) )
					bag[ key ] = agg_calc( field, scalars( data, type, id, single ) )
				}
				continue
			}

			if( !( field in entity ) ) {
				entity_error( ent, field, 'absent' )
				continue
			}

			const val = entity[ field ]

			if( Array.isArray( val ) && val.every( item => uri_parse( item ) ) ) {

				const links = sift( val as string[], child, link_read( data ) )

				ent[ field ] = links

				if( kids( child ).some( sub => sub !== '_num' ) ) {
					for( const uri of links ) {
						const point = uri_parse( uri )!
						emit( out, data, point.type, point.id, child )
					}
				}

			} else {
				ent[ field ] = val
			}

		}

	}

	export function $bog_harp_reply(
		query: string | $hyoo_harp_query,
		data: $bog_harp_reply_data,
	): $bog_harp_reply_slice {

		const ast = typeof query === 'string' ? $hyoo_harp_from_string( query ) : query

		const out = { _query: {} } as $bog_harp_reply_slice

		for( const type of kids( ast ) ) {

			const node = sub_node( ast, type )

			const table = data[ type ]
			if( !table ) $mol_fail( new Error( `HARP: unknown type "${ type }"` ) )

			let ids = Object.keys( table )

			const pos = node['=']
			const neg = node['!=']
			if( pos ) ids = ids.filter( id => ranges_match( id, pos ) )
			if( neg ) ids = ids.filter( id => !ranges_match( id, neg ) )

			ids = sift( ids, node, ( id, field )=> table[ id ][ field ] )

			const key = $hyoo_harp_to_string( $bog_harp_reply_canon({ [ type ]: node } as $hyoo_harp_query ) )
			out[ '_query' ][ key ] = { reply: ids.map( id => uri_make( type, id ) ) }

			for( const id of ids ) emit( out, data, type, id, node )

			for( const range of pos ?? [] ) {
				if( range.length !== 1 ) continue
				const id = String( range[0] )
				if( table[ id ] ) continue
				emit( out, data, type, id, node )
			}

		}

		return out
	}

}
