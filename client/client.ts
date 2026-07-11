namespace $ {

	export type $bog_harp_client_cache = Record< string, Record< string, Record< string, unknown > > >

	const uri_check = /^([^=]+)=(.*?)=?$/

	export function $bog_harp_client_merge(
		cache: $bog_harp_client_cache,
		slice: $bog_harp_reply_slice,
	) {

		for( const [ type, table ] of Object.entries( slice ?? {} ) ) {

			if( type === '_query' ) continue

			const store = cache[ type ] = cache[ type ] ?? {}

			for( const [ id, ent ] of Object.entries( table ) ) {

				const fresh = store[ id ] = store[ id ] ?? {}

				for( const [ field, val ] of Object.entries( ent as Record< string, unknown > ) ) {
					if( val === null ) delete fresh[ field ]
					else fresh[ field ] = val
				}

			}

		}

		return cache
	}

	export class $bog_harp_client {

		cache = {} as $bog_harp_client_cache

		constructor( readonly endpoint: string ) {}

		protected async request( method: string, uri: string, body?: unknown ) {

			const res = await fetch( `${ this.endpoint }/${ uri }`, {
				method,
				headers: { 'Accept': 'application/json' },
				body: body === undefined ? undefined : JSON.stringify( body ),
			} )

			const slice = await res.json() as $bog_harp_reply_slice

			if( res.status < 400 ) $bog_harp_client_merge( this.cache, slice )

			return { status: res.status, slice }
		}

		async get( query: string ) {
			const { status, slice } = await this.request( 'GET', query )
			if( status >= 400 ) throw new Error( ( slice as any )?._error?.[ '' ]?.message ?? `HARP: status ${ status }` )
			return slice
		}

		async list( query: string ) {
			const slice = await this.get( query )
			const fetches = Object.values( slice[ '_query' ] ?? {} )
			return ( fetches[0] as any )?.reply as string[] ?? []
		}

		async patch( body: $bog_harp_client_cache ) {

			const uri = Object.entries( body ).map( ( [ type, table ] )=>
				`${ encodeURIComponent( type ) }=${ Object.keys( table ).map( id => encodeURIComponent( id ) + '=' ).join( '' ) }`
			).join( ';' )

			const { status, slice } = await this.request( 'PATCH', uri, body )
			if( status >= 400 ) throw Object.assign( new Error( `HARP: patch rejected with status ${ status }` ), { slice } )
			return slice
		}

		entity( uri: string ) {
			const found = uri_check.exec( uri )
			if( !found ) return undefined
			return this.cache[ decodeURIComponent( found[1] ) ]?.[ decodeURIComponent( found[2] ) ]
		}

		protected watch_id = 0

		watch(
			query: string,
			listener?: ( body: $bog_harp_reply_slice, status: number )=> void,
		) {

			const sock = new WebSocket( this.endpoint.replace( /^http/, 'ws' ) )
			const id = ++ this.watch_id

			sock.onopen = ()=> sock.send( JSON.stringify( { id, method: 'WATCH', uri: query } ) )

			sock.onmessage = ( event: any )=> {
				const envelope = JSON.parse( String( event.data ) )
				if( envelope.status < 400 ) $bog_harp_client_merge( this.cache, envelope.body )
				listener?.( envelope.body, envelope.status )
			}

			return {
				forget: ()=> {
					try { sock.send( JSON.stringify( { id, method: 'FORGET' } ) ) } catch {}
					sock.close()
				},
			}
		}

	}

}
