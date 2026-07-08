namespace $ {

	const data: $bog_harp_reply_data = {
		user: {
			jin: { name: 'Jin', age: 30, friend: [ 'user=john=', 'user=jane=' ] },
			john: { name: 'John', age: 18, friend: [ 'user=jin=' ] },
			jane: { name: 'Jane', age: 17, friend: [ 'user=jin=', 'user=ghost=' ] },
		},
		pullRequest: {
			first: { state: 'closed', updateTime: '2022-07-22', repository: [ 'repo=mol=' ], author: [ 'user=jin=' ] },
			second: { state: 'merged', updateTime: '2022-07-21', repository: [ 'repo=mol=' ], author: [ 'user=jin=' ] },
			third: { state: 'open', updateTime: '2022-07-23', repository: [ 'repo=mol=' ], author: [ 'user=john=' ] },
		},
		repo: {
			mol: { name: 'mol', private: false, owner: [ 'user=jin=' ], issue: [ 'issue=a=', 'issue=b=' ] },
		},
		issue: {
			a: { title: 'A', cost: 3 },
			b: { title: 'B', cost: 4 },
		},
	}

	$mol_test({

		'fetch by primary key'() {
			$mol_assert_like(
				$bog_harp_reply( 'user=jin=(name)', data ),
				{
					_query: { 'user=jin=(name)': { reply: [ 'user=jin=' ] } },
					user: { jin: { name: 'Jin' } },
				},
			)
		},

		'filter, order and slice collection'() {
			$mol_assert_like(
				$bog_harp_reply( 'pullRequest(state=closed=merged=;-updateTime;_num=0@2=)', data ),
				{
					_query: {
						'pullRequest(-updateTime;_num=0@2=;state=closed=merged=)': {
							reply: [ 'pullRequest=first=', 'pullRequest=second=' ],
						},
					},
					pullRequest: {
						first: { updateTime: '2022-07-22', state: 'closed' },
						second: { updateTime: '2022-07-21', state: 'merged' },
					},
				},
			)
		},

		'half open range'() {
			$mol_assert_like(
				$bog_harp_reply( 'user(age=18@30=;name)', data ),
				{
					_query: { 'user(age=18@30=;name)': { reply: [ 'user=john=' ] } },
					user: { john: { age: 18, name: 'John' } },
				},
			)
		},

		'negative filter'() {
			$mol_assert_like(
				$bog_harp_reply( 'user(age!=17=;name)', data ),
				{
					_query: { 'user(age!=17=;name)': { reply: [ 'user=jin=', 'user=john=' ] } },
					user: {
						jin: { age: 30, name: 'Jin' },
						john: { age: 18, name: 'John' },
					},
				},
			)
		},

		'deep fetch is normalized'() {
			$mol_assert_like(
				$bog_harp_reply( 'user=jin=(friend(name);name)', data ),
				{
					_query: { 'user=jin=(friend(name);name)': { reply: [ 'user=jin=' ] } },
					user: {
						jin: { friend: [ 'user=john=', 'user=jane=' ], name: 'Jin' },
						john: { name: 'John' },
						jane: { name: 'Jane' },
					},
				},
			)
		},

		'link list refine'() {
			$mol_assert_like(
				$bog_harp_reply( 'user=jin=(friend(+age;name;_num=@1=))', data ),
				{
					_query: { 'user=jin=(friend(+age;_num=@1=;name))': { reply: [ 'user=jin=' ] } },
					user: {
						jin: { friend: [ 'user=jane=' ] },
						jane: { age: 17, name: 'Jane' },
					},
				},
			)
		},

		'dangling link'() {
			$mol_assert_like(
				$bog_harp_reply( 'user=jane=(friend(name))', data ),
				{
					_query: { 'user=jane=(friend(name))': { reply: [ 'user=jane=' ] } },
					user: {
						jane: { friend: [ 'user=jin=', 'user=ghost=' ] },
						jin: { name: 'Jin' },
						ghost: { _error: { '': { code: 'absent' } } },
					},
				},
			)
		},

		'missing entity by primary key'() {
			$mol_assert_like(
				$bog_harp_reply( 'user=ghost=(name)', data ),
				{
					_query: { 'user=ghost=(name)': { reply: [] } },
					user: {
						ghost: { _error: { '': { code: 'absent' } } },
					},
				},
			)
		},

		'missing field'() {
			$mol_assert_like(
				$bog_harp_reply( 'user=jin=(phone)', data ),
				{
					_query: { 'user=jin=(phone)': { reply: [ 'user=jin=' ] } },
					user: {
						jin: { _error: { phone: { code: 'absent' } } },
					},
				},
			)
		},

		'aggregation'() {
			$mol_assert_like(
				$bog_harp_reply( 'repo=mol=(_len(issue);_sum(issue(cost)))', data ),
				{
					_query: { 'repo=mol=(_len(issue);_sum(issue(cost)))': { reply: [ 'repo=mol=' ] } },
					repo: {
						mol: {
							_len: { issue: 2 },
							_sum: { 'issue(cost)': 7 },
						},
					},
				},
			)
		},

		'canonical query echo'() {
			$mol_assert_like(
				$bog_harp_reply( 'user(name;+age)', data ),
				{
					_query: { 'user(+age;name)': { reply: [ 'user=jane=', 'user=john=', 'user=jin=' ] } },
					user: {
						jane: { age: 17, name: 'Jane' },
						john: { age: 18, name: 'John' },
						jin: { age: 30, name: 'Jin' },
					},
				},
			)
		},

		'unknown type fails'() {
			$mol_assert_fail(
				()=> $bog_harp_reply( 'ghost(name)', data ),
				'HARP: unknown type "ghost"',
			)
		},

	})

}
