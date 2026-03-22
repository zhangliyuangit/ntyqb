const SPORT_LABELS = {
  BILLIARDS: "台球",
  BADMINTON: "羽毛球",
  TABLE_TENNIS: "乒乓球"
};

const SPORT_EMOJIS = {
  BILLIARDS: "🎱",
  BADMINTON: "🏸",
  TABLE_TENNIS: "🏓"
};

const STATUS_LABELS = {
  PENDING: "待确认",
  CONFIRMED: "已生效",
  REJECTED: "被拒绝",
  CANCELLED: "已取消",
  EXPIRED: "已过期"
};

function sportLabel(value) {
  return SPORT_LABELS[value];
}

function sportEmoji(value) {
  return SPORT_EMOJIS[value] || "球";
}

function sportDisplayLabel(value) {
  return `${sportEmoji(value)} ${sportLabel(value)}`;
}

function statusLabel(value) {
  return STATUS_LABELS[value];
}

function formatLabel(sportType, format) {
  if (sportType === "BADMINTON") {
    return format === "DOUBLES" ? "双打" : "单打";
  }
  return "单打";
}

function formatDate(value) {
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

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = `${value}`.trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") {
    return "";
  }
  return text;
}

function sideNames(match, side) {
  return match.participants
    .filter((item) => item.side === side)
    .map((item) => normalizeText(item.nickname))
    .filter(Boolean);
}

function teamText(match, side) {
  const names = sideNames(match, side);
  return names.length > 0 ? names.join(" / ") : "参赛人待补充";
}

function winnerText(match) {
  if (match.winnerSide !== "A" && match.winnerSide !== "B") {
    return "待确认";
  }
  const winnerNames = sideNames(match, match.winnerSide);
  return winnerNames.length > 0 ? winnerNames.join(" / ") : "胜方已记录";
}

function detailSummary(match) {
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

function statusClass(status) {
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

function rateText(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

module.exports = {
  sportLabel,
  sportEmoji,
  sportDisplayLabel,
  statusLabel,
  formatLabel,
  formatDate,
  teamText,
  winnerText,
  detailSummary,
  statusClass,
  rateText
};
