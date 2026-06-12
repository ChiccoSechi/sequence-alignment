const DIAG = '↖', UP = '↑', LEFT = '←';
const MAX_PATHS = 64; 
const CELL_DETAIL_HINT = 'Click any matrix cell to see how its score was computed.';

const els = {
  seq1: document.getElementById('seq1'),
  seq2: document.getElementById('seq2'),
  match: document.getElementById('matchScore'),
  mismatch: document.getElementById('mismatchPenalty'),
  gap: document.getElementById('gapPenalty'),
  error: document.getElementById('errorMsg'),
  runBtn: document.getElementById('runBtn'),
  resetBtn: document.getElementById('resetBtn'),
  chips: document.getElementById('chips'),
  matrixWrap: document.getElementById('matrixWrap'),
  cellDetail: document.getElementById('cellDetail'),
  pathsCount: document.getElementById('pathsCount'),
  pathsList: document.getElementById('pathsList'),
  alignmentArea: document.getElementById('alignmentArea'),
};

const DEFAULTS = { seq1: 'GATTACA', seq2: 'GCATGCT', match: 1, mismatch: -1, gap: -1 };

let algo = null;  
let state = null;


function showError(msg) { els.error.textContent = msg; }
function clearError() { els.error.textContent = ''; }
function sanitize(raw) { return raw.trim().toUpperCase(); }

function validate(seq1, seq2) {
  if (!seq1 || !seq2) return 'Both sequences are required.';
  if (!/^[ACGUT]+$/.test(seq1) || !/^[ACGUT]+$/.test(seq2))
    return 'Sequences may contain only A, C, G, U, T (no spaces, digits, or symbols).';
  return null;
}

function densityClasses(dim) {
  if (dim > 16) return ' dense2 smallfont2';
  if (dim > 12) return ' dense smallfont';
  return '';
}

function makeCell(text, cls) {
  const td = document.createElement('td');
  td.className = cls;
  td.textContent = text;
  return td;
}

function cellEl(i, j) {
  return els.matrixWrap.querySelector(`td.cell-data[data-i="${i}"][data-j="${j}"]`);
}

function scoreAlignment(mid, params) {
  let total = 0;
  for (const kind of mid) {
    if (kind === 'match') total += params.matchScore;
    else if (kind === 'mismatch') total += params.mismatchPenalty;
    else total += params.gapPenalty; // gap
  }
  return total;
}

function renderOptions(opts, best) {
  return opts.map(o => {
    const win = o.value === best ? ' win' : '';
    return `<div class="cd-opt${win}">` +
      `<span class="cd-arrow">${o.arrow}</span>` +
      `<span class="cd-label">${o.label}</span>` +
      `<span class="cd-formula">${o.formula}</span>` +
      `</div>`;
  }).join('');
}

function appendScoreLine(container, text) {
  const el = document.createElement('div');
  el.className = 'score-display';
  el.textContent = text;
  container.appendChild(el);
}

function run() {
  clearError();
  const seq1 = sanitize(els.seq1.value);
  const seq2 = sanitize(els.seq2.value);
  const err = validate(seq1, seq2);
  if (err) { showError(err); return; }

  const matchScore = parseInt(els.match.value, 10);
  const mismatchPenalty = parseInt(els.mismatch.value, 10);
  const gapPenalty = parseInt(els.gap.value, 10);
  if ([matchScore, mismatchPenalty, gapPenalty].some(Number.isNaN)) {
    showError('Match, mismatch, and gap must be numbers.');
    return;
  }
  const params = { matchScore, mismatchPenalty, gapPenalty };

  const computed = algo.compute(seq1, seq2, params);
  const paths = algo.enumerate(computed, seq1, seq2);
  state = Object.assign({ seq1, seq2, params, paths, selectedPath: 0 }, computed);

  renderMatrix();
  renderPaths();
  if (paths.length) selectPath(0);
  else els.alignmentArea.innerHTML = `<p class="placeholder">${algo.noPathsMessage}</p>`;
}

function reset() {
  els.seq1.value = DEFAULTS.seq1;
  els.seq2.value = DEFAULTS.seq2;
  els.match.value = DEFAULTS.match;
  els.mismatch.value = DEFAULTS.mismatch;
  els.gap.value = DEFAULTS.gap;
  clearError();
  state = null;
  els.matrixWrap.innerHTML = '<p class="placeholder">Run an alignment to build the matrix.</p>';
  els.cellDetail.innerHTML = `<p class="placeholder">${CELL_DETAIL_HINT}</p>`;
  els.pathsCount.textContent = 'Run an alignment to see paths.';
  els.pathsList.innerHTML = '';
  els.alignmentArea.innerHTML = '<p class="placeholder">Select a path to view its alignment.</p>';
}

