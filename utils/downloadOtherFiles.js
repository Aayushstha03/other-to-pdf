const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');


const docsPath = path.join(__dirname, '..', 'data', 'other-docs.json');
const downloadDir = path.join(__dirname, '..', 'data', 'other-files');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));


function downloadFile(url, dest, cb, isHtml = false) {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest, { encoding: 'utf8' });
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': isHtml ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' : '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
    if (isHtml) {
        headers['Accept-Charset'] = 'utf-8';
    }
    const options = { headers };
    mod.get(url, options, response => {
        if (response.statusCode !== 200) {
            file.close();
            fs.unlink(dest, () => { });
            return cb(new Error(`Failed to get '${url}' (${response.statusCode})`));
        }
        response.pipe(file);
        file.on('finish', () => file.close(cb));
    }).on('error', err => {
        file.close();
        fs.unlink(dest, () => { });
        cb(err);
    });
}

docs.forEach((doc) => {
    // Use the 'name' as the filename, sanitized to remove unsafe characters and truncated if too long
    let safeFilename = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const maxLen = 100;
    if (safeFilename.length > maxLen) {
        const extMatch = safeFilename.match(/(\.[a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : '';
        safeFilename = safeFilename.slice(0, maxLen - ext.length) + ext;
    }
    const dest = path.join(downloadDir, safeFilename);
    // Detect HTML by extension or file_type
    const isHtml = (doc.file_type === 'html') || safeFilename.match(/\.html?$/i);
    downloadFile(doc.url, dest, err => {
        if (err) {
            console.error(`Error downloading ${doc.url}:`, err.message);
        } else {
            console.log(`Downloaded ${doc.url} to ${dest}`);
        }
    }, isHtml);
});
