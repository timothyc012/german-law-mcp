/**
 * Simple text diff utility
 *
 * LCS (Longest Common Subsequence) 기반의 라인 비교를 수행한다.
 * 외부 의존성 없이 구현.
 */

export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
  lineNumber?: number;
}

/**
 * 두 텍스트를 줄 단위로 비교하여 diff를 생성한다.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // LCS table
  const m = oldLines.length;
  const n = newLines.length;

  // Optimize: use 1D rolling array for LCS
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  // Build LCS length table (we need full table for backtrack)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1].trim() === newLines[j - 1].trim()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1].trim() === newLines[j - 1].trim()) {
      stack.push({ type: "same", text: newLines[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", text: newLines[j - 1], lineNumber: j });
      j--;
    } else {
      stack.push({ type: "removed", text: oldLines[i - 1], lineNumber: i });
      i--;
    }
  }

  // Reverse since we built it backwards
  stack.reverse();
  result.push(...stack);

  return result;
}

/**
 * DiffLine 배열을 사람이 읽을 수 있는 형태로 포맷한다.
 */
export function formatDiff(diff: DiffLine[]): string {
  const lines: string[] = [];
  let addCount = 0;
  let removeCount = 0;

  for (const d of diff) {
    switch (d.type) {
      case "same":
        lines.push(`  ${d.text}`);
        break;
      case "added":
        lines.push(`+ ${d.text}`);
        addCount++;
        break;
      case "removed":
        lines.push(`- ${d.text}`);
        removeCount++;
        break;
    }
  }

  lines.push("");
  lines.push(`── 요약: +${addCount}줄 추가, -${removeCount}줄 삭제 ──`);

  return lines.join("\n");
}
