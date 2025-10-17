const fs = require('fs');
const path = require('path');

const docsPath = path.join(__dirname, '..', 'data', 'other-docs.json');
const convertedDir = path.join(__dirname, '..', 'data', 'converted-files');
const outputMd = path.join(__dirname, 'converted.md');

const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
const convertedFiles = fs.readdirSync(convertedDir);

// Build a map from sanitized/truncated doc name + '.pdf' to url
const fileUrlMap = {};
docs.forEach(doc => {
    let safeFilename = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const maxLen = 100;
    const ext = '.pdf';
    if (safeFilename.length > maxLen - ext.length) {
        safeFilename = safeFilename.slice(0, maxLen - ext.length);
    }
    const pdfName = safeFilename + ext;
    fileUrlMap[pdfName] = doc.url;
});


let mdContent = '### Converted Files Table\n\n| URL | Original File Name | Converted File Name |\n| --- | ----------------- | ------------------- |\n';
convertedFiles.forEach(convertedFile => {
    // Find matching doc entry
    for (const doc of docs) {
        let safeFilename = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const maxLen = 100;
        const ext = '.pdf';
        if (safeFilename.length > maxLen - ext.length) {
            safeFilename = safeFilename.slice(0, maxLen - ext.length);
        }
        const pdfName = safeFilename + ext;
        if (pdfName === convertedFile) {
            mdContent += `| ${doc.url} | ${doc.name} | ${convertedFile} |\n`;
            break;
        }
    }
});

fs.writeFileSync(outputMd, mdContent, 'utf8');
console.log('✅ Table of converted files written to converted.md');
