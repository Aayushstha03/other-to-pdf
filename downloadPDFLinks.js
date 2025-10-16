import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import https from "https";

const urlsPath = path.join(__dirname, "data/other-urls.txt");
const downloadDir = path.join(__dirname, "data/other-files");
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const urls = fs.readFileSync(urlsPath, "utf8").split("\n").filter(Boolean);

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, response => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => { });
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', err => {
            file.close();
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    for (const url of urls) {
        try {
            await page.goto(url, { waitUntil: "networkidle2" });
            // Wait a few seconds for JS to finish rendering
            await new Promise(res => setTimeout(res, 5000));
            const dom = await page.content();
            const safeDomFilename = url.replace(/[^a-zA-Z0-9._-]/g, '_') + '.html';
            const domDest = path.join(downloadDir, safeDomFilename);
            fs.writeFileSync(domDest, dom, 'utf8');
            console.log(`✅ Saved DOM for ${url} to ${domDest}`);
        } catch (e) {
            console.error(`❌ Error processing ${url}:`, e);
        }
    }
    await browser.close();
})();
