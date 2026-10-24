(() => {
'use strict';
const app = document.getElementById('app');
const KEY = 'joc-progress-v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qid = (w, s, q) => `w${w}-s${s}-q${q}`;
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const isCorrect = (q, st) => !!(st && st.checked && sameSet(st.sel, q.answer));

function weekStats(wk) {
  let total = 0, checked = 0, correct = 0;
  wk.sets.forEach((set, si) => set.questions.forEach(q => {
    total++;
    const st = store[qid(wk.week, si, q.n)];
    if (st && st.checked) { checked++; if (isCorrect(q, st)) correct++; }
  }));
  return { total, checked, correct };
}
function setStats(wk, si) {
  const set = wk.sets[si]; let checked = 0, correct = 0;
  set.questions.forEach(q => {
    const st = store[qid(wk.week, si, q.n)];
    if (st && st.checked) { checked++; if (isCorrect(q, st)) correct++; }
  });
  return { total: set.questions.length, checked, correct };
}

/* rich text: lines starting with • become bullet lists */
function richLines(text) {
  const lines = text.split('\n').filter(l => l.trim());
  let html = '', list = [];
  const flush = () => { if (list.length) { html += `<ul>${list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`; list = []; } };
  lines.forEach(l => {
    if (l.trim().startsWith('•')) list.push(l.replace(/^\s*•\s*/, ''));
    else { flush(); html += `<p>${esc(l)}</p>`; }
  });
  flush(); return html;
}
function passageHtml(paras) {
  let html = '', list = [];
  const flush = () => { if (list.length) { html += `<ul>${list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`; list = []; } };
  paras.forEach(p => {
    if (p.startsWith('•')) list.push(p.replace(/^•\s*/, ''));
    else { flush(); html += `<p>${esc(p)}</p>`; }
  });
  flush(); return html;
}
const imgsHtml = imgs => imgs.map(src => `
  <div class="code-wrap">
    <div class="code-label">Program</div>
    <img class="code-img" src="${src}" alt="Program code for this scenario" loading="lazy">
    <div class="hint">Click the code to enlarge</div>
  </div>`).join('');

/* ---------- views ---------- */
function homeView() {
  let answered = 0, correct = 0, total = 0, done = 0;
  DATA.forEach(wk => { const s = weekStats(wk); answered += s.checked; correct += s.correct; total += s.total; if (s.checked === s.total) done++; });
  const acc = answered ? Math.round(correct / answered * 100) : 0;
  const cards = DATA.map(wk => {
    const s = weekStats(wk), pct = Math.round(s.checked / s.total * 100);
    const status = s.checked === s.total ? `<span class="badge done">Completed · ${s.correct}/${s.total}</span>`
      : s.checked ? `<span class="badge">In progress</span>` : `<span class="badge">Not started</span>`;
    return `<a class="card week-card" href="#/week/${wk.week}">
      <span class="wk">Week</span><h3>Week ${String(wk.week).padStart(2, '0')}</h3>
      <div class="meta">${wk.sets.length} scenarios · ${s.total} questions</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="meta">${s.checked}/${s.total} answered</div>${status}</a>`;
  }).join('');
  return `
  <section class="hero">
    <h1>Joy of Computing using Python</h1>
    <p>Week-wise assignment practice for Weeks 1–12. Read the scenario, study the program, and answer single-choice (MCQ) and multiple-select (MSQ) questions with instant explanations.</p>
    <div class="hero-stats">
      <div class="stat"><b>${total}</b><span>Questions</span></div>
      <div class="stat"><b>${answered}</b><span>Answered</span></div>
      <div class="stat"><b>${acc}%</b><span>Accuracy</span></div>
      <div class="stat"><b>${done}/12</b><span>Weeks done</span></div>
    </div>
  </section>
  <h2 class="section-title">Choose a week <button class="link-btn" id="resetAll">Reset all progress</button></h2>
  <div class="grid">${cards}</div>`;
}

function questionHtml(wk, si, q) {
  const id = qid(wk.week, si, q.n), st = store[id] || { sel: [], checked: false };
  const msq = q.type === 'msq', checked = st.checked, ok = isCorrect(q, st);
  const opts = q.options.map(([k, t]) => {
    const sel = st.sel.includes(k), right = q.answer.includes(k);
    let cls = 'opt';
    if (checked) { if (right && sel) cls += ' ok'; else if (!right && sel) cls += ' no'; else if (right) cls += ' missed'; }
    else if (sel) cls += ' sel';
    return `<button class="${cls}" data-id="${id}" data-k="${k}" ${checked ? 'disabled' : ''} aria-pressed="${sel}"><span class="k">${k}</span><span>${esc(t)}</span></button>`;
  }).join('');
  const result = checked ? `
    <div class="result ${ok ? 'ok' : 'bad'}">
      <h4>${ok ? '✓ Correct' : '✗ Incorrect'} — Correct answer${q.answer.length > 1 ? 's' : ''}: ${q.answer.join(', ')}</h4>
      ${richLines(q.just)}
    </div>` : '';
  return `<article class="card q ${msq ? 'msq' : ''} ${checked ? (ok ? 'correct' : 'wrong') : ''}" id="${id}">
    <div class="q-top"><span class="q-num">Q${q.n}</span><span class="type ${msq ? 'msq' : ''}">${msq ? 'MSQ · SELECT ALL THAT APPLY' : 'MCQ · SINGLE CHOICE'}</span></div>
    <p class="stem">${esc(q.stem)}</p>
    ${imgsHtml(q.img || [])}
    <div class="opts">${opts}</div>
    <div class="q-actions">
      <button class="btn" data-check="${id}" ${checked || !st.sel.length ? 'disabled' : ''}>Check answer</button>
      ${checked ? `<button class="btn ghost" data-retry="${id}">Try again</button>` : ''}
    </div>${result}
  </article>`;
}

function weekView(n, si) {
  const wk = DATA.find(w => w.week === n);
  if (!wk) return `<p>Week not found. <a href="#/">Go home</a></p>`;
  si = Math.min(Math.max(si, 0), wk.sets.length - 1);
  const set = wk.sets[si], ws = weekStats(wk);
  const acc = ws.checked ? Math.round(ws.correct / ws.checked * 100) : 0;
  const tabs = wk.sets.map((s, i) => { const t = setStats(wk, i);
    return `<a class="tab ${i === si ? 'active' : ''}" href="#/week/${n}/${i + 1}">Scenario ${i + 1} <small>${t.checked}/${t.total}</small></a>`; }).join('');
  const last = si === wk.sets.length - 1;
  const prev = si > 0 ? `<a class="btn ghost" href="#/week/${n}/${si}">← Previous scenario</a>` : (n > 1 ? `<a class="btn ghost" href="#/week/${n - 1}/4">← Week ${n - 1}</a>` : '<span></span>');
  const next = !last ? `<a class="btn" href="#/week/${n}/${si + 2}">Next scenario →</a>` : (n < DATA.length ? `<a class="btn" href="#/week/${n + 1}">Week ${n + 1} →</a>` : '<span></span>');
  let summary = '';
  if (last) {
    const bd = wk.sets.map((s, i) => { const t = setStats(wk, i); return `<div><b>${t.correct}/${t.total}</b>Scenario ${i + 1}</div>`; }).join('');
    summary = `<section class="card summary"><div class="big">${ws.correct}/${ws.total}</div>
      <p>${ws.checked < ws.total ? `You have answered ${ws.checked} of ${ws.total} questions. Finish all to see your final score.` : acc >= 80 ? 'Excellent work! 🎉' : acc >= 50 ? 'Good effort — review the explanations and retry.' : 'Keep practising — read the explanations and try again.'}</p>
      <div class="breakdown">${bd}</div>
      <button class="btn ghost" id="resetWeek">Reset this week</button></section>`;
  }
  return `
  <div class="crumbs"><a href="#/">Home</a> / Week ${n}</div>
  <div class="week-head"><h1>Week ${String(n).padStart(2, '0')} Assignment</h1>
    <div class="score-pill"><div><b>${ws.checked}/${ws.total}</b><span>Answered</span></div><div><b>${ws.correct}</b><span>Correct</span></div><div><b>${acc}%</b><span>Accuracy</span></div></div></div>
  <div class="bar"><i style="width:${Math.round(ws.checked / ws.total * 100)}%"></i></div>
  <div class="tabs">${tabs}</div>
  <section class="card passage"><span class="tag">Scenario ${si + 1} of ${wk.sets.length}</span><h2>${esc(set.title)}</h2>
    ${passageHtml(set.text)}${imgsHtml(set.images)}</section>
  ${set.questions.map(q => questionHtml(wk, si, q)).join('')}
  <div class="set-nav">${prev}${next}</div>${summary}`;
}

/* ---------- router ---------- */
function render(keepScroll) {
  const y = window.scrollY;
  const m = location.hash.match(/^#\/week\/(\d+)(?:\/(\d+))?/);
  app.innerHTML = m ? weekView(+m[1], (+m[2] || 1) - 1) : homeView();
  window.scrollTo(0, keepScroll ? y : 0);
  document.title = m ? `Week ${m[1]} · Joy of Computing` : 'Joy of Computing using Python — Assignment Practice';
}
window.addEventListener('hashchange', () => render(false));

/* ---------- interactions ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const opt = t.closest('.opt');
  if (opt && !opt.disabled) {
    const id = opt.dataset.id, k = opt.dataset.k;
    const q = findQ(id), st = store[id] || (store[id] = { sel: [], checked: false });
    if (q.type === 'msq') st.sel = st.sel.includes(k) ? st.sel.filter(x => x !== k) : [...st.sel, k];
    else st.sel = [k];
    save(); render(true); return;
  }
  const chk = t.closest('[data-check]');
  if (chk) { const st = store[chk.dataset.check]; if (st && st.sel.length) { st.checked = true; save(); render(true); } return; }
  const retry = t.closest('[data-retry]');
  if (retry) { delete store[retry.dataset.retry]; save(); render(true); return; }
  if (t.closest('#resetWeek')) {
    const n = +location.hash.match(/week\/(\d+)/)[1];
    if (confirm(`Reset all answers for Week ${n}?`)) { Object.keys(store).forEach(k => k.startsWith(`w${n}-`) && delete store[k]); save(); location.hash = `#/week/${n}/1`; render(false); }
    return;
  }
  if (t.closest('#resetAll')) { if (confirm('Reset progress for all weeks?')) { store = {}; save(); render(false); } return; }
  if (t.classList.contains('code-img')) {
    const lb = document.getElementById('lightbox'); lb.querySelector('img').src = t.src; lb.hidden = false; return;
  }
  if (t.closest('#lightbox')) document.getElementById('lightbox').hidden = true;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('lightbox').hidden = true; });

function findQ(id) {
  const [, w, s, q] = id.match(/^w(\d+)-s(\d+)-q(\d+)$/).map(Number);
  return DATA.find(x => x.week === w).sets[s].questions.find(x => x.n === q);
}

/* ---------- theme ---------- */
const root = document.documentElement;
const savedTheme = localStorage.getItem('joc-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
root.dataset.theme = savedTheme;
document.getElementById('themeBtn').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next; try { localStorage.setItem('joc-theme', next); } catch (e) {}
});

render(false);
})();
