"use strict";

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const { user: userid, password, pin } = JSON.parse(
    fs.readFileSync("/home/aman/Documents/.private/secret.json")
);
const smallcases = [
    "https://smallcase.zerodha.com/smallcase/SCMO_0026",
    "https://smallcase.zerodha.com/smallcase/SCMO_0003",
];

const base_url = "https://smallcase.zerodha.com";

(async () => {
    try {
        const browserInstance = await puppeteer.launch({
            headless: false,
            args: ["--start-maximized"],
            defaultViewport: null,
        });

        const pages = await browserInstance.pages();
        const tab1 = pages[0];
        await login(tab1);
        const sc1Pr = getStocks(smallcases[0], browserInstance);
        const sc2Pr = getStocks(smallcases[1], browserInstance);
        const [sc1, sc2] = await Promise.all([sc1Pr, sc2Pr]);
        const commonStocks = getCommon(sc1, sc2);
        await tab1.bringToFront();
        if (commonStocks.length >= 2) {
            const answer = await tab1.evaluate((commonStocks) => {
                const answer = prompt(`Found ${commonStocks.length} common stocks!
                
Choose an operation (1-5):
    1. Create new smallcase of common stocks found in the given smallcases.
    2. Create Excel file of stocks.
    3. Create JSON file of stocks.
    4. Print stocks on console.
    5. All of the above.`);

                return answer;
            }, commonStocks);

            if (answer == 1) {
                await createSmallcase(commonStocks, browserInstance);
            } else if (answer == 2) {
                createExcel(commonStocks);
            } else if (answer == 3) {
                createJSON(commonStocks);
            } else if (answer == 4) {
                console.table(commonStocks);
            } else if (answer == 5) {
                createExcel(commonStocks);
                createJSON(commonStocks);
                console.table(commonStocks);
                await createSmallcase(commonStocks, browserInstance);
            } else {
                console.log("INVALID INPUT");
            }
        } else if (commonStocks.length > 0) {
            await tab1.evaluate((commonStocks) => {
                const answer = prompt(`Found ${commonStocks.length} common stocks!
                
For creating a new smallcase 2 or more stocks required.
                
Choose from available options below (1-4):
    1. Create Excel file of stocks.
    2. Create JSON file of stocks.
    3. Print stocks on console.
    4. All of the above.`);

                return answer;
            }, commonStocks);

            if (answer == 1) {
                createExcel(commonStocks);
            } else if (answer == 2) {
                createJSON(commonStocks);
            } else if (answer == 3) {
                console.table(commonStocks);
            } else if (answer == 4) {
                createExcel(commonStocks);
                createJSON(commonStocks);
                console.table(commonStocks);
            } else {
                console.log("INVALID INPUT");
            }
        } else {
            await tab1.evaluate(() => {
                alert(`Found 0 common stocks! Try with different smallcases.`);
            });
        }
        // if (commonStocks.length > 1) {
        //     await createSmallcase(commonStocks, browserInstance);
        // } else {
        //     console.log(commonStocks);
        // }
    } catch (err) {
        console.log(err);
    }
})();

async function login(tab) {
    await tab.goto(base_url);
    await waitAndClick("button.LoginButton__small__cr6GJ", tab);
    await waitAndType("input[type='text']", userid, tab, 200);
    await waitAndType("input[type='password']", password, tab, 200);
    await tab.keyboard.press("Enter");
    await waitAndType("#pin", pin, tab);
    return waitAndClick("button[type='submit']", tab);
}

async function getStocks(url, browserInstance) {
    const newTab = await browserInstance.newPage();
    await newTab.goto(url);
    const stockTabSelector =
        "div.RouteTab__tab_border__2LY1- .RouteTab__tab__25-kK a";
    await newTab.waitForSelector(stockTabSelector);
    await newTab.evaluate((selector) => {
        const anchors = document.querySelectorAll(selector);
        const stockTabAnchor = anchors[1];
        stockTabAnchor.click();
    }, stockTabSelector);

    await newTab.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    const stockSelector =
        "div.StocksWeights__column-left__3oEdJ .StocksWeights__stock-name__2ANv4";
    await newTab.waitForSelector(stockSelector);
    return newTab.evaluate((selector) => {
        const stockElements = document.querySelectorAll(selector);
        let stocks = [...stockElements].map((stock) => stock.innerText.trim());
        return stocks;
    }, stockSelector);
}

function getCommon(s1, s2) {
    return s1.filter((stock) => s2.includes(stock));
}

async function createSmallcase(commonStocks, browserInstance) {
    const newTab = await browserInstance.newPage();
    await newTab.goto(base_url);
    await waitAndClick("a:last-child", newTab);
    for (const stock of commonStocks) {
        await waitAndType(".input-focus", stock, newTab, 100);
        await newTab.waitForTimeout(2000);
        await waitAndClick("#react-autowhatever-1--item-0", newTab);
    }
    //save draft button
    await newTab.waitForTimeout(2000);
    await waitAndClick(
        ".btn.btn-lg.btn-fw.btn-secondary-blue.mt16.mb32",
        newTab
    );
    await waitAndType(
        ".SmallcaseMeta__input-smallcase-name__2XSQD.form-control.full.input.text-14",
        "my new smallcase",
        newTab
    );
    await waitAndType(
        ".SmallcaseMeta__input-smallcase-description__ZFbzN.form-control.full.input.text-14",
        "quality stocks",
        newTab
    );

    await waitAndClick("button[type='submit']", newTab);

    //save smallcase
    await newTab.waitForTimeout(2000);
    return waitAndClick(
        ".btn.btn-lg.btn-fw.btn-secondary-blue.mt16.mb32",
        newTab
    );
}

function createExcel(commonStocks) {
    //TODO
}

function createJSON(commonStocks) {
    const filePath = path.join(__dirname, "stocks.json");
    fs.writeFileSync(filePath, JSON.stringify({ stocks: commonStocks }));
}

async function waitAndType(selector, text, tab, delay = 100) {
    await tab.waitForSelector(selector);
    return tab.type(selector, text, { delay: delay });
}

async function waitAndClick(selector, tab) {
    await tab.waitForSelector(selector);
    return tab.click(selector);
}
