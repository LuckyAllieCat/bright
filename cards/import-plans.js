// Import (or re-import) the 2-week plan flashcards without the Brighter Path sources:
// keeps the decks already baked into index.html, swaps in plans/*_flashcards_2w.json, re-renders from template.html.
// Run: node cards/import-plans.js   (node cards/build.js does the same as part of a full build)
const fs = require('fs'), path = require('path');
const { addPlans, printReport } = require('./plans.js');

const INDEX = path.join(__dirname, 'index.html');
const m = fs.readFileSync(INDEX, 'utf8').match(/\nconst DATA = (\{.*\});\r?\n/);
if (!m) throw new Error('index.html: no baked DATA found');
const before = JSON.parse(m[1]);
const { data, report } = addPlans(before);

const ids = data.cards.map(c => c.id);
if (new Set(ids).size !== ids.length) throw new Error('duplicate card ids after import');
const kept = before.cards.filter(c => !before.decks.find(d => d.key === c.d)?.plan).length;
console.log(`${data.cards.length} cards: ${kept} existing + ${data.cards.length - kept} plan cards`);
printReport(report);

const json = JSON.stringify(data).replace(/</g, '\\u003c');
const html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8').replace('/*DATA*/null', () => json);
fs.writeFileSync(INDEX, html);
console.log('wrote index.html', Math.round(html.length / 1024), 'KB');
