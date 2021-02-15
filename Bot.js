const fs = require("fs");
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const Items = require('./Items');

class Bot {
    constructor(account, proxy) {
        this.APP_ID = 730;

        this.account = account;
        this.proxy = proxy;
        this.isPurchasing = false;
        this.items = Items.getSorted();
        this.orders = [];
        this.sessionID = null;

        this.client = new SteamUser({
            webCompatibilityMode: true,
            httpProxy: this.proxy
        });

        this.client.on('error', this.onError.bind(this));
        this.client.on('connected', this.onConnected.bind(this));
        this.client.on('loggedOn', this.onLogged.bind(this));
        this.client.on('webSession', this.onWebSession.bind(this));
    }

    async start() {
        this.log("Начинаем работу")
        this.login();
    }

    login() {
        SteamTotp.getTimeOffset((err, offset, latency) => {
            if(err) {
                return this.log(err);
            }

            this.log("Авторизируемся через proxy(" + this.proxy+")", true);
            this.client.logOn({
                "accountName": this.account.login,
                "password": this.account.password,
                "twoFactorCode": SteamTotp.getAuthCode(this.account.sharedSecret, offset)
            });
        });
    }

    onConnected() {
        this.log("Успешное подключение к Steam")
        this.login();
    }

    onLogged() {
        this.log("SteamID64: " + this.client.steamID.getSteamID64());
        this.client.setPersona(SteamUser.EPersonaState.Online);
        this.client.gamesPlayed(this.APP_ID);
    }

    async onWebSession(sessionID, cookies) {
        this.sessionID = sessionID;

        if(!this.client.wallet.hasWallet) {
            return this.log("Нет кошелька");
        }

        if(!this.isPurchasing) {
            this.log("Баланс бота: " + this.client.wallet.balance + " руб", true)
            this.orders = await Items.getOrders(sessionID, this.client.wallet.balance);

            if(!this.orders) {
                return this.log("Отстутствуют свободные лоты", true);
            }

            this.startPurchase();

            this.isPurchasing = true;
        }
    }

    async startPurchase() {
        this.log("Доступно к покупке " + this.orders.length + " лот(ов)")
        for(const order of this.orders) {
            this.log("Собираюсь купить предмет - " + JSON.stringify(order), true)
            const response = await Items.buyListing(order, this.sessionID);
            this.log(JSON.stringify(response), true);
            this.log("Баланс бота: " + this.client.wallet.balance + " руб", true)
            await this.sleep(2000);
        }

        
        this.log("Бот закончил работу", true)
    }

    onError(err) {
        this.log(err);
    }

    log(text, write = false) {
        const msg = `(${new Date()}) [${this.account.login}] ${text}`;
        console.log(msg);

        if(write) {
            fs.appendFileSync("./logs/" + this.account.login + ".txt", msg + "\n");
        }
    }

    sleep(ms = 1000) {
        return new Promise((resolve) => setTimeout(resolve, ms));    
    }
}

module.exports = Bot;