const PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
];

function extractYoutubeId(url) {
  if (!url) return null;
  for (const pattern of PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  // Allow a bare 11-char video ID too
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

module.exports = { extractYoutubeId };
