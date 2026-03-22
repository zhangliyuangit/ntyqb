import { rateText, sportDisplayLabel } from "../../utils/format";

Component({
  properties: {
    stat: {
      type: Object,
      value: null
    }
  },
  data: {
    title: "",
    rateText: "0.0%"
  },
  observers: {
    stat(value: any) {
      if (!value) {
        return;
      }
      this.setData({
        title: sportDisplayLabel(value.sportType),
        rateText: rateText(value.winRate)
      });
    }
  }
});
