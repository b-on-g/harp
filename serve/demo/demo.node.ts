namespace $ {

	export class $bog_harp_serve_demo extends $bog_harp_serve {

		static data(): $bog_harp_reply_data {
			return {
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
		}

		static port() {
			return Number( $node.process.env.HARP_PORT ?? 9181 )
		}

	}

	if( $node.process.env.HARP_SERVE ) $bog_harp_serve_demo.start()

}
