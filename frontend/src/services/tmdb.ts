/**
 * TMDB integration helpers/fallback mapping.
 */
import { Movie, MovieDetails, GENRES } from '@/types/movie';
import { LOCAL_MOVIES, LOCAL_SHOWS } from '@/data/localCatalog';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const getImageUrl = (path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500') => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TMDB_IMAGE_BASE}/w1280${path}`;
};

const MOVIES_LOCAL: Movie[] = LOCAL_MOVIES.map((m) => ({ ...m, media_type: 'movie' }));
const SHOWS_LOCAL: Movie[] = LOCAL_SHOWS.map((s) => ({ ...s, media_type: 'tv' }));
const ALL_LOCAL: Movie[] = [...MOVIES_LOCAL, ...SHOWS_LOCAL];

export const fetchTrending = async (): Promise<Movie[]> => {
  return ALL_LOCAL.slice(0, 20);
};

export const fetchPopularMovies = async (): Promise<Movie[]> => {
  return MOVIES_LOCAL;
};

export const fetchPopularTVShows = async (): Promise<Movie[]> => {
  return SHOWS_LOCAL;
};

export const fetchTopRated = async (): Promise<Movie[]> => {
  return ALL_LOCAL.slice(0, 20);
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return ALL_LOCAL.filter((item) => {
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    return title.includes(q) || overview.includes(q);
  });
};

export const fetchMovieDetails = async (id: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<MovieDetails | null> => {
  const list = mediaType === 'tv' ? SHOWS_LOCAL : MOVIES_LOCAL;
  const found = list.find((item) => item.id === id);

  if (!found) return null;

  const ids = found.genre_ids || [];
  const genres = ids.map((genreId) => ({
    id: genreId,
    name: GENRES[genreId] || String(genreId),
  }));

  return { ...found, genres, media_type: mediaType } as MovieDetails;
};
