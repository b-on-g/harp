namespace $ {

	function flat( value: any ): any {
		if( Array.isArray( value ) ) return value.map( flat )
		if( value && typeof value === 'object' ) {
			const res = {} as any
			for( const key of Object.keys( value ).sort() ) res[ key ] = flat( value[ key ] )
			return res
		}
		return value
	}

	function check( name: string, actual: any, expected: any ) {
		const actual_str = JSON.stringify( flat( actual ), null, '\t' )
		const expected_str = JSON.stringify( flat( expected ), null, '\t' )
		if( actual_str === expected_str ) return
		$mol_fail( new Error( `HARP vector "${ name }" mismatch\nactual:\n${ actual_str }\nexpected:\n${ expected_str }` ) )
	}

	function load( kind: string ) {
		return JSON.parse( $mol_file.relative( `bog/harp/spec/vector/${ kind }.json` ).text() )
	}

	function scrub( value: any ): any {
		if( Array.isArray( value ) ) return value.map( scrub )
		if( value && typeof value === 'object' ) {
			const res = {} as any
			for( const key of Object.keys( value ) ) {
				if( key === 'message' && 'code' in value ) continue
				res[ key ] = scrub( value[ key ] )
			}
			return res
		}
		return value
	}

	$mol_test({

		'parse vectors'() {
			for( const vec of load( 'parse' ) ) {
				check( vec.name, $hyoo_harp_from_string( vec.query ), vec.ast )
			}
		},

		'serialize vectors'() {
			for( const vec of load( 'serialize' ) ) {
				check( vec.name, $hyoo_harp_to_string( vec.ast ), vec.query )
			}
		},

		'canon vectors'() {
			for( const vec of load( 'canon' ) ) {
				check(
					vec.name,
					$hyoo_harp_to_string( $bog_harp_reply_canon( $hyoo_harp_from_string( vec.query ) ) ),
					vec.canonical,
				)
			}
		},

		'patch vectors'() {

			for( const vec of load( 'patch' ) ) {

				const res = $bog_harp_patch( vec.body, vec.state )

				if( vec.errors ) {
					if( !res.failed ) $mol_fail( new Error( `HARP vector "${ vec.name }" expected to fail` ) )
					check( `${ vec.name } / errors`, scrub( res.slice ), scrub( vec.errors ) )
					check( `${ vec.name } / state untouched`, res.data, vec.state )
					continue
				}

				if( res.failed ) $mol_fail( new Error( `HARP vector "${ vec.name }" expected to apply` ) )
				check( `${ vec.name } / state`, res.data, vec.state2 )
				check( `${ vec.name } / reply`, res.slice, vec.reply )

			}

		},

		'execute vectors'() {

			const file = load( 'execute' )

			for( const vec of file.vectors ) {

				const data = vec.data ?? file.graph

				if( vec.error ) {
					let failed = false
					try { $bog_harp_reply( vec.query, data ) } catch( error ) { failed = true }
					if( !failed ) $mol_fail( new Error( `HARP vector "${ vec.name }" expected to fail with "${ vec.error }"` ) )
					continue
				}

				check( vec.name, $bog_harp_reply( vec.query, data ), vec.reply )

			}

		},

	})

}
