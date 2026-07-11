namespace $ {

	function rng_make( seed: number ) {
		return ()=> {
			seed = seed + 0x6D2B79F5 | 0
			let t = Math.imul( seed ^ seed >>> 15, 1 | seed )
			t = t + Math.imul( t ^ t >>> 7, 61 | t ) ^ t
			return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296
		}
	}

	const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.'

	const uri_id = ( uri: string )=> decodeURIComponent( /^([^=]+)=(.*?)=?$/.exec( uri )![2] )

	export function $bog_harp_bench_data_pulls(): $bog_harp_reply_data {

		const rnd = rng_make( 1337 )
		const pick = ( list: string[] )=> list[ Math.floor( rnd() * list.length ) ]

		const data = { user: {}, repo: {}, pullRequest: {} } as $bog_harp_reply_data

		for( let i = 0; i < 10; ++ i ) data[ 'user' ][ `u${ i }` ] = {
			name: `User Number ${ i }`,
			avatar: `https://avatars.example.com/u/${ i }.webp`,
			bio: lorem,
			email: `user${ i }@example.com`,
			createdAt: '2020-01-01',
		}

		for( let i = 0; i < 5; ++ i ) data[ 'repo' ][ `r${ i }` ] = {
			name: `repository-${ i }`,
			private: rnd() < 0.5,
			stars: Math.floor( rnd() * 10000 ),
			description: lorem.slice( 0, 80 ),
			owner: [ `user=u${ i * 2 }=` ],
			createdAt: '2021-06-15',
		}

		for( let i = 0; i < 200; ++ i ) data[ 'pullRequest' ][ `p${ i }` ] = {
			state: pick([ 'open', 'closed', 'merged' ]),
			title: `Fix issue #${ Math.floor( rnd() * 5000 ) } in the ${ pick([ 'parser', 'renderer', 'scheduler' ]) }`,
			updateTime: `2026-06-${ String( 1 + Math.floor( rnd() * 28 ) ).padStart( 2, '0' ) }`,
			repository: [ `repo=r${ Math.floor( rnd() * 5 ) }=` ],
			author: [ `user=u${ Math.floor( rnd() * 10 ) }=` ],
			createdAt: '2026-05-01',
		}

		return data
	}

	export function $bog_harp_bench_data_friends(): $bog_harp_reply_data {

		const rnd = rng_make( 4242 )

		const data = { user: {} } as $bog_harp_reply_data

		for( let i = 0; i < 100; ++ i ) {

			const friends = new Set< string >()
			while( friends.size < 10 ) {
				const other = Math.floor( rnd() * 100 )
				if( other !== i ) friends.add( `user=f${ other }=` )
			}

			data[ 'user' ][ `f${ i }` ] = {
				name: `Friend Number ${ i }`,
				avatar: `https://avatars.example.com/f/${ i }.webp`,
				bio: lorem,
				email: `friend${ i }@example.com`,
				createdAt: '2019-03-03',
				friend: [ ... friends ],
			}

		}

		return data
	}

	export type $bog_harp_bench_plan = {
		type: string
		fields: string[]
		links: Record< string, $bog_harp_bench_plan >
	}

	function gql_project(
		data: $bog_harp_reply_data,
		id: string,
		plan: $bog_harp_bench_plan,
	): Record< string, unknown > {

		const src = data[ plan.type ][ id ]
		const res = { id } as Record< string, unknown >

		for( const field of plan.fields ) res[ field ] = src[ field ]

		for( const [ field, sub ] of Object.entries( plan.links ) ) {
			res[ field ] = ( src[ field ] as string[] ).map( uri => gql_project( data, uri_id( uri ), sub ) )
		}

		return res
	}

	function gql_count( tree: unknown ): number {
		if( Array.isArray( tree ) ) return tree.reduce( ( sum: number, item )=> sum + gql_count( item ), 0 )
		if( tree && typeof tree === 'object' ) {
			return 1 + Object.values( tree ).reduce( ( sum: number, val )=> sum + ( typeof val === 'object' && val ? gql_count( val ) : 0 ), 0 )
		}
		return 0
	}

	function rest_resource( data: $bog_harp_reply_data, type: string, id: string ) {

		const src = data[ type ][ id ]
		const res = { id } as Record< string, unknown >

		for( const [ field, val ] of Object.entries( src ) ) {
			res[ field ] = Array.isArray( val ) ? val.map( uri_id ) : val
		}

		return res
	}

	function rest_walk(
		data: $bog_harp_reply_data,
		id: string,
		plan: $bog_harp_bench_plan,
		seen: Set< string >,
	) {
		seen.add( `${ plan.type }=${ id }` )
		for( const [ field, sub ] of Object.entries( plan.links ) ) {
			for( const uri of data[ plan.type ][ id ][ field ] as string[] ) {
				rest_walk( data, uri_id( uri ), sub, seen )
			}
		}
	}

	function bytes( text: string ) {
		return new TextEncoder().encode( text ).length
	}

	function gzip( text: string ): number {
		return $node[ 'zlib' ].gzipSync( text ).length
	}

	export function $bog_harp_bench_case(
		data: $bog_harp_reply_data,
		harp_query: string,
		plan: $bog_harp_bench_plan,
		root_field: string,
	) {

		const harp_slice = $bog_harp_reply( harp_query, data )
		const harp_body = JSON.stringify( harp_slice )

		const root_ids = ( Object.values( harp_slice[ '_query' ] )[0] as any ).reply.map( uri_id ) as string[]

		const gql_tree = { data: { [ root_field ]: root_ids.map( id => gql_project( data, id, plan ) ) } }
		const gql_body = JSON.stringify( gql_tree )

		const rest_seen = new Set< string >()
		for( const id of root_ids ) rest_walk( data, id, plan, rest_seen )

		const rest_bodies = [ JSON.stringify( root_ids.map( id => rest_resource( data, plan.type, id ) ) ) ]
		let rest_requests = 1
		for( const key of rest_seen ) {
			const [ type, id ] = key.split( '=' )
			if( type === plan.type && root_ids.includes( id ) ) continue
			rest_bodies.push( JSON.stringify( rest_resource( data, type, id ) ) )
			rest_requests += 1
		}
		const rest_body = rest_bodies.join( '' )

		const harp_entities = Object.entries( harp_slice )
			.filter( ([ type ])=> type !== '_query' )
			.reduce( ( sum, [ , table ] )=> sum + Object.keys( table ).length, 0 )

		return {
			rest: { bytes: bytes( rest_body ), gzip: rest_bodies.reduce( ( sum, body )=> sum + gzip( body ), 0 ), requests: rest_requests, entities: rest_seen.size },
			graphql: { bytes: bytes( gql_body ), gzip: gzip( gql_body ), requests: 1, entities: gql_count( gql_tree.data[ root_field ] ) },
			harp: { bytes: bytes( harp_body ), gzip: gzip( harp_body ), requests: 1, entities: harp_entities },
		}
	}

	export function $bog_harp_bench() {

		const pulls = $bog_harp_bench_case(
			$bog_harp_bench_data_pulls(),
			'pullRequest(state;title;updateTime;repository(name;private;owner(name;avatar));author(name;avatar))',
			{
				type: 'pullRequest',
				fields: [ 'state', 'title', 'updateTime' ],
				links: {
					repository: { type: 'repo', fields: [ 'name', 'private' ], links: {
						owner: { type: 'user', fields: [ 'name', 'avatar' ], links: {} },
					} },
					author: { type: 'user', fields: [ 'name', 'avatar' ], links: {} },
				},
			},
			'pullRequests',
		)

		const friends = $bog_harp_bench_case(
			$bog_harp_bench_data_friends(),
			'user(_num=@30=;name;avatar;friend(name;avatar;friend(name;avatar)))',
			{
				type: 'user',
				fields: [ 'name', 'avatar' ],
				links: {
					friend: { type: 'user', fields: [ 'name', 'avatar' ], links: {
						friend: { type: 'user', fields: [ 'name', 'avatar' ], links: {} },
					} },
				},
			},
			'users',
		)

		return { pulls, friends }
	}

	export function $bog_harp_bench_report() {

		const { pulls, friends } = $bog_harp_bench()

		const kb = ( size: number )=> `${ ( size / 1024 ).toFixed( 1 ) } KB`

		const row = ( name: string, metric: string, val: ( stat: any )=> string, stats: any )=>
			`| ${ name } | ${ metric } | ${ val( stats.rest ) } | ${ val( stats.graphql ) } | ${ val( stats.harp ) } |`

		return [
			'| Scenario | Metric | REST | GraphQL | HARP |',
			'|----------|--------|------|---------|------|',
			row( '200 PRs + repos + authors', 'payload', s => kb( s.bytes ), pulls ),
			row( '', 'gzipped', s => kb( s.gzip ), pulls ),
			row( '', 'requests', s => String( s.requests ), pulls ),
			row( '', 'entity copies', s => String( s.entities ), pulls ),
			row( 'friends of friends (30 roots)', 'payload', s => kb( s.bytes ), friends ),
			row( '', 'gzipped', s => kb( s.gzip ), friends ),
			row( '', 'requests', s => String( s.requests ), friends ),
			row( '', 'entity copies', s => String( s.entities ), friends ),
		].join( '\n' )
	}

	if( $node.process.env.HARP_BENCH ) console.log( $bog_harp_bench_report() )

}
