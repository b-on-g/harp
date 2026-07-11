namespace $.$$ {

	const link_check = /^[^=\s]+=[^\s]*=$/

	export class $bog_harp_app extends $.$bog_harp_app {

		@ $mol_mem
		endpoint( next?: string ) {
			return this.$.$mol_state_arg.value( 'endpoint', next ) ?? super.endpoint()
		}

		@ $mol_mem
		result(): unknown {
			const uri = this.uri()
			if( !uri ) return null
			return this.$.$mol_fetch.json( `${ this.endpoint() }/${ uri }` )
		}

		result_text() {
			return '```json\n' + JSON.stringify( this.result(), null, '  ' ) + '\n```'
		}

		@ $mol_mem
		links(): string[] {

			const found = new Set< string >()

			const walk = ( val: unknown )=> {
				if( Array.isArray( val ) ) return val.forEach( walk )
				if( val && typeof val === 'object' ) return Object.values( val ).forEach( walk )
				if( typeof val === 'string' && link_check.test( val ) ) found.add( val )
			}

			walk( this.result() )

			return [ ... found ]
		}

		link_rows() {
			return this.links().map( uri => this.Link_row( uri ) )
		}

		link_title( id: string ) {
			return id
		}

		link_click( id: string, next?: Event ) {
			this.uri( id )
		}

		@ $mol_mem
		schema(): Record< string, { name: string, kind: string, target?: string }[] > {

			const slice = this.$.$mol_fetch.json(
				`${ this.endpoint() }/_type(name;field(name;kind;target(name)))`
			) as any

			const res = {} as Record< string, { name: string, kind: string, target?: string }[] >

			for( const [ id, info ] of Object.entries( slice?._field ?? {} ) as [ string, any ][] ) {

				const type = id.slice( 0, id.indexOf( '.' ) )
				const target = /^_type=(.*)=$/.exec( String( ( info.target ?? [] )[0] ?? '' ) )?.[1]

				const list = res[ type ] = res[ type ] ?? []
				list.push( {
					name: info.name,
					kind: info.kind,
					... target ? { target: decodeURIComponent( target ) } : {},
				} )

			}

			return res
		}

		@ $mol_mem
		hints(): Map< string, { path: string[], field: string } > {

			const res = new Map< string, { path: string[], field: string } >()
			const schema = this.schema()

			const walk = ( type: string, node: any, path: string[] )=> {
				for( const info of schema[ type ] ?? [] ) {

					if( !( info.name in node ) ) {
						res.set( [ ... path, info.name ].join( '.' ), { path, field: info.name } )
						continue
					}

					if( info.target ) walk( info.target, node[ info.name ], [ ... path, info.name ] )

				}
			}

			const ast = this.json() as any
			for( const type of Object.keys( ast ) ) {
				if( type === '' || type === '+' || type === '=' || type === '!=' ) continue
				walk( type, ast[ type ], [ type ] )
			}

			return res
		}

		hint_rows() {
			return [ ... this.hints().keys() ].map( id => this.Hint_row( id ) )
		}

		hint_title( id: string ) {
			return '+' + id
		}

		hint_click( id: string, next?: Event ) {

			const info = this.hints().get( id )
			if( !info ) return

			const ast = JSON.parse( JSON.stringify( this.json() ) )

			let node = ast as any
			for( const step of info.path ) node = node[ step ]
			node[ info.field ] = {}

			this.uri( $hyoo_harp_to_string( $bog_harp_reply_canon( ast ) ) )

		}

	}

}
