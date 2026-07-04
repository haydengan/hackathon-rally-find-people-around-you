/**
 * Calculate reputation score.
 * Base: 100
 * +5 per event attended (capped at +50 bonus)
 * -15 per no-show
 * Bounded [0, 100]
 */
export function calculateReputation(attended: number, noShows: number): number {
  const baseScore = 100;
  const attendanceBonus = Math.min(attended * 5, 50);
  const noShowPenalty = noShows * 15;
  return Math.max(0, Math.min(100, baseScore + attendanceBonus - noShowPenalty));
}

export function getReputationColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function canJoinEvent(userScore: number, eventMinReputation: number): boolean {
  return userScore >= eventMinReputation;
}
