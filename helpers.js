const fetch = require("node-fetch");
const readline = require('readline');

async function apiCall(url, body) {
    const req = await fetch(url, {
        "credentials": "include",
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "en-US,en;q=0.9,es;q=0.8,pt;q=0.7",
            "cache-control": "no-cache",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "pragma": "no-cache",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest"
        },
        "referrer": "https://www.pami.org.ar/listado-mdc",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": body,
        "method": "POST",
        "mode": "cors"
    });
    return await req.json();
}

async function run(db, sql, args = []) {
    return new Promise((resolve, reject) => db.run(sql, args, function (err) {
        if (err) {
            console.error(err.message, sql, args);
            reject(err);
            return;
        }
        // console.log(`Rows inserted ${this.changes}`);
        resolve(this);
    }));
}

async function select(db, sql, args = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, args, (err, elements) => {
            if (err) {
                console.error("ERROR", err, sql, args);
                reject(err);
                return;
            }
            resolve(elements);
        });
    });
}


async function sleep(timeMS) {
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            clearTimeout(timer);
            resolve();
        }, timeMS)
    })
}


async function ask(msg) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve, reject) => {
        rl.question(msg, (value) => {
            rl.close();
            resolve(value);
        });
    });
}

module.exports = {apiCall, run, select, ask, sleep};