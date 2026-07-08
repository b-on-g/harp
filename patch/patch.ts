namespace $ {

	export type $bog_harp_patch_result = {
		data: $bog_harp_reply_data
		slice: $bog_harp_reply_slice
		failed: boolean
	}

	const uri_check = /^[^=]+=.*=$/

	export function $bog_harp_patch(
		body: $bog_harp_reply_data,
		data: $bog_harp_reply_data,
	): $bog_harp_patch_result {

		const errors = {} as $bog_harp_reply_slice
		let failed = false

		const fail = ( type: string, id: string, field: string, code: string, message: string )=> {
			failed = true
			const table = errors[ type ] = errors[ type ] ?? {}
			const ent = table[ id ] = table[ id ] ?? {}
			const bag = ent[ '_error' ] = ent[ '_error' ] ?? {}
			bag[ field ] = { code, message }
		}

		for( const [ type, table ] of Object.entries( body ) ) {
			for( const [ id, ent ] of Object.entries( table ) ) {

				if( type.startsWith( '_' ) ) {
					fail( type, id, '', 'invalid', `Type name "${ type }" is reserved` )
					continue
				}

				if( !id ) {
					fail( type, id, '', 'invalid', 'Entity id must not be empty' )
					continue
				}

				const prev = data[ type ]?.[ id ]

				for( const [ field, val ] of Object.entries( ent ) ) {

					if( field === '_etag' ) {
						const current = prev?.[ '_etag' ]
						if( current === undefined || String( val ) !== String( current ) ) {
							fail( type, id, '_etag', 'conflict', `Precondition failed for "${ type }=${ id }="` )
						}
						continue
					}

					if( field.startsWith( '_' ) ) {
						fail( type, id, field, 'invalid', `Field name "${ field }" is reserved` )
						continue
					}

					if( val === null ) continue

					if( Array.isArray( val ) ) {
						if( !val.every( item => typeof item === 'string' && uri_check.test( item ) ) ) {
							fail( type, id, field, 'invalid', 'Link list of entity URIs expected' )
						}
						continue
					}

					if( typeof val === 'object' ) {
						fail( type, id, field, 'invalid', 'Scalar or link list expected' )
					}

				}

			}
		}

		if( failed ) return { data, slice: errors, failed: true }

		const next = { ... data }
		const echo = {} as $bog_harp_reply_slice

		for( const [ type, table ] of Object.entries( body ) ) {

			const store = next[ type ] = { ... next[ type ] }
			const out = echo[ type ] = echo[ type ] ?? {}

			for( const [ id, ent ] of Object.entries( table ) ) {

				const prev = store[ id ] ?? {}
				const fresh = { ... prev }

				for( const [ field, val ] of Object.entries( ent ) ) {
					if( field === '_etag' ) continue
					if( val === null ) delete fresh[ field ]
					else fresh[ field ] = val
				}

				fresh[ '_etag' ] = String( ( Number( prev[ '_etag' ] ) || 0 ) + 1 )
				store[ id ] = fresh

				const reply = out[ id ] = out[ id ] ?? {}
				for( const field of Object.keys( ent ) ) {
					if( field === '_etag' ) continue
					reply[ field ] = fresh[ field ] ?? null
				}
				reply[ '_etag' ] = fresh[ '_etag' ]

			}

		}

		return { data: next, slice: echo, failed: false }

	}

}
