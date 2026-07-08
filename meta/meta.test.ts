namespace $ {

	const graph: $bog_harp_reply_data = {
		user: {
			jin: { name: 'Jin', age: 30, friend: [ 'user=john=', 'user=jane=' ], _etag: '1' },
			john: { name: 'John', age: 18, birthday: '2004-01-01', boss: [ 'user=jin=' ] },
		},
		repo: {
			mol: { name: 'mol', private: false, owner: [ 'user=jin=' ] },
		},
	}

	$mol_test({

		'schema is inferred from data'() {

			$mol_assert_like( $bog_harp_meta( graph, { rate_max: 1000 } ), {
				_type: {
					user: {
						name: 'user',
						field: [ '_field=user.name=', '_field=user.age=', '_field=user.friend=', '_field=user.birthday=', '_field=user.boss=' ],
					},
					repo: {
						name: 'repo',
						field: [ '_field=repo.name=', '_field=repo.private=', '_field=repo.owner=' ],
					},
				},
				_field: {
					'user.name': { name: 'name', kind: 'string', many: false, filter: true, sort: true, aggregate: false },
					'user.age': { name: 'age', kind: 'int', many: false, filter: true, sort: true, aggregate: true },
					'user.friend': { name: 'friend', kind: 'link', many: true, filter: true, sort: true, aggregate: false, target: [ '_type=user=' ] },
					'user.birthday': { name: 'birthday', kind: 'date', many: false, filter: true, sort: true, aggregate: false },
					'user.boss': { name: 'boss', kind: 'link', many: false, filter: true, sort: true, aggregate: false, target: [ '_type=user=' ] },
					'repo.name': { name: 'name', kind: 'string', many: false, filter: true, sort: true, aggregate: false },
					'repo.private': { name: 'private', kind: 'bool', many: false, filter: true, sort: true, aggregate: false },
					'repo.owner': { name: 'owner', kind: 'link', many: false, filter: true, sort: true, aggregate: false, target: [ '_type=user=' ] },
				},
				_server: {
					this: { rateMax: 1000 },
				},
			} )

		},

		'metadata is queryable with harp itself'() {

			const full = { ... $bog_harp_meta( graph ), ... graph }

			$mol_assert_like( $bog_harp_reply( '_type(name)', full )[ '_query' ], {
				'_type(name)': { reply: [ '_type=user=', '_type=repo=' ] },
			} )

			$mol_assert_like( $bog_harp_reply( '_field=user.friend=(kind;target(name))', full ), {
				_query: { '_field=user.friend=(kind;target(name))': { reply: [ '_field=user.friend=' ] } },
				_field: { 'user.friend': { kind: 'link', target: [ '_type=user=' ] } },
				_type: { user: { name: 'user' } },
			} )

		},

	})

}
