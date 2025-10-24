import * as fs from 'fs';

interface Document {
    name?: string;
    file_type?: string;
    url?: string;
}

interface WorkflowItem {
    publisher?: { name?: string; identifier?: string };
    title?: string;
    url?: string;
    documents?: Document[];
}

interface OtherDoc {
    publication_title: string;
    publication_url: string;
    publisher_identifier: string;
    publisher_name: string;
    file_name: string;
    file_url: string;
    file_type: string;
}

const data: WorkflowItem[] = JSON.parse(fs.readFileSync('./data/merged-workflows-final.json', 'utf8'));

const counts: Record<string, number> = {};
const otherDocs: OtherDoc[] = [];

data.forEach(item => {
    if (Array.isArray(item.documents)) {
        const publisher_name = item.publisher && item.publisher.name ? item.publisher.name : '';
        const publisher_identifier = item.publisher && item.publisher.identifier ? item.publisher.identifier : '';
        const publication_title = item.title || '';
        const publication_url = item.url || '';
        item.documents.forEach(doc => {
            const type = doc.file_type;
            if (type) {
                counts[type] = (counts[type] || 0) + 1;
                if ((type === 'other' || type === 'word' || type === 'txt') && doc.url) {
                    // Normalize file_name as in downloadOtherFiles.ts
                    let safeFilename = (doc.name || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
                    const maxLen = 100;
                    if (safeFilename.length > maxLen) {
                        const extMatch = safeFilename.match(/(\.[a-zA-Z0-9]+)$/);
                        const ext: string = extMatch && extMatch[1] ? extMatch[1] : '';
                        safeFilename = safeFilename.slice(0, maxLen - ext.length) + ext;
                    }
                    otherDocs.push({
                        publication_title,
                        publication_url,
                        publisher_identifier,
                        publisher_name,
                        file_name: safeFilename,
                        file_url: doc.url || '',
                        file_type: doc.file_type || '',
                    });
                }
            }
        });
    }
});

console.log('Counts:', counts);
if (otherDocs.length > 0) {
    console.log('Docs for non-pdf file types:');
    otherDocs.forEach(doc => console.log(doc));
    fs.writeFileSync('./data/other-docs.json', JSON.stringify(otherDocs, null, 2), 'utf8');
    console.log('Saved docs to other-docs.json');
}