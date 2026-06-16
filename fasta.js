const DEFAULTS = { seq1: 'ATGCGTACGA', seq2: 'TTATGCGTAATCGA', k: 2 };

const DIAGONAL_BASES = [
  '239,68,68',
  '59,130,246',
  '34,197,94',
  '249,115,22',
  '168,85,247',
  '236,72,153',
  '20,184,166',
  '234,179,8',
  '132,204,22',
  '6,182,212',
];

function rgba(base, a) { return `rgba(${base},${a})`; }

function diagName(idx) {
  const letter = String.fromCharCode(65 + (idx % 26));
  const wrap = Math.floor(idx / 26);
  return wrap ? letter + wrap : letter;
}

const BOX = 36;

const els = {
  seq1: document.getElementById('seq1'),
  seq2: document.getElementById('seq2'),
  k: document.getElementById('kVal'),
  error: document.getElementById('errorMsg'),
  runBtn: document.getElementById('runBtn'),
  resetBtn: document.getElementById('resetBtn'),
  chips: document.getElementById('chips'),
  step1: document.getElementById('step1Panel'),
  step2: document.getElementById('step2Panel'),
  step3: document.getElementById('step3Panel'),
};

function showError(msg) { els.error.textContent = msg; }
function clearError() { els.error.textContent = ''; }
function sanitize(raw) { return raw.trim().toUpperCase(); }

function resetPanel(panel, heading, placeholder) {
  panel.innerHTML = '';
  const h = document.createElement('h3');
  h.textContent = heading;
  const p = document.createElement('p');
  p.className = 'placeholder';
  p.textContent = placeholder;
  panel.appendChild(h);
  panel.appendChild(p);
}

function clearToHeading(panel, heading) {
  panel.innerHTML = '';
  const h = document.createElement('h3');
  h.textContent = heading;
  panel.appendChild(h);
}

function getKTuples(seq, k) {
  const tuples = [];
  for (let i = 0; i + k <= seq.length; i++) {
    tuples.push({ tuple: seq.slice(i, i + k), posQ: i + 1 });
  }
  return tuples;
}

function findMatches(query, target, k) {
  const matches = [];
  const kTuples = getKTuples(query, k);
  for (const { tuple, posQ } of kTuples) {
    for (let j = 0; j + k <= target.length; j++) {
      if (target.slice(j, j + k) === tuple) {
        const posT = j + 1;
        matches.push({ tuple, posQ, posT, diagonal: posT - posQ });
      }
    }
  }
  return matches;
}

