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

	}

}
