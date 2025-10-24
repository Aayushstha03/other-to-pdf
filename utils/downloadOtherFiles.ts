
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const docsPath = path.join(__dirname, '..', 'data', 'other-docs.json');
const downloadDir = path.join(__dirname, '..', 'data', 'other-format-files');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

interface OtherDoc {
    publication_title: string;
    publication_url: string;
    publisher_identifier: string;
    publisher_name: string;
    file_name: string;
    file_url: string;
    file_type: string;
    original_file: string;
}

const docs: OtherDoc[] = JSON.parse(fs.readFileSync(docsPath, 'utf8'));


function downloadFile(url: string, dest: string, isHtml: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest, { encoding: 'utf8' });
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': isHtml ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' : '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'close', // disable keep-alive
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };
        if (isHtml) {
            headers['Accept-Charset'] = 'utf-8';
        }
        const options = { headers, agent: false };
        let finished = false;
        let request: http.ClientRequest;
        const timeout = setTimeout(() => {
            if (!finished) {
                finished = true;
                if (request) request.destroy();
                file.close();
                fs.unlink(dest, () => { });
                reject(new Error(`Timeout: Download did not finish in 5 seconds for ${url}`));
            }
        }, 5000);
        request = mod.get(url, options, (response: http.IncomingMessage) => {
            if (finished) return;
            if (response.statusCode !== 200) {
                finished = true;
                clearTimeout(timeout);
                file.close();
                fs.unlink(dest, () => { });
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            response.pipe(file);
            file.on('finish', () => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timeout);
                    file.close(() => resolve());
                }
            });
        });
        request.on('error', (err: Error) => {
            if (!finished) {
                finished = true;
                clearTimeout(timeout);
                file.close();
                fs.unlink(dest, () => { });
                reject(err);
            }
        });
    });
}


async function main() {
    const results = await Promise.allSettled(
        docs.filter(doc => doc.file_type === 'txt' || doc.file_type === 'other')
            .map(async (doc: OtherDoc) => {
                // Use the 'file_name' as the filename, sanitized to remove unsafe characters and truncated if too long
                let safeFilename = (doc.file_name || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
                const maxLen = 100;
                if (safeFilename.length > maxLen) {
                    const extMatch = safeFilename.match(/(\.[a-zA-Z0-9]+)$/);
                    const ext: string = extMatch && extMatch[1] ? extMatch[1] : '';
                    safeFilename = safeFilename.slice(0, maxLen - ext.length) + ext;
                }
                const dest = path.join(downloadDir, safeFilename);
                // Detect HTML by extension or file_type
                const isHtml = (doc.file_type === 'html') || /\.html?$/i.test(safeFilename);
                try {
                    await downloadFile(doc.file_url, dest, isHtml);
                    console.log(`Downloaded ${doc.file_url} to ${dest}`);
                } catch (err: any) {
                    console.error(`Error downloading ${doc.file_url}:`, err.message);
                }
            })
    );
    // Optionally, exit with error if any download failed
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
        console.error(`\n${failed.length} downloads failed.`);
        process.exit(1);
    } else {
        console.log('\nAll downloads completed successfully.');
        process.exit(0);
    }
}

main();
