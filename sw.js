function computeSW(seq1, seq2, params) {
  const { matchScore, mismatchPenalty, gapPenalty } = params;
  const n = seq1.length, m = seq2.length;
  const score = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const arrows = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => []));
  let maxScore = 0;
  let maxCells = [];

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchPenalty;
      const diag = score[i - 1][j - 1] + s;
      const up = score[i - 1][j] + gapPenalty;
      const left = score[i][j - 1] + gapPenalty;
      const best = Math.max(diag, up, left, 0);
      score[i][j] = best;

      if (best > 0) {
        const a = [];
        if (diag === best) a.push(DIAG);
        if (up === best) a.push(UP);
        if (left === best) a.push(LEFT);
        arrows[i][j] = a;
      }

      if (best > maxScore) { maxScore = best; maxCells = [[i, j]]; }
      else if (best === maxScore && best > 0) maxCells.push([i, j]);
    }
  }
  return { score, arrows, maxScore, maxCells };
}

function enumerateSWPaths(arrows, maxCells) {
  const paths = [];

  function walk(i, j, acc) {
    if (paths.length >= MAX_PATHS) return;
    acc.push([i, j]);
    if (!arrows[i][j] || arrows[i][j].length === 0) { paths.push(acc.slice()); acc.pop(); return; }
    for (const dir of arrows[i][j]) {
      if (dir === DIAG) walk(i - 1, j - 1, acc);
      else if (dir === UP) walk(i - 1, j, acc);
      else if (dir === LEFT) walk(i, j - 1, acc);
      if (paths.length >= MAX_PATHS) break;
    }
    acc.pop();
  }

  for (const [i, j] of maxCells) {
    walk(i, j, []);
    if (paths.length >= MAX_PATHS) break;
  }
  return paths;
}

function buildSWAlignment(path, seq1, seq2) {
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
  const iStart = path[0][0], jStart = path[0][1];
  const iEnd = path[path.length - 1][0], jEnd = path[path.length - 1][1];
  return { top, mid, bottom, region1: [iEnd + 1, iStart], region2: [jEnd + 1, jStart] };
}

function swCellDetail(i, j, st) {
  const { seq1, seq2, score, params } = st;
  const { matchScore, mismatchPenalty, gapPenalty } = params;

  if (i === 0 || j === 0) {
    return {
      header: `Cell (${i}, ${j}): initialization`,
      optionsHTML: '<div class="cd-note">The first row and column are set to 0.</div>',
      result: `Score[${i},${j}] = 0`,
    };
  }

  const X = seq1[i - 1], Y = seq2[j - 1];
  const isMatch = X === Y;
  const sub = isMatch ? matchScore : mismatchPenalty;
  const diag = score[i - 1][j - 1] + sub;
  const up = score[i - 1][j] + gapPenalty;
  const left = score[i][j - 1] + gapPenalty;
  const best = Math.max(diag, up, left, 0);
  const opts = [
    { arrow: '↖', label: `diagonal (${isMatch ? 'match' : 'mismatch'})`,
      formula: `${score[i - 1][j - 1]} + (${sub}) = ${diag}`, value: diag },
    { arrow: '↑', label: 'top (gap in Seq2)',
      formula: `${score[i - 1][j]} + (${gapPenalty}) = ${up}`, value: up },
    { arrow: '←', label: 'left (gap in Seq1)',
      formula: `${score[i][j - 1]} + (${gapPenalty}) = ${left}`, value: left },
    { arrow: '0', label: 'floor (local alignment)', formula: '0', value: 0 },
  ];
  const winners = opts.filter(o => o.value === best).map(o => o.arrow).join(' ');
  return {
    header: `Cell (${i}, ${j}): Seq1 "${X}" vs Seq2 "${Y}"`,
    optionsHTML: renderOptions(opts, best),
    result: `Score[${i},${j}] = max(${diag}, ${up}, ${left}, 0) = ${best} &nbsp; ${winners}`,
  };
}

initAligner({
  compute: computeSW,
  enumerate: (computed) =>
    computed.maxScore > 0 ? enumerateSWPaths(computed.arrows, computed.maxCells) : [],
  build: buildSWAlignment,
  pathLabel: (path, st) => {
    const { region1, region2 } = buildSWAlignment(path, st.seq1, st.seq2);
    return `Seq1[${region1[0]}..${region1[1]}] / Seq2[${region2[0]}..${region2[1]}]`;
  },
  paintExtra: (st) => {
    if (st.paths[st.selectedPath]) {
      const [si, sj] = st.paths[st.selectedPath][0]; // a max-score cell
      const sEl = cellEl(si, sj);
      if (sEl) sEl.classList.add('start-cell');
    }
    st.maxCells.forEach(([i, j]) => {
      const td = cellEl(i, j);
      if (td) td.classList.add('max-cell');
    });
  },
  renderResult: (container, al, st) => {
    appendScoreLine(container, `Local Score: ${scoreAlignment(al.mid, st.params)}`);
    const region = document.createElement('div');
    region.className = 'region-display';
    region.textContent =
      `Seq1 region: ${al.region1[0]}-${al.region1[1]} | Seq2 region: ${al.region2[0]}-${al.region2[1]}`;
    container.appendChild(region);
  },
  cellDetail: swCellDetail,
  noPathsMessage: 'No positive-scoring local alignment exists with these parameters.',
});
