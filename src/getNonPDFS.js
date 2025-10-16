const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/merged-workflows-final.json', 'utf8'));

const counts = {};
const otherUrls = [];

data.forEach(item => {
    if (Array.isArray(item.documents)) {
        item.documents.forEach(doc => {
            const type = doc.file_type;
            if (type) {
                counts[type] = (counts[type] || 0) + 1;
                if (type === 'other' && doc.url) {
                    otherUrls.push(doc.url);
                }
            }
        });
    }
});

console.log('Counts:', counts);
if (otherUrls.length > 0) {
    console.log('URLs for file_type "other":');
    otherUrls.forEach(url => console.log(url));
    fs.writeFileSync('./data/other-urls.txt', otherUrls.join('\n'), 'utf8');
    console.log('Saved URLs to other-urls.txt');
}