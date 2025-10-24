
import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

// Simple XML pretty-print function
function formatXml(xml: string): string {
    const PADDING = '  ';
    const reg = /(>)(<)(\/*)/g;
    let formatted = '';
    let pad = 0;
    xml = xml.replace(reg, '$1\n$2$3');
    xml.split(/\n/).forEach((node) => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }
        formatted += PADDING.repeat(pad) + node + '\n';
        pad += indent;
    });
    return formatted.trim();
}

function getJsonHtml(content: string): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: monospace; margin: 2em; }
            pre { font-size: 1em; white-space: pre-wrap; word-break: break-word; }
        </style>
    </head>
    <body>
        <pre>${content}</pre>
    </body>
    </html>`;
}

function getXmlHtml(content: string): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: monospace; margin: 2em; }
            pre { font-size: 1em; white-space: pre-wrap; word-break: break-word; }
        </style>
    </head>
    <body>
        <pre>${content}</pre>
    </body>
    </html>`;
}


async function printFileToPDF(page: Page, filePath: string, outputPath: string) {
    const ext = path.extname(filePath).toLowerCase();
    // Ignore doc/docx files
    if (ext === ".doc" || ext === ".docx") {
        console.log(`Skipping DOC/DOCX file: ${filePath}`);
        return;
    }
    let html: string | null = null;
    if (ext === ".json") {
        let raw = fs.readFileSync(filePath, "utf8");
        try {
            raw = JSON.stringify(JSON.parse(raw), null, 2);
        } catch (e) {
            // fallback to raw
        }
        html = getJsonHtml(raw);
    } else if (ext === ".xml") {
        let raw = fs.readFileSync(filePath, "utf8");
        // Pretty-print XML
        let pretty = formatXml(raw);
        // Escape HTML special chars for XML
        pretty = pretty.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html = getXmlHtml(pretty);
    } else if (ext === ".txt") {
        let raw = fs.readFileSync(filePath, "utf8");
        html = getJsonHtml(raw); // Use same plain template for txt
    } else if (ext === ".html" || ext === ".htm") {
        // Use Readability.js to extract main article
        const raw = fs.readFileSync(filePath, "utf8");
        const dom = new JSDOM(raw);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article && article.content) {
            html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>${article.title || "Article"}</title></head><body>${article.content}</body></html>`;
        } else {
            html = raw; // fallback to original HTML
        }
    }
    if (html) {
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 120000 }); // 2 min timeout
    } else {
        // Load local file for other formats (including html)
        const fileUrl = `file:${path.resolve(filePath)}`;
        await page.goto(fileUrl, { waitUntil: "networkidle0" });
    }
    await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
    });
    console.log(`✅ PDF generated: ${outputPath}`);
}



// Convert all files listed in other-docs.json to PDF and write metadata to _converted-files-info.json
async function convertAllToPDF() {
    const docsPath = path.join(__dirname, "..", "data", "other-docs.json");
    const inputDir = path.join(__dirname, "..", "data", "other-format-files");
    const outputDir = path.join(__dirname, "..", "data", "converted-files");
    const outputJson = path.join(outputDir, "_converted-files-info.json");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const docs: any[] = JSON.parse(fs.readFileSync(docsPath, "utf8"));
    const files = fs.readdirSync(inputDir);
    let result: any[] = [];
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    for (const file of files) {
        const inputPath = path.join(inputDir, file);
        // Find matching entry in docs by file_name
        const doc = docs.find((d: any) => d.file_name === file);
        // Sanitize and truncate file name for output
        let safeFilename = (file || "unknown").replace(/[^a-zA-Z0-9._-]/g, '_');
        const maxLen = 100;
        const ext = ".pdf";
        if (safeFilename.length > maxLen - ext.length) {
            safeFilename = safeFilename.slice(0, maxLen - ext.length);
        }
        const pdfName = safeFilename + ext;
        const outputPath = path.join(outputDir, pdfName);
        try {
            await printFileToPDF(page, inputPath, outputPath);
            const entry = doc ? {
                publication_title: doc.publication_title,
                publication_url: doc.publication_url,
                publisher_identifier: doc.publisher_identifier,
                publisher_name: doc.publisher_name,
                file_name: doc.file_name || '',
                file_url: doc.file_url || '',
                file_type: doc.file_type || '',
                original_file: doc.file_name || '',
                converted_file: pdfName,
            } : {
                publication_title: '',
                publication_url: '',
                publisher_identifier: '',
                publisher_name: '',
                file_name: file,
                file_url: '',
                file_type: '',
                original_file: file,
                converted_file: pdfName,
            };
            result.push(entry);
            fs.writeFileSync(outputJson, JSON.stringify(result, null, 2), "utf8");
        } catch (e) {
            console.error(`❌ Failed to convert ${file}:`, e);
        }
    }
    await browser.close();
    console.log('✅ Detailed converted files info written to _converted-files-info.json');
}

convertAllToPDF();
