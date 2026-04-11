function beginPageRefresh({ hasContent }) {
  return {
    loading: !hasContent,
    refreshing: Boolean(hasContent)
  };
}

function finishPageRefresh() {
  return {
    loading: false,
    refreshing: false,
    pageReady: true
  };
}

function failPageRefresh({ hasContent }) {
  return {
    loading: false,
    refreshing: false,
    pageReady: Boolean(hasContent)
  };
}

module.exports = {
  beginPageRefresh,
  failPageRefresh,
  finishPageRefresh
};
