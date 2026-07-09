/**
 * Trailer URL helpers and normalization.
 */
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

export type TrailerAction = {
  embedUrl: string | null;
  externalUrl: string | null;
  label: 'Ver trailer' | 'Procurar trailer' | 'Abrir trailer';
  hasTrailer: boolean;
};

export function extractYouTubeVideoId(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();

    if (!YOUTUBE_HOSTS.has(host)) return null;

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return normalizeYouTubeId(id);
    }

    const watchId = url.searchParams.get('v');
    if (watchId) return normalizeYouTubeId(watchId);

    const parts = url.pathname.split('/').filter(Boolean);
    const embedIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      return normalizeYouTubeId(parts[embedIndex + 1]);
    }

    return null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(value?: string | null): string | null {
  const videoId = extractYouTubeVideoId(value);
  if (!videoId) return null;

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function buildYouTubeTrailerSearchUrl(title?: string | null, year?: string | number | null): string | null {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle || cleanTitle === 'Título por revelar') return null;

  const cleanYear = String(year || '').trim();
  const query = [cleanTitle, cleanYear, 'trailer oficial']
    .filter(Boolean)
    .join(' ');

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function getTrailerAction(
  sourceUrl?: string | null,
  title?: string | null,
  year?: string | number | null
): TrailerAction {
  const cleanSource = String(sourceUrl || '').trim();
  const embedUrl = getYouTubeEmbedUrl(cleanSource);

  if (embedUrl) {
    return {
      embedUrl,
      externalUrl: cleanSource,
      label: 'Ver trailer',
      hasTrailer: true,
    };
  }

  if (isHttpUrl(cleanSource)) {
    return {
      embedUrl: null,
      externalUrl: cleanSource,
      label: isYouTubeSearchUrl(cleanSource) ? 'Procurar trailer' : 'Abrir trailer',
      hasTrailer: true,
    };
  }

  const searchUrl = buildYouTubeTrailerSearchUrl(title, year);

  return {
    embedUrl: null,
    externalUrl: searchUrl,
    label: 'Procurar trailer',
    hasTrailer: Boolean(searchUrl),
  };
}

export function isValidYouTubeTrailerUrl(value?: string | null): boolean {
  return extractYouTubeVideoId(value) !== null;
}

function isHttpUrl(value?: string | null): boolean {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isYouTubeSearchUrl(value?: string | null): boolean {
  try {
    const url = new URL(String(value || '').trim());
    return YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) && url.pathname === '/results';
  } catch {
    return false;
  }
}

function normalizeYouTubeId(value?: string | null): string | null {
  const clean = String(value || '').trim();

  if (/^[a-zA-Z0-9_-]{6,20}$/.test(clean)) {
    return clean;
  }

  return null;
}
