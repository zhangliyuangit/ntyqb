let lastHapticAt = 0;

function haptic(type = "light", minIntervalMs = 70) {
  const now = Date.now();
  if (now - lastHapticAt < minIntervalMs) {
    return;
  }
  lastHapticAt = now;

  if (typeof wx === "undefined" || typeof wx.vibrateShort !== "function") {
    return;
  }

  wx.vibrateShort({
    type,
    fail() {
      wx.vibrateShort({});
    }
  });
}

module.exports = {
  haptic
};
