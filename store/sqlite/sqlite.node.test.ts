namespace $ {

	function db_demo() {
		const db = new ( $node[ 'node:sqlite' ].DatabaseSync )( ':memory:' )
		db.exec(`
			CREATE TABLE author( id TEXT PRIMARY KEY, name TEXT );
			CREATE TABLE post( id INTEGER PRIMARY KEY, title TEXT, author TEXT REFERENCES author( id ) );
			INSERT INTO author VALUES ( 'jin', 'Jin' );
			INSERT INTO post VALUES ( 1, 'Hello', 'jin' ), ( 2, 'Draft', NULL );
		`)
		return db
	}

	$mol_test({

		'tables become types, pk becomes id, fk becomes link list'() {

			$mol_assert_like( $bog_harp_store_sqlite( db_demo() ), {
				author: {
					jin: { name: 'Jin' },
				},
				post: {
					'1': { title: 'Hello', author: [ 'author=jin=' ] },
					'2': { title: 'Draft' },
				},
			} )

		},

		'harp queries run over sqlite snapshot'() {

			const data = $bog_harp_store_sqlite( db_demo() )

			$mol_assert_like( $bog_harp_reply( 'post=1=(title;author(name))', data ), {
				_query: { 'post=1=(author(name);title)': { reply: [ 'post=1=' ] } },
				post: { '1': { author: [ 'author=jin=' ], title: 'Hello' } },
				author: { jin: { name: 'Jin' } },
			} )

		},

	})

}