function renderMatrix() {
  const { seq1, seq2, score, arrows } = state;
  const n = seq1.length, m = seq2.length;
  const dim = Math.max(n, m) + 1;

  const table = document.createElement('table');
  table.className = 'matrix' + densityClasses(dim);

  const headRow = document.createElement('tr');
  headRow.appendChild(makeCell('', 'cell-corner'));
  headRow.appendChild(makeCell('-', 'cell-header'));
  for (let j = 0; j < m; j++) headRow.appendChild(makeCell(seq2[j], 'cell-header'));
  table.appendChild(headRow);

  for (let i = 0; i <= n; i++) {
    const row = document.createElement('tr');
    row.appendChild(makeCell(i === 0 ? '-' : seq1[i - 1], 'cell-header'));
    for (let j = 0; j <= m; j++) {
      const td = document.createElement('td');
      td.className = 'cell-data';
      td.dataset.i = i;
      td.dataset.j = j;
      const sc = document.createElement('span');
      sc.className = 'score';
      sc.textContent = score[i][j];
      td.appendChild(sc);
      if (arrows[i][j] && arrows[i][j].length) {
        const ar = document.createElement('span');
        ar.className = 'arrows';
        ar.textContent = arrows[i][j].join('');
        td.appendChild(ar);
      }
      td.addEventListener('click', () => showCellDetail(i, j));
      row.appendChild(td);
    }
    table.appendChild(row);
  }

  els.matrixWrap.innerHTML = '';
  els.matrixWrap.appendChild(table);
  els.cellDetail.innerHTML = `<p class="placeholder">${CELL_DETAIL_HINT}</p>`;
  paintPaths();
}

function paintPaths() {
  els.matrixWrap.querySelectorAll('td.cell-data').forEach(td =>
    td.classList.remove('on-path', 'selected-path', 'start-cell', 'end-cell', 'max-cell'));

  const { paths, selectedPath } = state;

  const union = new Set();
  paths.forEach(p => p.forEach(([i, j]) => union.add(i + ',' + j)));
  union.forEach(key => {
    const [i, j] = key.split(',').map(Number);
    const td = cellEl(i, j);
    if (td) td.classList.add('on-path');
  });

  if (paths[selectedPath]) {
    paths[selectedPath].forEach(([i, j]) => {
      const td = cellEl(i, j);
      if (td) td.classList.add('selected-path');
    });
  }

  algo.paintExtra(state);
}

function renderPaths() {
  const { paths } = state;
  const count = paths.length;
  let label = `${count} path${count === 1 ? '' : 's'} found`;
  if (count >= MAX_PATHS) label += ` (showing first ${MAX_PATHS})`;
  els.pathsCount.textContent = label;

  els.pathsList.innerHTML = '';
  paths.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'path-item';
    item.dataset.idx = idx;
    item.textContent = `Path ${idx + 1}: ${algo.pathLabel(p, state)}`;
    item.addEventListener('click', () => selectPath(idx));
    els.pathsList.appendChild(item);
  });
}

function selectPath(idx) {
  if (!state || !state.paths.length) return;
  state.selectedPath = idx;
  els.pathsList.querySelectorAll('.path-item').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.idx) === idx);
  });
  paintPaths();
  renderAlignment(idx);
}

function appendLabel(line, text) {
  const span = document.createElement('span');
  span.className = 'label';
  span.textContent = text;
  line.appendChild(span);
}

function renderAlignment(idx) {
  const path = state.paths[idx];
  if (!path) return;
  const al = algo.build(path, state.seq1, state.seq2); 

  const line1 = document.createElement('div');
  const line2 = document.createElement('div');
  const line3 = document.createElement('div');
  appendLabel(line1, 'Seq1:  ');
  appendLabel(line2, '       ');
  appendLabel(line3, 'Seq2:  ');

  for (let k = 0; k < al.top.length; k++) {
    const m1 = document.createElement('span');
    const m3 = document.createElement('span');
    if (al.mid[k] === 'match') { m1.className = 'match-char'; m3.className = 'match-char'; }
    m1.textContent = al.top[k] + ' ';
    m3.textContent = al.bottom[k] + ' ';
    line1.appendChild(m1);
    line3.appendChild(m3);

    const mc = document.createElement('span');
    mc.className = 'midline';
    mc.textContent = (al.mid[k] === 'match' ? '|' : al.mid[k] === 'mismatch' ? '.' : ' ') + ' ';
    line2.appendChild(mc);
  }

  const block = document.createElement('div');
  block.className = 'alignment-result';
  block.appendChild(line1);
  block.appendChild(line2);
  block.appendChild(line3);

  els.alignmentArea.innerHTML = '';
  els.alignmentArea.appendChild(block);
  algo.renderResult(els.alignmentArea, al, state);
}

function showCellDetail(i, j) {
  if (!state || !els.cellDetail) return;

  els.matrixWrap.querySelectorAll('td.cell-data.inspected')
    .forEach(td => td.classList.remove('inspected'));
  const td = cellEl(i, j);
  if (td) td.classList.add('inspected');

  const d = algo.cellDetail(i, j, state);
  els.cellDetail.innerHTML =
    `<div class="cd-header">${d.header}</div>` +
    `<div class="cd-options">${d.optionsHTML}</div>` +
    `<div class="cd-result">${d.result}</div>`;
}

function initAligner(config) {
  algo = config;
  els.runBtn.addEventListener('click', run);
  els.resetBtn.addEventListener('click', reset);
  els.chips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    els.seq1.value = chip.dataset.s1;
    els.seq2.value = chip.dataset.s2;
    run();
  });
  [els.seq1, els.seq2].forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  });
  run();
}
