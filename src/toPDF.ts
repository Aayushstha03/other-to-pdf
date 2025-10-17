import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

async function printFileToPDF(filePath: string, outputPath: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Load local file
    const fileUrl = `file:${path.resolve(filePath)}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

    // Print to PDF
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
