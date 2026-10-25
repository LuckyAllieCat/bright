// Brighter Code build: turns the Python, SQL and R lessons of Brighter Path (../quest-path/content) into
// typed coding exercises and bakes them into index.html from template.html. Run: node build.js
// Exercise ids are the Brighter Path question ids, so solved marks and drafts survive rebuilds.
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'quest-path', 'content');
global.window = global;
require(path.join(SRC, '_base.js'));

const SUBJECTS = [['python', 'Python'], ['sql', 'SQL'], ['r', 'R']];

// stable shuffle so the pieces of an ordering puzzle don't move between visits
function shuffle(arr, seed) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.join('\n') === arr.join('\n') && a.length > 1 ? a.slice(1).concat(a[0]) : a;
}
const codeLike = s => /[()[\]=.$<]/.test(s) && !/\b\w+ \w+ \w+ \w+\b/.test(s.replace(/"[^"]*"|'[^']*'/g, ''));

function exercise(q, s) {
  const base = { id: q.id, hint: q.hint || '' };
  if (s === 'sql' && !q.sql) return { ...base, kind: 'write', q: q.q, code: q.code || '', accept: q.a, solution: q.a[0] };
  if (s === 'sql') return { ...base, kind: 'query', q: q.q, pattern: q.code || '', sql: q.sql, check: q.check || '', ordered: q.ordered, must: q.must || [], solution: q.a[0] };
  if (q.t === 'code') return { ...base, kind: 'code', q: q.q, setup: q.setup || '', starter: q.starter || '', tests: q.tests, solution: q.solution };
  if (q.t === 'parsons') return { ...base, kind: 'order', q: q.q, pieces: shuffle(q.lines.concat(q.distract || []), q.id), tests: q.tests || '', setup: q.setup || '', solution: q.lines.join('\n') };
  if (q.t === 'type') return { ...base, kind: 'write', q: q.q, code: q.code || '', accept: q.a, solution: q.a[0] };
  if (q.t === 'mc') {
    const a = q.opts[q.a];
    if (q.code && /print|output|return|result|show|value|gives/i.test(q.q)) return { ...base, kind: 'output', q: q.q, code: q.code, accept: [a], solution: a };
    if (q.alt || (!/\bwhich\b/i.test(q.q) && codeLike(a))) return { ...base, kind: 'write', q: q.q, code: q.code || '', accept: [a, ...(q.alt || [])], solution: a };
  }
  return null;
}

const subjects = [];
let total = 0;
for (const [key, name] of SUBJECTS) {
  require(path.join(SRC, key + '.js'));
  const c = window.CONTENT[key];
  const units = c.units.map((u, ui) => ({
    title: u.title,
    lessons: u.lessons.map((l, li) => ({
      title: l.title,
      teach: l.teach ? { text: l.teach.text || '', code: l.teach.code || '' } : null,
      ex: l.qs.map(q => exercise(q, key)).filter(Boolean),
    })).filter(l => l.ex.length),
  }));
  const n = units.reduce((t, u) => t + u.lessons.reduce((a, l) => a + l.ex.length, 0), 0);
  total += n;
  console.log(name, n, 'exercises');
  subjects.push({ key, name, units, ...(key === 'sql' ? { db: c.db, schema: c.schema } : {}) });
}

const data = JSON.stringify({ subjects }).replace(/</g, '\\u003c');
const html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8').replace('/*DATA*/null', () => data);
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(total, 'exercises; wrote index.html', Math.round(html.length / 1024), 'KB');
