import type { GameRules, GameStats } from "./types";

export function scoreLineClear(
  count: number,
  level: number,
  rules: GameRules,
): number {
  if (count < 1 || count > 4) return 0;
  return rules.lineScores[count - 1]! * level;
}

export function updateStatsForClear(
  stats: GameStats,
  cleared: number,
  softDropCells: number,
  hardDropCells: number,
  rules: GameRules,
): number {
  const lineScore = scoreLineClear(cleared, stats.level, rules);
  stats.score += lineScore
    + softDropCells * rules.softDropPoints
    + hardDropCells * rules.hardDropPoints;
  stats.lines += cleared;
  stats.level = 1 + Math.floor(stats.lines / rules.rowsPerLevel);
  return lineScore;
}

export function attackForClear(lines: number, combo: number, comboEnabled: boolean): number {
  const base = [0, 0, 1, 2, 4][lines] ?? 0;
  return base + (comboEnabled && lines > 0 && combo > 1 ? 1 : 0);
}
