import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const downloadDir = path.join(__dirname, "data/other-files");
const htmlFiles = fs.readdirSync(downloadDir).filter(f => f.endsWith(".html"));

async function downloadFile(url, dest) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/pdf',
            'Referer': url
        },
        redirect: 'follow'
    });
    if (!res.ok) {
        throw new Error(`Failed to get '${url}' (${res.status})`);
    }
    const fileStream = fs.createWriteStream(dest);
    return new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
    });
}

const allPdfUrls = [];
for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(downloadDir, htmlFile);
    const dom = new JSDOM(fs.readFileSync(htmlPath, "utf8"));
    const document = dom.window.document;
    const links = Array.from(document.querySelectorAll('a[data-service="download"][data-datatype="pdf"]'));
    if (links.length === 0) {
        console.log(`No PDF links found in ${htmlFile}`);
        continue;
    }
    // Recover the original page URL from the filename
    let baseUrl = htmlFile.replace(/\.html$/, '');
    baseUrl = baseUrl.replace(/^https___/, 'https://').replace(/_/g, '/');
    for (const a of links) {
        const href = a.getAttribute('href');
        if (!href) continue;
        const pdfUrl = new URL(href, baseUrl).toString();
        allPdfUrls.push(pdfUrl);
    }
}
// Save all found PDF URLs to a file
const outPath = path.join(downloadDir, 'pdf-download-urls.txt');
fs.writeFileSync(outPath, allPdfUrls.join('\n'), 'utf8');
console.log(`✅ Saved all PDF download URLs to ${outPath}`);
