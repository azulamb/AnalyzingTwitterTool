import * as att from './AnalyzingTwitterTool'

export const Version = att.Version;

if ( require.main === module ) { Exec(); }

function Help()
{
	console.log( `Analyzing Twitter Tool.
Version ${ Version }

Syntax:   att [options] [url ...]
Options:
 -e, --encode   Use encodeURIComponent if typeof string value.
 -h, --help     Print this message.
 -v, --version  Print version.
` );
	process.exit( 0 );
}

function Ver()
{
	console.log( 'Version ' + Version );
	process.exit( 0 );
}

export async function Exec()
{
	const arg = ( () =>
	{
		const arg = { url: <string[]>[], encode: false };
		for ( let i = 2 ; i < process.argv.length; ++i )
		{
			if ( process.argv[ i ].indexOf( 'http' ) === 0 )
			{
				arg.url.push( process.argv[ i ] );
			} else
			{
				switch ( process.argv[ i ] )
				{
					case '-e':
					case '--encode': arg.encode = true; break;
					case '-h':
					case '--help': Help(); break;
					case '-v':
					case '--version': Ver(); break;
				}
			}
		}
		return arg;
	} )();

	if ( arg.url.length <= 0 )
	{
		console.error( 'No url...' );
		process.exit( 1 );
	}

	const a = new att.AnalyzingTwitterTool();

	process.on( 'exit', () => { a.close(); } );
	for ( let event of <NodeJS.Signals[]>[
		'SIGINT',
		'SIGTERM',
		'SIGHUP',
		'SIGBREAK',
		'SIGKILL',
		'SIGSTOP',
	] )
	{
		process.on( event, () => { process.exit( 0 ); } );
	}

	await a.load();
	const data = await a.analyze( arg.url );
	console.log( JSON.stringify( data, arg.encode ? ( key, value ) =>
	{
		if ( typeof value !== 'string' ) { return value; }
		return encodeURIComponent( value );
	}: undefined ) );
	await a.close();
}
