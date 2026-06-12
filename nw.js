function computeNW(seq1, seq2, params) {
  const { matchScore, mismatchPenalty, gapPenalty } = params;
  const n = seq1.length, m = seq2.length;
  const score = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const arrows = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => []));

  for (let i = 1; i <= n; i++) { score[i][0] = i * gapPenalty; arrows[i][0] = [UP]; }
  for (let j = 1; j <= m; j++) { score[0][j] = j * gapPenalty; arrows[0][j] = [LEFT]; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchPenalty;
      const diag = score[i - 1][j - 1] + s;
      const up = score[i - 1][j] + gapPenalty;
      const left = score[i][j - 1] + gapPenalty;
      const best = Math.max(diag, up, left);
      score[i][j] = best;
      const a = [];
      if (diag === best) a.push(DIAG);
      if (up === best) a.push(UP);
      if (left === best) a.push(LEFT);
      arrows[i][j] = a;
    }
  }
  return { score, arrows };
}

function enumerateNWPaths(arrows, n, m) {
  const paths = [];

  function walk(i, j, acc) {
    if (paths.length >= MAX_PATHS) return;
    acc.push([i, j]);
    if (i === 0 && j === 0) { paths.push(acc.slice()); acc.pop(); return; }
    for (const dir of arrows[i][j]) {
      if (dir === DIAG) walk(i - 1, j - 1, acc);
      else if (dir === UP) walk(i - 1, j, acc);
      else if (dir === LEFT) walk(i, j - 1, acc);
      if (paths.length >= MAX_PATHS) break;
    }
    acc.pop();
  }

  walk(n, m, []);
  return paths;
}

function buildNWAlignment(path, seq1, seq2) {
  const top = [], mid = [], bottom = [];
  for (let k = 0; k < path.length - 1; k++) {
    const [i, j] = path[k];
    const [pi, pj] = path[k + 1];
    if (pi === i - 1 && pj === j - 1) {
      const c1 = seq1[i - 1], c2 = seq2[j - 1];
      top.unshift(c1); bottom.unshift(c2);
      mid.unshift(c1 === c2 ? 'match' : 'mismatch');
    } else if (pi === i - 1 && pj === j) {
      top.unshift(seq1[i - 1]); bottom.unshift('-'); mid.unshift('gap');
    } else {
      top.unshift('-'); bottom.unshift(seq2[j - 1]); mid.unshift('gap');
    }
  }
  return { top, mid, bottom };
}

function nwCellDetail(i, j, st) {
  const { seq1, seq2, score, params } = st;
  const { matchScore, mismatchPenalty, gapPenalty } = params;

  if (i === 0 && j === 0) {
    return {
      header: 'Cell (0, 0): origin',
      optionsHTML: '<div class="cd-note">The top-left cell starts the matrix.</div>',
      result: 'Score[0,0] = 0',
    };
  }
  if (i === 0 || j === 0) {
    const k = i === 0 ? j : i;
    return {
      header: `Cell (${i}, ${j}): initialization`,
      optionsHTML: '<div class="cd-note">First row and column hold cumulative gap penalties.</div>',
      result: `Score[${i},${j}] = ${k} &times; gap = ${k} &times; (${gapPenalty}) = ${score[i][j]}`,
    };
  }

  const X = seq1[i - 1], Y = seq2[j - 1];
  const isMatch = X === Y;
  const sub = isMatch ? matchScore : mismatchPenalty;
  const diag = score[i - 1][j - 1] + sub;
  const up = score[i - 1][j] + gapPenalty;
  const left = score[i][j - 1] + gapPenalty;
  const best = Math.max(diag, up, left);
  const opts = [
    { arrow: '↖', label: `diagonal (${isMatch ? 'match' : 'mismatch'})`,
      formula: `${score[i - 1][j - 1]} + (${sub}) = ${diag}`, value: diag },
    { arrow: '↑', label: 'top (gap in Seq2)',
      formula: `${score[i - 1][j]} + (${gapPenalty}) = ${up}`, value: up },
    { arrow: '←', label: 'left (gap in Seq1)',
      formula: `${score[i][j - 1]} + (${gapPenalty}) = ${left}`, value: left },
  ];
  const winners = opts.filter(o => o.value === best).map(o => o.arrow).join(' ');
  return {
    header: `Cell (${i}, ${j}): Seq1 "${X}" vs Seq2 "${Y}"`,
    optionsHTML: renderOptions(opts, best),
    result: `Score[${i},${j}] = max(${diag}, ${up}, ${left}) = ${best} &nbsp; ${winners}`,
  };
}

initAligner({
  compute: computeNW,
  enumerate: (computed, seq1, seq2) =>
    enumerateNWPaths(computed.arrows, seq1.length, seq2.length),
  build: buildNWAlignment,
  pathLabel: (path) => path.map(([i, j]) => `(${i},${j})`).join('→'),
  paintExtra: (st) => {
    const start = cellEl(st.seq1.length, st.seq2.length);
    if (start) start.classList.add('start-cell');
    const end = cellEl(0, 0);
    if (end) end.classList.add('end-cell');
  },
  renderResult: (container, al, st) => {
    appendScoreLine(container, `Alignment Score: ${scoreAlignment(al.mid, st.params)}`);
  },
  cellDetail: nwCellDetail,
  noPathsMessage: 'No alignment could be computed.',
});
