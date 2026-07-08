namespace $ {

	const data: $bog_harp_reply_data = {
		user: {
			jin: { name: 'Jin', age: 30, friend: [ 'user=ghost=' ] },
		},
	}

	$mol_test({

		'json 200 by default'() {

			const res = $bog_harp_serve_response( 'user=jin=(name)', data )

			$mol_assert_equal( res.status, 200 )
			$mol_assert_equal( res.mime, 'application/json' )
			$mol_assert_equal( res.headers[ 'Vary' ], 'Accept' )

			$mol_assert_like( JSON.parse( res.body ), {
				_query: { 'user=jin=(name)': { reply: [ 'user=jin=' ] } },
				user: { jin: { name: 'Jin' } },
			} )

		},

		'partial errors give 207'() {

			const res = $bog_harp_serve_response( 'user=jin=(friend(name))', data )

			$mol_assert_equal( res.status, 207 )
			$mol_assert_like( JSON.parse( res.body )[ 'user' ][ 'ghost' ], {
				_error: { '': { code: 'absent' } },
			} )

		},

		'unknown type gives 400'() {

			const res = $bog_harp_serve_response( 'ghost(name)', data )

			$mol_assert_equal( res.status, 400 )
			$mol_assert_equal( JSON.parse( res.body )[ '_error' ][ '' ][ 'code' ], 'invalid' )
			$mol_assert_equal( res.headers[ 'Vary' ], 'Accept' )

		},

		'malformed query gives 400'() {

			const res = $bog_harp_serve_response( '@', data )

			$mol_assert_equal( res.status, 400 )
			$mol_assert_equal( JSON.parse( res.body )[ '_error' ][ '' ][ 'code' ], 'invalid' )

		},

		'over rate gives 413'() {

			const res = $bog_harp_serve_response( 'user(name)', data, '', 1 )

			$mol_assert_equal( res.status, 413 )
			$mol_assert_equal( JSON.parse( res.body )[ '_error' ][ '' ][ 'code' ], 'limit' )

		},

		'xml for browsers'() {

			const res = $bog_harp_serve_response(
				'user=jin=(name)',
				data,
				'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			)

			$mol_assert_equal( res.status, 200 )
			$mol_assert_equal( res.mime, 'application/xml' )

			$mol_assert_equal( res.body, [
				'<?xml version="1.0"?>',
				'<slice xmlns="https://harp.hyoo.ru">',
				'\t<_query id="user=jin=(name)">',
				'\t\t<reply>user=jin=</reply>',
				'\t</_query>',
				'\t<user id="user=jin=">',
				'\t\t<name>Jin</name>',
				'\t</user>',
				'</slice>',
				'',
			].join( '\n' ) )

		},

		'tree on demand'() {

			const res = $bog_harp_serve_response( 'user=jin=(name)', data, 'application/x-tree;harp' )

			$mol_assert_equal( res.status, 200 )
			$mol_assert_equal( res.mime, 'application/x-tree;harp' )

			$mol_assert_equal( res.body, [
				'_query',
				'\t\\user=jin=(name)',
				'\t\treply',
				'\t\t\tuser=jin=',
				'user',
				'\t\\jin',
				'\t\tname \\Jin',
				'',
			].join( '\n' ) )

		},

	})

}
