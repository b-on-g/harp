namespace $ {

	$mol_test({

		'benchmark is deterministic and harp payload wins'() {

			const first = $bog_harp_bench()
			const second = $bog_harp_bench()

			$mol_assert_like( first, second )

			for( const scenario of [ first.pulls, first.friends ] ) {
				$mol_assert_ok( scenario.harp.bytes < scenario.graphql.bytes )
				$mol_assert_ok( scenario.harp.bytes < scenario.rest.bytes )
				$mol_assert_ok( scenario.harp.entities < scenario.graphql.entities )
				$mol_assert_ok( scenario.harp.requests === 1 )
			}

		},

	})

}
