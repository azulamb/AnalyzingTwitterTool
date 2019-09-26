"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const puppeteer = require("puppeteer");
const PACKAGE_JSON = require(path.join(__dirname, '../package.json'));
exports.Version = PACKAGE_JSON.version;
class AnalyzingTwitterTool {
    constructor() {
    }
    async load() {
        this.browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        return this.browser;
    }
    close() { this.browser.close(); }
    analyze(url) {
        if (!Array.isArray(url)) {
            url = [url];
        }
        return Promise.all(url.map((url) => {
            const result = { url: url };
            const info = this.remakeURL(url);
            const p = [
                this.scraping('user', info.user).then((data) => { result.user = data; }),
            ];
            if (info.type === 'tweet') {
                p.push(this.scraping(info.type, info.url).then((data) => {
                    result.tweet = data;
                }).catch((error) => {
                    result.error = error;
                }));
            }
            return Promise.all(p).then(() => { return result; }).catch((error) => {
                result.error = error;
                return result;
            });
        }));
    }
    remakeURL(url) {
        const u = new URL(url);
        u.hostname = 'mobile.twitter.com';
        u.pathname = u.pathname.replace(/\/photo\/(\d+)$/, '');
        return {
            type: u.pathname.match(/^\/[\d\w]+\/{0,1}$/) ? 'user' : 'tweet',
            url: u.toString(),
            user: u.toString().replace(/(mobile\.twitter\.com\/\w+)\/{0,1}.*$/, '$1'),
        };
    }
    checkResource(type, url) {
        switch (type) {
            case 'tweet': return !!url.match(/^https\:\/\/api.twitter.com\/2\/timeline\/conversation\/\d+\.json/);
            case 'user': return !!url.match(/^https\:\/\/api\.twitter\.com\/graphql\/[\w\-]+\/UserByScreenName\?.+$/);
        }
        return false;
    }
    async scraping(type, url) {
        const page = await this.browser.newPage();
        const p = new Promise((resolve, reject) => {
            page.on('requestfinished', (request) => {
                if (!this.checkResource(type, request.url())) {
                    return;
                }
                const response = request.response();
                if (!response) {
                    return;
                }
                response.json().then(resolve).catch(reject);
            });
        });
        await page.goto(url);
        const data = await p;
        await page.close();
        return data;
    }
}
exports.AnalyzingTwitterTool = AnalyzingTwitterTool;
