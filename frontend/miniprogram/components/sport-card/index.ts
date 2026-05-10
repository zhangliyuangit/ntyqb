import { rateText, sportDisplayLabel } from "../../utils/format";

function rateTone(value: number) {
  if (value >= 70) {
    return "hot";
  }
  if (value >= 50) {
    return "steady";
  }
  if (value > 0) {
    return "chasing";
  }
  return "new";
}

function rateLabel(value: number) {
  if (value >= 70) {
    return "手感在线";
  }
  if (value >= 50) {
    return "稳住节奏";
  }
  if (value > 0) {
    return "继续追分";
  }
  return "等你开局";
}

Component({
  properties: {
    stat: {
      type: Object,
      value: null
    }
  },
  data: {
    title: "",
    rateText: "0.0%",
    rateTone: "new",
    rateLabel: "等你开局"
  },
  observers: {
    stat(value: any) {
      if (!value) {
        return;
      }
      const winRate = Number(value.winRate || 0);
      this.setData({
        title: sportDisplayLabel(value.sportType),
        rateText: rateText(winRate),
        rateTone: rateTone(winRate),
        rateLabel: rateLabel(winRate)
      });
    }
  }
});
