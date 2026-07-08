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

		'root gives type listing'() {

			const res = $bog_harp_serve_response( '', data )

			$mol_assert_equal( res.status, 200 )

			const slice = JSON.parse( res.body )
			$mol_assert_like( slice[ '_query' ], { '_type(name)': { reply: [ '_type=user=' ] } } )
			$mol_assert_like( slice[ '_type' ], { user: { name: 'user' } } )

		},

		'schema is queryable over http'() {

			const res = $bog_harp_serve_response( '_field=user.name=(kind;sort)', data )

			$mol_assert_equal( res.status, 200 )
			$mol_assert_like( JSON.parse( res.body )[ '_field' ], {
				'user.name': { kind: 'string', sort: true },
			} )

		},

		'patch applies and echoes state'() {

			const before: $bog_harp_reply_data = { user: { jin: { name: 'Jin' } } }
			const res = $bog_harp_serve_patch( 'user=jin=', JSON.stringify({ user: { jin: { name: 'Dima' } } }), before )

			$mol_assert_equal( res.result.status, 200 )
			$mol_assert_like( JSON.parse( res.result.body ), {
				_query: { 'user=jin=': { reply: [ 'user=jin=' ] } },
				user: { jin: { name: 'Dima', _etag: '1' } },
			} )
			$mol_assert_like( res.data, { user: { jin: { name: 'Dima', _etag: '1' } } } )
			$mol_assert_like( before, { user: { jin: { name: 'Jin' } } } )

		},

		'patch conflict gives 409 and keeps state'() {

			const before: $bog_harp_reply_data = { user: { jin: { name: 'Jin', _etag: '2' } } }
			const res = $bog_harp_serve_patch( 'user=jin=', JSON.stringify({ user: { jin: { _etag: '1', name: 'Hacked' } } }), before )

			$mol_assert_equal( res.result.status, 409 )
			$mol_assert_equal( JSON.parse( res.result.body ).user.jin._error._etag.code, 'conflict' )
			$mol_assert_equal( res.data, before )

		},

		'patch with broken json gives 400'() {

			const res = $bog_harp_serve_patch( 'user=jin=', '{oops', {} )

			$mol_assert_equal( res.result.status, 400 )
			$mol_assert_equal( JSON.parse( res.result.body )._error[''].code, 'invalid' )

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
