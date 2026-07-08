namespace $ {

	$mol_test({

		'no changes give null'() {

			const slice = {
				_query: { 'user=jin=(name)': { reply: [ 'user=jin=' ] } },
				user: { jin: { name: 'Jin' } },
			}

			$mol_assert_equal( $bog_harp_watch_delta( slice, slice ), null )

		},

		'changed field only'() {

			$mol_assert_like(
				$bog_harp_watch_delta(
					{
						_query: { 'user=jin=(age;name)': { reply: [ 'user=jin=' ] } },
						user: { jin: { age: 30, name: 'Jin' } },
					},
					{
						_query: { 'user=jin=(age;name)': { reply: [ 'user=jin=' ] } },
						user: { jin: { age: 31, name: 'Jin' } },
					},
				),
				{ user: { jin: { age: 31 } } },
			)

		},

		'membership change resends reply list'() {

			$mol_assert_like(
				$bog_harp_watch_delta(
					{
						_query: { 'user(age=18@=;name)': { reply: [ 'user=jin=' ] } },
						user: { jin: { age: 30, name: 'Jin' } },
					},
					{
						_query: { 'user(age=18@=;name)': { reply: [ 'user=jin=', 'user=john=' ] } },
						user: {
							jin: { age: 30, name: 'Jin' },
							john: { age: 18, name: 'John' },
						},
					},
				),
				{
					_query: { 'user(age=18@=;name)': { reply: [ 'user=jin=', 'user=john=' ] } },
					user: { john: { age: 18, name: 'John' } },
				},
			)

		},

		'cleared field becomes null'() {

			$mol_assert_like(
				$bog_harp_watch_delta(
					{
						_query: { 'user=jin=(age;name)': { reply: [ 'user=jin=' ] } },
						user: { jin: { age: 30, name: 'Jin' } },
					},
					{
						_query: { 'user=jin=(age;name)': { reply: [ 'user=jin=' ] } },
						user: { jin: { name: 'Jin', _error: { age: { code: 'absent' } } } },
					},
				),
				{ user: { jin: { _error: { age: { code: 'absent' } }, age: null } } },
			)

		},

	})

}
