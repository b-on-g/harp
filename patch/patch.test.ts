namespace $ {

	$mol_test({

		'upsert creates entity and stamps etag'() {

			const before: $bog_harp_reply_data = {}
			const res = $bog_harp_patch( { user: { jin: { name: 'Jin' } } }, before )

			$mol_assert_equal( res.failed, false )
			$mol_assert_like( res.data, { user: { jin: { name: 'Jin', _etag: '1' } } } )
			$mol_assert_like( res.slice, { user: { jin: { name: 'Jin', _etag: '1' } } } )
			$mol_assert_like( before, {} )

		},

		'merge is field level and input state is untouched'() {

			const before: $bog_harp_reply_data = { user: { jin: { name: 'Jin', age: 30, _etag: '1' } } }
			const res = $bog_harp_patch( { user: { jin: { age: 31 } } }, before )

			$mol_assert_like( res.data, { user: { jin: { name: 'Jin', age: 31, _etag: '2' } } } )
			$mol_assert_like( res.slice, { user: { jin: { age: 31, _etag: '2' } } } )
			$mol_assert_like( before, { user: { jin: { name: 'Jin', age: 30, _etag: '1' } } } )

		},

		'null clears field'() {

			const res = $bog_harp_patch(
				{ user: { jin: { age: null } } },
				{ user: { jin: { name: 'Jin', age: 30, _etag: '1' } } },
			)

			$mol_assert_like( res.data, { user: { jin: { name: 'Jin', _etag: '2' } } } )
			$mol_assert_like( res.slice, { user: { jin: { age: null, _etag: '2' } } } )

		},

		'any failure aborts whole transaction'() {

			const before: $bog_harp_reply_data = {
				user: {
					jin: { name: 'Jin', _etag: '2' },
					john: { name: 'John', _etag: '1' },
				},
			}

			const res = $bog_harp_patch(
				{
					user: {
						jin: { _etag: '1', name: 'Hacked' },
						john: { name: 'Johnny' },
					},
				},
				before,
			)

			$mol_assert_equal( res.failed, true )
			$mol_assert_equal( res.data, before )
			$mol_assert_equal( ( res.slice as any ).user.jin._error._etag.code, 'conflict' )
			$mol_assert_like( before.user.john, { name: 'John', _etag: '1' } )

		},

		'reserved names and broken links are invalid'() {

			const res = $bog_harp_patch(
				{
					_type: { user: { name: 'X' } },
					user: {
						jin: { _secret: 1, friend: [ 'oops' ] },
					},
				},
				{},
			)

			$mol_assert_equal( res.failed, true )
			$mol_assert_equal( ( res.slice as any )._type.user._error[''].code, 'invalid' )
			$mol_assert_equal( ( res.slice as any ).user.jin._error._secret.code, 'invalid' )
			$mol_assert_equal( ( res.slice as any ).user.jin._error.friend.code, 'invalid' )

		},

	})

}
