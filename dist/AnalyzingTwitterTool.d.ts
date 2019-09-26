import * as puppeteer from 'puppeteer';
export declare const Version: any;
export interface DataType {
    user: TweetUserData;
    tweet: TweetPageData;
}
export interface SuccessResult {
    url: string;
    user: TweetUserData;
    tweet?: TweetPageData;
}
export interface FailureResult {
    url: string;
    user: TweetUserData;
    error?: any;
}
export declare class AnalyzingTwitterTool {
    private browser;
    constructor();
    load(): Promise<puppeteer.Browser>;
    close(): void;
    analyze(url: string | string[]): Promise<(SuccessResult | FailureResult)[]>;
    private remakeURL;
    private checkResource;
    scraping<K extends keyof DataType>(type: keyof DataType, url: string): Promise<DataType[K]>;
}
