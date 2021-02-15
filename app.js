const fs = require('fs');
const botManager = require('./BotManager');

const rawAccounts = fs.readFileSync('./data/bots.json');
const accounts = JSON.parse(rawAccounts);

const rawProxies = fs.readFileSync('./data/proxies.json');
const proxies = JSON.parse(rawProxies);

const BotManager = new botManager(accounts, proxies);
BotManager.run();