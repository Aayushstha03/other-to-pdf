const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const urlsPath = path.join(__dirname, 'data/other-urls.txt');
const downloadDir = path.join(__dirname, 'data/other-files');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const urls = fs.readFileSync(urlsPath, 'utf8').split('\n').filter(Boolean);

function downloadFile(url, dest, cb) {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    };
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

urls.forEach((url) => {
    // Use the full URL as the filename, sanitized to remove unsafe characters
    const safeFilename = url.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(downloadDir, safeFilename);
    downloadFile(url, dest, err => {
        if (err) {
            console.error(`Error downloading ${url}:`, err.message);
        } else {
            console.log(`Downloaded ${url} to ${dest}`);
        }
    });
});
