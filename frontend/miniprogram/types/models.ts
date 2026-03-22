export type SportType = "BILLIARDS" | "BADMINTON" | "TABLE_TENNIS";
export type MatchFormat = "SINGLES" | "DOUBLES";
export type MatchStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export type TeamSide = "A" | "B";

export interface UserSummary {
  id: number;
  nickname: string;
  avatarUrl?: string;
  status?: string;
}

export interface SportStat {
  sportType: SportType;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  rankingPoints: number;
  netValue: number;
  streak: number;
  recentTenWins: number;
  lastConfirmedAt?: string;
}

export interface HomeMatchSnippet {
  id: number;
  sportType: SportType;
  status: MatchStatus;
  title: string;
  subtitle: string;
  occurredAt: string;
}

export interface MeResponse {
  user: UserSummary;
  stats: SportStat[];
  pendingConfirmations: HomeMatchSnippet[];
  recentMatches: HomeMatchSnippet[];
}

export interface MatchParticipant {
  userId: number;
  nickname: string;
  avatarUrl?: string;
  side: TeamSide;
  role: string;
  confirmState: string;
}

export interface MatchDetail {
  id: number;
  sportType: SportType;
  format: MatchFormat;
  status: MatchStatus;
  occurredAt: string;
  confirmedAt?: string;
  expiresAt?: string;
  winnerSide: TeamSide;
  initiatorId: number;
  initiatorName: string;
  detail: Record<string, any>;
  participants: MatchParticipant[];
  canConfirm: boolean;
  canReject: boolean;
  canCancel: boolean;
}

export interface MatchListResponse {
  items: MatchDetail[];
}

export interface RecentPlayer {
  id: number;
  nickname: string;
  avatarUrl?: string;
  lastPlayedAt?: string;
  opponentCount: number;
  teammateCount: number;
}

export interface LeaderboardItem {
  userId: number;
  nickname: string;
  avatarUrl?: string;
  rank: number;
  eligible: boolean;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  rankingPoints: number;
  netValue: number;
  streak: number;
}

export interface LeaderboardResponse {
  sportType: SportType;
  ranked: LeaderboardItem[];
  provisional: LeaderboardItem[];
}

export interface PlayerProfile {
  user: UserSummary;
  stat: SportStat;
  recentMatches: MatchDetail[];
}

export interface CreateMatchPayload {
  sportType: SportType;
  format: MatchFormat;
  winnerSide: TeamSide;
  participantIdsA: number[];
  participantIdsB: number[];
  winMarginBalls?: number;
  bestOf?: number;
  sets?: Array<{ aScore: number; bScore: number }>;
  remark?: string;
}
