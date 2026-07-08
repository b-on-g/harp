namespace $ {

	export type $bog_harp_serve_result = {
		status: number
		mime: string
		headers: Record< string, string >
		body: string
	}

	const aggs = new Set([ '_len', '_sum', '_min', '_max' ])

	function slice_failed( slice: any ): boolean {
		if( !slice || typeof slice !== 'object' ) return false
		for( const key of Object.keys( slice ) ) {
			if( key === '_error' ) return true
			if( slice_failed( slice[ key ] ) ) return true
		}
		return false
	}

	function xml_escape( str: string ) {
		return str.replace( /[&<>]/g, char => char === '&' ? '&amp;' : char === '<' ? '&lt;' : '&gt;' )
	}

	function xml_attr( str: string ) {
		return xml_escape( str ).replace( /"/g, '&quot;' )
	}

	export function $bog_harp_serve_xml( slice: $bog_harp_reply_slice ): string {

		const lines = [ '<?xml version="1.0"?>', '<slice xmlns="https://harp.hyoo.ru">' ]

		for( const [ query, info ] of Object.entries( slice[ '_query' ] ?? {} ) ) {
			lines.push( `\t<_query id="${ xml_attr( query ) }">` )
			for( const uri of ( info as any ).reply ?? [] ) lines.push( `\t\t<reply>${ xml_escape( uri ) }</reply>` )
			lines.push( `\t</_query>` )
		}

		for( const [ type, table ] of Object.entries( slice ) ) {
			if( type === '_query' ) continue
			for( const [ id, ent ] of Object.entries( table ) ) {

				const uri = `${ encodeURIComponent( type ) }=${ encodeURIComponent( id ) }=`
				lines.push( `\t<${ type } id="${ xml_attr( uri ) }">` )

				for( const [ field, val ] of Object.entries( ent as Record< string, any > ) ) {

					if( field === '_error' ) {
						for( const [ at, error ] of Object.entries( val as Record< string, any > ) ) {
							const message = ( error as any ).message
							lines.push( message
								? `\t\t<_error field="${ xml_attr( at ) }" code="${ xml_attr( error.code ) }">${ xml_escape( message ) }</_error>`
								: `\t\t<_error field="${ xml_attr( at ) }" code="${ xml_attr( error.code ) }"/>`
							)
						}
						continue
					}

					if( aggs.has( field ) ) {
						for( const [ query, value ] of Object.entries( val as Record< string, any > ) ) {
							lines.push( `\t\t<${ field } query="${ xml_attr( query ) }">${ xml_escape( String( value ) ) }</${ field }>` )
						}
						continue
					}

					if( Array.isArray( val ) ) {
						for( const link of val ) lines.push( `\t\t<${ field }>${ xml_escape( String( link ) ) }</${ field }>` )
						continue
					}

					lines.push( `\t\t<${ field }>${ xml_escape( String( val ) ) }</${ field }>` )

				}

				lines.push( `\t</${ type }>` )

			}
		}

		lines.push( '</slice>' )
		return lines.join( '\n' ) + '\n'
	}

	export function $bog_harp_serve_tree( slice: $bog_harp_reply_slice ): string {

		const lines = [ '_query' ]

		for( const [ query, info ] of Object.entries( slice[ '_query' ] ?? {} ) ) {
			lines.push( `\t\\${ query }` )
			lines.push( '\t\treply' )
			for( const uri of ( info as any ).reply ?? [] ) lines.push( `\t\t\t${ uri }` )
		}

		for( const [ type, table ] of Object.entries( slice ) ) {
			if( type === '_query' ) continue
			lines.push( type )
			for( const [ id, ent ] of Object.entries( table ) ) {

				lines.push( `\t\\${ id }` )

				for( const [ field, val ] of Object.entries( ent as Record< string, any > ) ) {

					if( field === '_error' ) {
						lines.push( '\t\t_error' )
						for( const [ at, error ] of Object.entries( val as Record< string, any > ) ) {
							lines.push( `\t\t\t\\${ at }` )
							lines.push( `\t\t\t\tcode ${ ( error as any ).code }` )
							if( ( error as any ).message ) lines.push( `\t\t\t\tmessage \\${ ( error as any ).message }` )
						}
						continue
					}

					if( aggs.has( field ) ) {
						for( const [ query, value ] of Object.entries( val as Record< string, any > ) ) {
							lines.push( `\t\t${ field } ${ query } ${ String( value ) }` )
						}
						continue
					}

					if( Array.isArray( val ) ) {
						if( val.length === 1 ) lines.push( `\t\t${ field } ${ String( val[0] ) }` )
						else {
							lines.push( `\t\t${ field }` )
							for( const link of val ) lines.push( `\t\t\t${ String( link ) }` )
						}
						continue
					}

					if( typeof val === 'string' ) {
						if( val.includes( '\n' ) ) {
							lines.push( `\t\t${ field }` )
							for( const line of val.split( '\n' ) ) lines.push( `\t\t\t\\${ line }` )
						} else {
							lines.push( `\t\t${ field } \\${ val }` )
						}
						continue
					}

					lines.push( `\t\t${ field } ${ String( val ) }` )

				}

			}
		}

		return lines.join( '\n' ) + '\n'
	}

	function headers_common() {
		return {
			'Vary': 'Accept',
			'Access-Control-Allow-Origin': '*',
		}
	}

	export function $bog_harp_serve_patch(
		uri: string,
		body_text: string,
		data: $bog_harp_reply_data,
	): { result: $bog_harp_serve_result, data: $bog_harp_reply_data } {

		const headers = headers_common()

		const fail = ( status: number, code: string, message: string )=> ({
			data,
			result: {
				status,
				mime: 'application/json',
				headers,
				body: JSON.stringify( { _error: { '': { code, message } } }, null, '\t' ) + '\n',
			},
		})

		let query: string
		try {
			query = $hyoo_harp_to_string( $bog_harp_reply_canon( $hyoo_harp_from_string( uri ) ) )
		} catch( error: any ) {
			if( $mol_fail_catch( error ) ) return fail( 400, 'invalid', error.message )
			throw error
		}

		let body: any
		try {
			body = JSON.parse( body_text )
		} catch( error: any ) {
			if( $mol_fail_catch( error ) ) return fail( 400, 'invalid', `Request body is not a valid JSON: ${ error.message }` )
			throw error
		}

		if( !body || typeof body !== 'object' || Array.isArray( body ) ) {
			return fail( 400, 'invalid', 'Request body must be a normalized slice object' )
		}

		const res = $bog_harp_patch( body, data )

		const written = [] as string[]
		if( !res.failed ) for( const [ type, table ] of Object.entries( body as $bog_harp_reply_data ) ) {
			for( const id of Object.keys( table ) ) {
				written.push( `${ encodeURIComponent( type ) }=${ encodeURIComponent( id ) }=` )
			}
		}

		const slice = {
			_query: { [ query ]: { reply: written } },
			... res.slice,
		}

		return {
			data: res.data,
			result: {
				status: res.failed ? 409 : 200,
				mime: 'application/json',
				headers,
				body: JSON.stringify( slice, null, '\t' ) + '\n',
			},
		}

	}

	export function $bog_harp_serve_response(
		uri: string,
		data: $bog_harp_reply_data,
		accept = '',
		rate_max = 1000,
	): $bog_harp_serve_result {

		const headers = headers_common()

		const fail = ( status: number, code: string, message: string ): $bog_harp_serve_result => ({
			status,
			mime: 'application/json',
			headers,
			body: JSON.stringify( { _error: { '': { code, message } } }, null, '\t' ) + '\n',
		})

		let ast: $hyoo_harp_query
		try {
			ast = $hyoo_harp_from_string( uri )
		} catch( error: any ) {
			if( $mol_fail_catch( error ) ) return fail( 400, 'invalid', error.message )
			throw error
		}

		const rate = $hyoo_harp_rate( ast )
		if( rate > rate_max ) return fail( 413, 'limit', `Query rate ${ rate } is over the limit ${ rate_max }` )

		let slice: $bog_harp_reply_slice
		try {
			slice = $bog_harp_reply( ast, data )
		} catch( error: any ) {
			if( $mol_fail_catch( error ) ) {
				if( /^HARP: unknown type/.test( error.message ) ) return fail( 400, 'invalid', error.message )
				return fail( 500, 'internal', error.message )
			}
			throw error
		}

		const status = slice_failed( slice ) ? 207 : 200

		if( accept.includes( 'tree' ) ) return {
			status,
			mime: 'application/x-tree;harp',
			headers,
			body: $bog_harp_serve_tree( slice ),
		}

		if( /xml|html/.test( accept ) ) return {
			status,
			mime: 'application/xml',
			headers,
			body: $bog_harp_serve_xml( slice ),
		}

		return {
			status,
			mime: 'application/json',
			headers,
			body: JSON.stringify( slice, null, '\t' ) + '\n',
		}

	}

	export class $bog_harp_serve extends $mol_object2 {

		static data(): $bog_harp_reply_data { return {} }
		static port() { return 9181 }
		static rate_max() { return 1000 }

		static start() {

			let state = this.data()

			const send = ( res: any, reply: $bog_harp_serve_result )=> {
				res.writeHead( reply.status, {
					'Content-Type': `${ reply.mime }; charset=utf-8`,
					... reply.headers,
				} )
				res.end( reply.body )
			}

			const server = $node.http.createServer( ( req: any, res: any )=> {

				const uri = String( req.url ?? '/' ).replace( /^\//, '' )

				if( req.method === 'OPTIONS' ) {
					res.writeHead( 204, {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Accept',
					} )
					return res.end()
				}

				if( req.method === 'GET' ) {
					return send( res, $bog_harp_serve_response( uri, state, req.headers.accept ?? '', this.rate_max() ) )
				}

				if( req.method === 'PATCH' ) {
					req.setEncoding( 'utf8' )
					let text = ''
					req.on( 'data', ( chunk: string )=> text += chunk )
					req.on( 'end', ()=> {
						const patched = $bog_harp_serve_patch( uri, text, state )
						state = patched.data
						send( res, patched.result )
					} )
					return
				}

				res.writeHead( 501, {
					'Content-Type': 'application/json; charset=utf-8',
					'Access-Control-Allow-Origin': '*',
				} )
				res.end( JSON.stringify( { _error: { '': { code: 'invalid', message: `Method ${ req.method } is not supported yet` } } } ) + '\n' )

			} )

			server.listen( this.port(), ()=> console.log( `${ this.name }: http://localhost:${ this.port() }/` ) )

			return server
		}

	}

}
