export function beginPageRefresh({ hasContent }: { hasContent: boolean }) {
  return {
    loading: !hasContent,
    refreshing: Boolean(hasContent)
  };
}

export function finishPageRefresh() {
  return {
    loading: false,
    refreshing: false,
    pageReady: true
  };
}

export function failPageRefresh({ hasContent }: { hasContent: boolean }) {
  return {
    loading: false,
    refreshing: false,
    pageReady: Boolean(hasContent)
  };
}
