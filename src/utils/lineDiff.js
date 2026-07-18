// Minimal line-level diff — just enough to find which line numbers in
// `newText` are additions relative to `oldText`, for flashing them in an
// editor. Not a general-purpose diff library: no move/rename detection,
// LCS-based (same idea as `diff`/git, simplified), 1-based line numbers
// (matching Monaco's convention).

// Above this many lines in the *changed region* (after trimming the common
// prefix/suffix), the O(n*m) DP table gets too large — fall back to
// treating the whole changed region as "added" rather than freezing the tab.
const MAX_DIFF_DIMENSION = 800;

export const diffAddedLines = (oldText, newText) => {
  if (oldText === newText || oldText == null || newText == null) return [];
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  let start = 0;
  const maxStart = Math.min(oldLines.length, newLines.length);
  while (start < maxStart && oldLines[start] === newLines[start]) start++;

  let endOld = oldLines.length - 1;
  let endNew = newLines.length - 1;
  while (endOld >= start && endNew >= start && oldLines[endOld] === newLines[endNew]) {
    endOld--;
    endNew--;
  }

  const oldSlice = oldLines.slice(start, endOld + 1);
  const newSlice = newLines.slice(start, endNew + 1);
  if (!newSlice.length) return [];

  const n = oldSlice.length;
  const m = newSlice.length;

  if (n > MAX_DIFF_DIMENSION || m > MAX_DIFF_DIMENSION) {
    const added = [];
    for (let j = 0; j < m; j++) added.push(start + j + 1);
    return added;
  }

  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldSlice[i] === newSlice[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const added = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldSlice[i] === newSlice[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { i++; }
    else { added.push(start + j + 1); j++; }
  }
  while (j < m) { added.push(start + j + 1); j++; }

  return added;
};