function scoreDiagonals(matches) {
  const counts = new Map();
  for (const m of matches) {
    counts.set(m.diagonal, (counts.get(m.diagonal) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([diagonal, count]) => ({ diagonal, count }))
    .sort((a, b) => b.count - a.count);
}

function buildDiagInfo(matches) {
  const map = new Map();
  let next = 0;
  for (const m of matches) {
    if (!map.has(m.diagonal)) {
      map.set(m.diagonal, {
        name: diagName(next),
        base: DIAGONAL_BASES[next % DIAGONAL_BASES.length],
      });
      next++;
    }
  }
  return map;
}

function charBox(ch, { header } = {}) {
  const box = document.createElement('span');
  box.textContent = ch;
  box.style.display = 'inline-block';
  box.style.width = BOX + 'px';
  box.style.height = BOX + 'px';
  box.style.lineHeight = BOX + 'px';
  box.style.textAlign = 'center';
  box.style.border = '1px solid var(--border)';
  box.style.fontFamily = "'IBM Plex Mono', monospace";
  box.style.fontWeight = '700';
  if (header) {
    box.style.background = 'var(--cell-header)';
    box.style.color = 'var(--cell-header-text)';
  } else {
    box.style.background = 'var(--path)';
    box.style.color = 'var(--accent)';
  }
  return box;
}

function nameChip(info) {
  const chip = document.createElement('span');
  chip.textContent = info.name;
  chip.style.display = 'inline-flex';
  chip.style.alignItems = 'center';
  chip.style.justifyContent = 'center';
  chip.style.minWidth = '20px';
  chip.style.height = '20px';
  chip.style.padding = '0 6px';
  chip.style.borderRadius = '5px';
  chip.style.fontFamily = "'IBM Plex Mono', monospace";
  chip.style.fontWeight = '700';
  chip.style.fontSize = '0.8rem';
  chip.style.background = `rgb(${info.base})`;
  chip.style.color = '#fff';
  return chip;
}

function renderStep1(query, k, panel) {
  clearToHeading(panel, 'K-tuple Generation');
  const tuples = getKTuples(query, k);

  const scroller = document.createElement('div');
  scroller.style.overflowX = 'auto';
  scroller.style.paddingBottom = '6px';

  const charRow = document.createElement('div');
  charRow.style.whiteSpace = 'nowrap';
  for (const ch of query) charRow.appendChild(charBox(ch, { header: true }));
  scroller.appendChild(charRow);

  for (const { tuple, posQ } of tuples) {
    const row = document.createElement('div');
    row.style.whiteSpace = 'nowrap';
    row.style.marginTop = '-1px';
    row.style.paddingLeft = ((posQ - 1) * BOX) + 'px';
    for (const ch of tuple) row.appendChild(charBox(ch));
    scroller.appendChild(row);
  }

  panel.appendChild(scroller);
}

function renderStep2(matches, diagonals, diagInfo, panel) {
  clearToHeading(panel, 'Exact Matches in Target');

  if (!matches.length) {
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = 'No exact k-tuple matches found in the Target.';
    panel.appendChild(p);
    return;
  }

  const layout = document.createElement('div');
  layout.style.display = 'flex';
  layout.style.flexWrap = 'wrap';
  layout.style.gap = '20px';
  layout.style.alignItems = 'flex-start';

  const tableCol = document.createElement('div');
  tableCol.style.flex = '1';
  tableCol.style.minWidth = '280px';

  const table = document.createElement('table');
  table.className = 'compare';

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['k-tuple', 'Pos in Q', 'Pos in T', 'Diagonal (posT − posQ)', 'Name'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const m of matches) {
    const tr = document.createElement('tr');
    const info = diagInfo.get(m.diagonal);
    tr.style.background = rgba(info.base, 0.12);
    [m.tuple, m.posQ, m.posT, m.diagonal].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    const nameTd = document.createElement('td');
    nameTd.appendChild(nameChip(info));
    tr.appendChild(nameTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableCol.appendChild(table);

  const summary = document.createElement('p');
  summary.style.marginTop = '14px';
  summary.style.fontFamily = "'IBM Plex Mono', monospace";
  summary.style.fontSize = '0.85rem';
  const best = diagonals[0];
  const bestName = diagInfo.get(best.diagonal).name;
  summary.textContent =
    `${diagonals.length} unique diagonal(s). ` +
    `Best diagonal: ${best.diagonal} (${bestName}) with ${best.count} match(es).`;
  tableCol.appendChild(summary);

  const recap = document.createElement('div');
  recap.style.minWidth = '200px';

  const recapTitle = document.createElement('div');
  recapTitle.className = 'chips-label';
  recapTitle.style.margin = '0 0 8px';
  recapTitle.textContent = 'Diagonal scores';
  recap.appendChild(recapTitle);

  for (const d of diagonals) {
    const info = diagInfo.get(d.diagonal);
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.fontFamily = "'IBM Plex Mono', monospace";
    row.style.fontSize = '0.85rem';
    row.style.marginBottom = '6px';

    row.appendChild(nameChip(info));

    const label = document.createElement('span');
    label.style.flex = '1';
    label.textContent = `Diagonal ${d.diagonal}`;
    row.appendChild(label);

    const score = document.createElement('span');
    score.style.fontWeight = '700';
    score.style.color = 'var(--accent)';
    score.textContent = d.count;
    row.appendChild(score);

    recap.appendChild(row);
  }

  layout.appendChild(tableCol);
  layout.appendChild(recap);
  panel.appendChild(layout);
}

function renderStep3(query, target, matches, diagonals, diagInfo, panel) {
  clearToHeading(panel, 'Diagonal Matrix');

  if (!matches.length) {
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = 'No k-tuple matches to place on the matrix.';
    panel.appendChild(p);
    return;
  }

  const n = query.length, m = target.length;

  const matchCells = new Map();
  for (const mt of matches) matchCells.set(mt.posQ + ',' + mt.posT, mt.diagonal);

  const wrap = document.createElement('div');
  wrap.className = 'matrix-wrap';

  const dim = Math.max(n, m);
  let dense = '';
  if (dim > 16) dense = ' dense2 smallfont2';
  else if (dim > 12) dense = ' dense smallfont';

  const table = document.createElement('table');
  table.className = 'matrix' + dense;

  const headRow = document.createElement('tr');
  const corner = document.createElement('td');
  corner.className = 'cell-corner';
  headRow.appendChild(corner);
  for (let j = 0; j < m; j++) {
    const th = document.createElement('td');
    th.className = 'cell-header';
    th.textContent = target[j];
    headRow.appendChild(th);
  }
  table.appendChild(headRow);

  for (let i = 1; i <= n; i++) {
    const tr = document.createElement('tr');
    const rh = document.createElement('td');
    rh.className = 'cell-header';
    rh.textContent = query[i - 1];
    tr.appendChild(rh);
    for (let j = 1; j <= m; j++) {
      const td = document.createElement('td');
      td.className = 'cell-data';
      td.style.cursor = 'default';
      td.dataset.i = i;
      td.dataset.j = j;
      if (matchCells.has(i + ',' + j)) {
        const diag = matchCells.get(i + ',' + j);
        td.dataset.match = '1';
        td.dataset.diag = diag;
        td.textContent = diagInfo.get(diag).name;
        td.style.fontWeight = '700';
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  wrap.appendChild(table);
  panel.appendChild(wrap);

  const scoreLine = document.createElement('div');
  scoreLine.className = 'score-display';
  panel.appendChild(scoreLine);

  const list = document.createElement('div');
  list.className = 'paths-list';
  list.style.marginTop = '12px';
  panel.appendChild(list);

  const matchTds = Array.from(table.querySelectorAll('td.cell-data[data-match="1"]'));
  const countByDiag = new Map(diagonals.map(d => [d.diagonal, d.count]));

  function paint(selected) {
    for (const td of matchTds) {
      const diag = Number(td.dataset.diag);
      const info = diagInfo.get(diag);
      if (diag === selected) {
        td.style.background = `rgb(${info.base})`;
        td.style.color = '#fff';
        td.style.boxShadow = 'inset 0 0 0 2px var(--accent)';
      } else {
        td.style.background = rgba(info.base, 0.22);
        td.style.color = 'var(--text-primary)';
        td.style.boxShadow = '';
      }
    }
    list.querySelectorAll('.path-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.diag) === selected);
    });
    const info = diagInfo.get(selected);
    scoreLine.textContent =
      `Diagonal ${selected} (${info.name}): score ${countByDiag.get(selected)} match(es)`;
  }

  diagonals.forEach(d => {
    const item = document.createElement('div');
    item.className = 'path-item';
    item.dataset.diag = d.diagonal;
    const info = diagInfo.get(d.diagonal);
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '10px';
    item.appendChild(nameChip(info));
    const txt = document.createElement('span');
    txt.textContent = `Diagonal ${d.diagonal}`;
    item.appendChild(txt);
    item.addEventListener('click', () => paint(d.diagonal));
    list.appendChild(item);
  });

  paint(diagonals[0].diagonal);
}

function run() {
  clearError();
  const seq1 = sanitize(els.seq1.value);
  const seq2 = sanitize(els.seq2.value);
  const k = parseInt(els.k.value, 10);

  if (!seq1 || !seq2) { showError('Both Query and Target are required.'); return; }
  if (!/^[ACGUT]+$/.test(seq1) || !/^[ACGUT]+$/.test(seq2)) {
    showError('Sequences may contain only A, C, G, U, T (no spaces, digits, or symbols).');
    return;
  }
  if (Number.isNaN(k) || k < 1) { showError('k must be an integer of at least 1.'); return; }
  const maxK = Math.min(seq1.length, seq2.length);
  if (k > maxK) { showError(`k must be at most ${maxK} (the shorter sequence length).`); return; }

  const matches = findMatches(seq1, seq2, k);
  const diagonals = scoreDiagonals(matches);
  const diagInfo = buildDiagInfo(matches);

  renderStep1(seq1, k, els.step1);
  renderStep2(matches, diagonals, diagInfo, els.step2);
  renderStep3(seq1, seq2, matches, diagonals, diagInfo, els.step3);
}

function reset() {
  els.seq1.value = DEFAULTS.seq1;
  els.seq2.value = DEFAULTS.seq2;
  els.k.value = DEFAULTS.k;
  clearError();
  resetPanel(els.step1, 'K-tuple Generation', 'Run FASTA to see k-tuples.');
  resetPanel(els.step2, 'Exact Matches in Target', 'Run FASTA to see matches.');
  resetPanel(els.step3, 'Diagonal Matrix', 'Run FASTA to see the diagonal matrix.');
}

document.addEventListener('DOMContentLoaded', () => {
  els.runBtn.addEventListener('click', run);
  els.resetBtn.addEventListener('click', reset);

  els.chips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    els.seq1.value = chip.dataset.s1;
    els.seq2.value = chip.dataset.s2;
    if (chip.dataset.k) els.k.value = chip.dataset.k;
    run();
  });

  [els.seq1, els.seq2, els.k].forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  });

  run();
});
