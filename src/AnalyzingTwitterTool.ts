import * as path from 'path'
import * as puppeteer from 'puppeteer'

const PACKAGE_JSON = require( path.join( __dirname, '../package.json' ) );

export const Version = PACKAGE_JSON.version;

export interface DataType
{
	user: TweetUserData;
	tweet: TweetPageData;
}

export interface SuccessResult
{
	url: string;
	user: TweetUserData;
	tweet?: TweetPageData;
}

export interface FailureResult
{
	url: string;
	user: TweetUserData;
	error?: any;
}

export class AnalyzingTwitterTool
{
	private browser: puppeteer.Browser;

	constructor()
	{
	}

	public async load()
	{
		this.browser = await puppeteer.launch(
		{
			args: [ '--no-sandbox', '--disable-setuid-sandbox' ],
		} );
		return this.browser;
	}

	public close() { this.browser.close(); }

	public analyze( url: string | string[] ): Promise<(SuccessResult|FailureResult)[]>
	{
		if ( !Array.isArray( url ) ) { url = [ url ]; }
		return Promise.all( url.map( ( url ) =>
		{
			const result: SuccessResult = <any>{ url: url };
			const info = this.remakeURL( url );
			const p: Promise<any>[] = [
				this.scraping<'user'>( 'user', info.user ).then( ( data ) => { result.user = data; } ),
			];
			if ( info.type === 'tweet' )
			{
				p.push( this.scraping<'tweet'>( info.type, info.url ).then( ( data ) =>
				{
					result.tweet = data;
				} ).catch( ( error ) =>
				{
					(<FailureResult>result).error = error;
				} ) );
			}
			return Promise.all( p ).then( () =>{ return result; } ).catch( ( error ) =>
			{
				(<FailureResult>result).error = error;
				return result;
			} );
		} ) );
	}

	private remakeURL( url: string ): { type: keyof DataType, url: string, user: string }
	{
		const u = new URL( url );
		u.hostname = 'mobile.twitter.com';
		u.pathname = u.pathname.replace( /\/photo\/(\d+)$/, '' );
		return {
			type: u.pathname.match( /^\/[\d\w]+\/{0,1}$/ ) ? 'user' : 'tweet',
			url: u.toString(),
			user: u.toString().replace( /(mobile\.twitter\.com\/\w+)\/{0,1}.*$/, '$1' ),
		};
	}

	private checkResource( type: keyof DataType, url: string )
	{
		switch ( type )
		{
			case 'tweet': return !!url.match( /^https\:\/\/api.twitter.com\/2\/timeline\/conversation\/\d+\.json/ );
			case 'user': return !!url.match( /^https\:\/\/api\.twitter\.com\/graphql\/[\w\-]+\/UserByScreenName\?.+$/ );
		}
		return false;
	}

	public async scraping<K extends keyof DataType>( type: keyof DataType, url: string )
	{
		const page = await this.browser.newPage();

		const p = new Promise<DataType[K]>( ( resolve, reject ) =>
		{
			page.on( 'requestfinished', ( request ) =>
			{
				if ( !this.checkResource( type, request.url() ) ) { return; }
				const response = request.response();
				if ( !response ) { return; }
				response.json().then( resolve ).catch( reject );
			} );
		} );

		await page.goto( url );

		const data = await p;

		await page.close();

		return data;
	}
}
