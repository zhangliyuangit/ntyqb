import type { MatchDetail, MatchStatus, MatchFormat, SportType, TeamSide } from "../types/models";

const SPORT_LABELS: Record<SportType, string> = {
  BILLIARDS: "台球",
  BADMINTON: "羽毛球",
  TABLE_TENNIS: "乒乓球"
};

const SPORT_EMOJIS: Record<SportType, string> = {
  BILLIARDS: "🎱",
  BADMINTON: "🏸",
  TABLE_TENNIS: "🏓"
};

const STATUS_LABELS: Record<MatchStatus, string> = {
  PENDING: "待确认",
  CONFIRMED: "已生效",
  REJECTED: "被拒绝",
  CANCELLED: "已取消",
  EXPIRED: "已过期"
};

export function sportLabel(value: SportType): string {
  return SPORT_LABELS[value];
}

export function sportEmoji(value: SportType): string {
  return SPORT_EMOJIS[value] || "球";
}

export function sportDisplayLabel(value: SportType): string {
  return `${sportEmoji(value)} ${sportLabel(value)}`;
}

export function statusLabel(value: MatchStatus): string {
  return STATUS_LABELS[value];
}

export function formatLabel(sportType: SportType, format: MatchFormat): string {
  if (sportType === "BADMINTON") {
    return format === "DOUBLES" ? "双打" : "单打";
  }
  return "单打";
}

export function formatDate(value?: string): string {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function normalizeText(value?: string | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = `${value}`.trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") {
    return "";
  }
  return text;
}

function sideNames(match: MatchDetail, side: TeamSide): string[] {
  return match.participants
    .filter((item) => item.side === side)
    .map((item) => normalizeText(item.nickname))
    .filter(Boolean);
}

export function teamText(match: MatchDetail, side: TeamSide): string {
  const names = sideNames(match, side);
  return names.length > 0 ? names.join(" / ") : "参赛人待补充";
}

export function winnerText(match: MatchDetail): string {
  if (match.winnerSide !== "A" && match.winnerSide !== "B") {
    return "待确认";
  }
  const winnerNames = sideNames(match, match.winnerSide);
  return winnerNames.length > 0 ? winnerNames.join(" / ") : "胜方已记录";
}

export function detailSummary(match: MatchDetail): string {
  if (match.sportType === "BILLIARDS") {
    return `净胜 ${match.detail.winMarginBalls || 0} 球`;
  }
  const sets = Array.isArray(match.detail.sets) ? match.detail.sets : [];
  const scoreLine = sets.map((item) => `${item.aScore}:${item.bScore}`).join(" / ");
  if (match.sportType === "TABLE_TENNIS") {
    return `BO${match.detail.bestOf || 5} · ${scoreLine}`;
  }
  return scoreLine || "未填写比分";
}

export function statusClass(status: MatchStatus): string {
  if (status === "CONFIRMED") {
    return "success";
  }
  if (status === "PENDING") {
    return "pending";
  }
  if (status === "REJECTED") {
    return "danger";
  }
  return "muted";
}

export function rateText(value: number): string {
  return `${Number(value || 0).toFixed(1)}%`;
}
