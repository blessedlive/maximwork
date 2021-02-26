const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

class Items {
    static parse() {
        const rawItems = fs.readFileSync('./data/items.json');
        Items.items = JSON.parse(rawItems);
    }

    static getSorted() {
        return Items.items;
    }

    static async getListing(name, appID, sessionID) {
        return new Promise((resolve, reject) => {
            fetch('https://steamcommunity.com/market/listings/' + appID + '/' + name, {
                headers: {
                    'Cookie': "sessionid=" + sessionID
                }
            })
                .then(res => res.text())
                .then(body => {
                    const listings = Items.parseHTML(body, name, appID);
                    resolve(listings);
                });
        })
    }

    static async getOrders(sessionID, balance) {
        let orders = [];

        for(const item of Items.items) {
            const listings = await Items.getListing(item.name, item.appID, sessionID);
            const index = listings.length - 1;

            if(!listings.length) {
                continue;
            }

            if(listings[index].price > item.range[1]) {
                continue;
            }

            if(balance < listings[index].price) {
                continue
            }

            orders.push({ 
                id: listings[index].id,
                name: item.name,
                price: listings[index].price,
                defaultPrice: listings[index].defaultPrice,
                appID: item.appID
            })
        }

        if(!orders.length) {
            return null;
        }

        orders = orders.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

        return orders;
    }

    static parseHTML(html, name, appID) {
        const listings = [];

        const $ = cheerio.load(html);
        const $listings = $('.market_recent_listing_row');

        $listings.each((_, item) => {
            item = $(item);

            if(item.find('.market_listing_price_with_fee').text().trim().indexOf('pуб.') === -1) {
                return;
            }

            const id = item.attr('id').replace("listing_", "");
            const price = parseFloat(item.find('.market_listing_price_with_fee').text().trim().replace(/,/, "."));
            const defaultPrice = parseFloat(item.find('.market_listing_price_without_fee').text().trim().replace(/,/, "."));

            listings.push({ id, name, price, defaultPrice, appID })
        })

        return listings;
    }

    static async buyListing(item, sessionID, cookies) {
        return new Promise(async (resolve, reject) => {            
            const total = item.price * 100;
            const subtotal = item.defaultPrice * 100;
            const fee = total - subtotal;

            const params = new URLSearchParams();
            params.append('sessionid', sessionID);
            params.append('currency', 5);
            params.append('subtotal', subtotal.toFixed(0));
            params.append('fee', fee.toFixed(0));
            params.append('total', total.toFixed(0));
            params.append('quantity', 1);
            params.append('billing_state', "");
            params.append('save_my_address', 0);

            const response = await fetch('https://steamcommunity.com/market/buylisting/' + item.id, {
                method: 'POST',
                headers: {
                    "Accept": "*/*",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Origin": "http://steamcommunity.com",
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
                    'Referer': 'https://steamcommunity.com/market/listings/' + item.appID + '/' + item.name,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    "Authority" : "steamcommunity.com",
                    'Cookie': cookies
                },
                body: params
            })
            const json = await response.json();

            resolve(json);
        })
    }
}

module.exports = Items;