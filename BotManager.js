const fs = require("fs");
const Bot = require("./Bot");
const Items = require('./Items');
Items.parse();

class BotManager {
    constructor(accounts, proxies) {
        this.accounts = accounts;
        this.proxies = proxies;
        this.bots = [];
        this.limits = {};
    }

    run() {
        this.log("Старт запуска ботов...", true);
        this.accounts.forEach(account => {
            const proxy = this.getAvailableProxy();

            if(!proxy) {
                return this.log("Закончились прокси")
            }

            const preparedProxy = this.prepareProxy(proxy);

            const bot = new Bot(account, preparedProxy);
            this.bots.push(bot);
            this.log(`Бот "${account.login}" запущен`, true)

            bot.start();
        })
    }

    log(text, write = false) {
        const msg = `(${new Date()}) [BotManager] ${text}`;
        console.log(msg);

        if(write) {
            fs.appendFileSync("./logs/logs.txt", msg + "\n");
        }
    }

    prepareProxy(proxy) {
        return (proxy.user) 
            ? `http://${proxy.user}:${proxy.pass}@${proxy.ip}:${proxy.port}`
            : `http://${proxy.ip}:${proxy.port}`;
    }

    getAvailableProxy() {
        for(let i = 0; i < this.proxies.length; i++) {
            if(!this.proxies[i].count) {
                this.proxies[i].count = 1;
                return this.proxies[i];
            }

            if(this.proxies[i].count < this.proxies[i].limit) {
                this.proxies[i].count++;
                return this.proxies[i];
            }
        }

        return null;
    }
}

module.exports = BotManager;