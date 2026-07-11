namespace $ {

	$mol_test({

		'merge accumulates slices into normalized cache'() {

		const cache = {} as $bog_harp_client_cache

			$bog_harp_client_merge( cache, {
				_query: { 'user=jin=(name)': { reply: [ 'user=jin=' ] } },
				user: { jin: { name: 'Jin' } },
			} )

			$bog_harp_client_merge( cache, {
				user: { jin: { age: 30 }, john: { name: 'John' } },
			} )

			$mol_assert_like( cache, {
				user: {
					jin: { name: 'Jin', age: 30 },
					john: { name: 'John' },
				},
			} )

		},

		'merge treats null as clear'() {

			const cache: $bog_harp_client_cache = { user: { jin: { name: 'Jin', age: 30 } } }

			$bog_harp_client_merge( cache, { user: { jin: { age: null as any } } } )

			$mol_assert_like( cache, { user: { jin: { name: 'Jin' } } } )

		},

		'merge replaces link lists whole'() {

			const cache: $bog_harp_client_cache = { user: { jin: { friend: [ 'user=a=', 'user=b=' ] } } }

			$bog_harp_client_merge( cache, { user: { jin: { friend: [ 'user=c=' ] } } } )

			$mol_assert_like( cache, { user: { jin: { friend: [ 'user=c=' ] } } } )

		},

		'entity resolves uri against cache'() {

			const client = new $bog_harp_client( 'http://localhost:0' )
			$bog_harp_client_merge( client.cache, { user: { jin: { name: 'Jin' } } } )

			$mol_assert_like( client.entity( 'user=jin=' ), { name: 'Jin' } )
			$mol_assert_equal( client.entity( 'user=ghost=' ), undefined )
			$mol_assert_equal( client.entity( 'oops' ), undefined )

		},

	})

}
