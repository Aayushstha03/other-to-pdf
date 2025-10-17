const fs = require('fs');
const path = require('path');

const workflowsPath = path.join(__dirname, '..', 'data', 'merged-workflows-final.json');
const convertedDir = path.join(__dirname, '..', 'data', 'converted-files');
const outputJson = path.join(__dirname, '..', 'data', 'converted-files', 'converted-files-info.json');

const workflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));
const convertedFiles = fs.readdirSync(convertedDir);


const maxLen = 100;
const ext = '.pdf';

const result = [];
workflows.forEach(item => {
    if (Array.isArray(item.documents)) {
        const publisher_name = item.publisher && item.publisher.name ? item.publisher.name : '';
        const publisher_identifier = item.publisher && item.publisher.identifier ? item.publisher.identifier : '';
        const title = item.title || '';
        item.documents.forEach(doc => {
            let safeFilename = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            if (safeFilename.length > maxLen - ext.length) {
                safeFilename = safeFilename.slice(0, maxLen - ext.length);
            }
            const pdfName = safeFilename + ext;
            if (convertedFiles.includes(pdfName)) {
                result.push({
                    title,
                    publisher_name,
                    publisher_identifier,
                    name: doc.name || '',
                    url: doc.url || '',
                    file_type: doc.file_type || '',
                    original_file: doc.name || '',
                    converted_file: pdfName
                });
            }
        });
    }
});

fs.writeFileSync(outputJson, JSON.stringify(result, null, 2), 'utf8');
console.log('✅ Detailed converted files info written to converted-files-info.json');
