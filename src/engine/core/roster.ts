// Default roster generator for team sports: PlayerTeamANo1..NoN (agents.md §3).
export function defaultRoster(prefix: 'A' | 'B', size: number): string[] {
  return Array.from({ length: size }, (_, i) => `PlayerTeam${prefix}No${i + 1}`);
}
