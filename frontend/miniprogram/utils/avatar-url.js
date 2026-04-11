function isTemporaryAvatarUrl(avatarUrl) {
  if (!avatarUrl) {
    return false;
  }
  const value = String(avatarUrl).trim().toLowerCase();
  return value.startsWith("http://tmp/")
    || value.startsWith("https://tmp/")
    || value.startsWith("wxfile://");
}

module.exports = {
  isTemporaryAvatarUrl
};
