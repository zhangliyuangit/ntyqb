const {
  detailSummary,
  formatDate,
  formatLabel,
  sportDisplayLabel,
  statusClass,
  statusLabel,
  teamText,
  winnerText
} = require("../../utils/format");

Component({
  properties: {
    match: {
      type: Object,
      value: null
    },
    compact: {
      type: Boolean,
      value: false
    }
  },
  data: {
    sportText: "",
    formatText: "",
    statusText: "",
    statusClassName: "",
    occurredText: "",
    teamAText: "",
    teamBText: "",
    winnerTextValue: "",
    detailText: ""
  },
  observers: {
    match(value) {
      if (!value) {
        return;
      }
      this.setData({
        sportText: sportDisplayLabel(value.sportType),
        formatText: formatLabel(value.sportType, value.format),
        statusText: statusLabel(value.status),
        statusClassName: statusClass(value.status),
        occurredText: formatDate(value.occurredAt),
        teamAText: teamText(value, "A"),
        teamBText: teamText(value, "B"),
        winnerTextValue: winnerText(value),
        detailText: detailSummary(value)
      });
    }
  },
  methods: {
    noop() {},
    onTapCard() {
      this.triggerEvent("tapcard", { matchId: this.properties.match.id });
    },
    onConfirmTap() {
      this.triggerEvent("confirm", { matchId: this.properties.match.id });
    },
    onRejectTap() {
      this.triggerEvent("reject", { matchId: this.properties.match.id });
    },
    onCancelTap() {
      this.triggerEvent("cancel", { matchId: this.properties.match.id });
    }
  }
});
