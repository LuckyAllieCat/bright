// 2-week study plans: turns plans/<language>_flashcards_2w.json into decks (one per language, one sub per "Deck::Sub").
// Card ids come straight from the JSON (it-001, tr-001, ru-001 …), so re-importing updates cards in place and keeps
// review history. Each card keeps its plan day; the app releases it as new on that language's start date + (day − 1).
const fs = require('fs'), path = require('path');

const DIR = path.join(__dirname, 'plans');
const LANGS = {   // file prefix -> deck key, speech voice, id prefix, target-language script or English words that are also words in it
  italian: { key: 'italian-plan', lang: 'it-IT', prefix: 'it-', alsoForeign: ['a', 'i', 'in', 'do', 'come', 'me', 'se', 'no', 'non'] },
  turkish: { key: 'turkish-plan', lang: 'tr-TR', prefix: 'tr-', alsoForeign: ['o', 'on', 'at', 'ne', 'bu', 'hi'] },
  russian: { key: 'russian-plan', lang: 'ru-RU', prefix: 'ru-', target: /[Ѐ-ӿ]/ },
};
const ORDER = ['turkish', 'russian', 'italian'];   // same order as the old decks
const TYPES = ['form', 'rule', 'sentence', 'vocab'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const txt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
const ENG_WORDS = new Set(`the is are was were be a an i you he she it we they me him us them my your his her our their that this these which where what who
  how why to of in on at for from with do don didn isn can not no and or but if as had have has come tell give let thanks thank hello hi excuse please
  only very here there think hope know knew want glad although right well late favour formal time more everything name mother friend over`.split(/\s+/));
// how English a side looks: English words, contractions by their stem (it's → it). A few words are English and foreign too
// (Italian "come", Turkish "o"), so each language leaves those out. Words are split before lowercasing, so Turkish İ/ı never meet an English I.
const englishScore = (s, L) => s.split(/[^\p{L}\p{M}']+/u).map(w => w.toLowerCase().replace(/'(s|re|m|d|ll|ve|t)$/, ''))
  .filter(w => ENG_WORDS.has(w) && !L.alsoForeign.includes(w)).length;
const noStress = s => s.replace(/\u0301/g, '');

// which side gets read aloud: the less English side (the back when both are foreign, e.g. drills); rules have no audio.
// `english` marks an English → foreign card, which "foreign language first" can flip.
function speech(c, L) {
  if (c.type === 'rule') return null;
  const [ef, eb] = L.target ? [+!L.target.test(c.front), +!L.target.test(c.back)] : [englishScore(c.front, L), englishScore(c.back, L)];
  if (ef < eb || (ef === eb && c.type === 'vocab')) return { say: c.front, onFront: true };
  return { say: c.back, onFront: false, english: ef > eb };
}

function loadPlans() {
  const decks = [], cards = [], seen = new Map(), report = {};
  for (const name of ORDER) {
    const file = path.join(DIR, `${name}_flashcards_2w.json`);
    if (!fs.existsSync(file)) { console.warn(`plans: ${path.basename(file)} not found, skipped`); continue; }
    const L = LANGS[name], j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(j.decks)) throw new Error(`${file}: no "decks" list`);
    const subs = [], top = j.decks[0]?.deck.split('::')[0];
    const deck = { key: L.key, name: top, lang: L.lang, subs, plan: name, tags: [], sources: [] };
    const perDay = {}, perSub = {};
    for (const dk of j.decks) {
      const [head, ...rest] = dk.deck.split('::');
      if (head !== top) throw new Error(`${file}: deck "${dk.deck}" is not under "${top}"`);
      const u = subs.push(rest.join(' › ') || dk.topic || head) - 1;
      deck.sources[u] = dk.source || '';
      for (const t of dk.tags || []) if (!deck.tags.includes(t)) deck.tags.push(t);
      for (const c of dk.cards) {
        const where = `${file} ${c.id}`;
        if (typeof c.id !== 'string' || !c.id.startsWith(L.prefix)) throw new Error(`${where}: id must start with "${L.prefix}"`);
        if (seen.has(c.id)) throw new Error(`${where}: id also used in ${seen.get(c.id)}`);
        seen.set(c.id, file);
        if (!Number.isInteger(c.day) || c.day < 1 || c.day > 14) throw new Error(`${where}: day must be 1–14`);
        if (!TYPES.includes(c.type)) throw new Error(`${where}: unknown type "${c.type}"`);
        if (!c.front || !c.back) throw new Error(`${where}: front and back are required`);
        const sp = speech(c, L);
        const big = sp?.onFront || c.type === 'vocab';
        const note = c.note ? `<div class="note">${txt(c.note)}</div>` : '';
        const card = { id: c.id, d: L.key, u, day: c.day, type: c.type, tags: dk.tags || [],
          f: `<div class="ans${big ? ' big' : ''}">${txt(c.front)}</div>`,
          b: `<div class="ans">${txt(c.back)}</div>` + note };
        if (sp) { card.say = noStress(sp.say); if (sp.onFront) card.auto = 1; }
        // English → foreign cards also get the other way round, for "foreign language first"
        if (sp?.english && (c.type === 'sentence' || c.type === 'vocab')) {
          card.rf = `<div class="ans big">${txt(c.back)}</div>`;
          card.rb = `<div class="ans">${txt(c.front)}</div>` + note;
        }
        cards.push(card);
        perDay[c.day] = (perDay[c.day] || 0) + 1;
        perSub[subs[u]] = (perSub[subs[u]] || 0) + 1;
      }
    }
    decks.push(deck);
    report[top] = { cards: Object.values(perSub).reduce((a, b) => a + b, 0), perSub, perDay: Array.from({ length: 14 }, (_, i) => perDay[i + 1] || 0) };
  }
  return { decks, cards, report };
}

// replace any earlier plan decks in `data` with the current JSON files; plan decks go first in the deck list
function addPlans(data) {
  const old = new Set(data.decks.filter(d => d.plan).map(d => d.key));
  const base = { decks: data.decks.filter(d => !d.plan), cards: data.cards.filter(c => !old.has(c.d) && !/^(it|tr|ru)-\d/.test(c.id)) };
  const p = loadPlans();
  return { data: { decks: p.decks.concat(base.decks), cards: p.cards.concat(base.cards) }, report: p.report };
}

function printReport(report) {
  for (const [deck, r] of Object.entries(report)) {
    console.log(`${deck}: ${r.cards} cards · per plan day ${r.perDay.join('/')}`);
    for (const [s, n] of Object.entries(r.perSub)) console.log(`  ${deck}::${s}  ${n}`);
  }
}

module.exports = { addPlans, printReport };
