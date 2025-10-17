const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/merged-workflows-final.json', 'utf8'));

const counts = {};
const otherDocs = [];

data.forEach(item => {
    if (Array.isArray(item.documents)) {
        item.documents.forEach(doc => {
            const type = doc.file_type;
            if (type) {
                counts[type] = (counts[type] || 0) + 1;
                if (type === 'other' && doc.url || type === 'word' && doc.url) {
                    // Save name, file_type, and url
                    otherDocs.push({
                        name: doc.name,
                        file_type: doc.file_type,
                        url: doc.url
                    });
                }
            }
        });
    }
});

console.log('Counts:', counts);
if (otherDocs.length > 0) {
    console.log('Docs for file_type "other":');
    otherDocs.forEach(doc => console.log(doc));
    fs.writeFileSync('./data/other-docs.json', JSON.stringify(otherDocs, null, 2), 'utf8');
    console.log('Saved docs to other-docs.json');
}