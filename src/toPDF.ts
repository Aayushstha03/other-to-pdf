import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

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

async function printFileToPDF(filePath: string, outputPath: string) {
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
    }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    if (html) {
        await page.setContent(html, { waitUntil: "networkidle0" });
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
    await browser.close();
    console.log(`✅ PDF generated: ${outputPath}`);
}


// Convert all files in data/other-files to PDF
async function convertAllToPDF() {
    const inputDir = path.join(__dirname, "..", "data", "other-format-files");
    const outputDir = path.join(__dirname, "..", "data", "converted-files");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const files = fs.readdirSync(inputDir);
    for (const file of files) {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file + ".pdf");
        try {
            await printFileToPDF(inputPath, outputPath);
        } catch (e) {
            console.error(`❌ Failed to convert ${file}:`, e);
        }
    }
}

convertAllToPDF();
