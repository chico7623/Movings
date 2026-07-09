/**
 * Reusable media card for movies/series, actions and navigation.
 */
import { useState } from 'react';
import { BookmarkCheck, Film, ImageOff, Play, Star, Tv } from 'lucide-react';
import { Movie, GENRES } from '@/types/movie';
import { getImageUrl } from '@/services/tmdb';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  index?: number;
  isInWatchlist?: boolean;
  userRating?: number | null;
}

const pluralizeOpinion = (count: number) => {
  if (count === 1) return '1 opinião';
  return `${count} opiniões`;
};

const formatUserRating = (rating: number) => {
  const normalized = Math.round(rating * 2) / 2;
  return Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);
};

const MovieCard = ({ movie, onClick, index = 0, isInWatchlist = false, userRating = null }: MovieCardProps) => {
  const [imgError, setImgError] = useState(false);
  const title = movie.title || movie.name || 'Título por revelar';
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const movingsRating = Number(movie.movings_rating_avg || 0);
  const movingsRatingCount = Number(movie.movings_rating_count || 0);
  const posterUrl = movie.poster_path && !String(movie.poster_path).includes('placeholder')
    ? getImageUrl(movie.poster_path, 'w500')
    : null;
  const genres = movie.genre_ids?.slice(0, 2).map(id => GENRES[id]).filter(Boolean) || [];
  const mediaType = movie.media_type === 'tv' ? 'Série' : 'Filme';
  const hasUserRating = typeof userRating === 'number' && Number.isFinite(userRating) && userRating > 0;

  return (
    <button
      type="button"
      onClick={() => onClick(movie)}
      className="group relative block w-full cursor-pointer animate-fade-up text-left opacity-0 transition-transform duration-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ animationDelay: `${index * 0.038}s`, animationFillMode: 'forwards' }}
      aria-label={`Abrir ${title}`}
    >
      <div className="movie-card-frame relative overflow-hidden border border-border/60 transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:border-primary/35 group-hover:shadow-xl group-hover:shadow-primary/10">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {posterUrl && !imgError ? (
            <img
              src={posterUrl}
              alt={`${title} — poster`}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.055]"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="movie-card-fallback flex h-full w-full flex-col justify-between p-5 text-left">
              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur">
                  Movings
                </span>
                <ImageOff className="h-5 w-5 text-white/45" />
              </div>

              <div className="relative z-10">
                <div className="mb-3 h-px w-12 bg-white/35" />
                <p className="line-clamp-4 font-display text-2xl font-bold leading-[0.98] tracking-[-0.055em] text-white drop-shadow-lg">
                  {title}
                </p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/62">
                  {year || mediaType}
                </p>
              </div>
            </div>
          )}

          <div className="movie-card-poster-shade absolute inset-0 opacity-90" />

          <div className="movie-card-hover-wash absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/25 transition-all duration-300 group-hover:scale-100">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </div>
          </div>

          <div className="movie-card-badge absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold">
            {movie.media_type === 'tv' ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
            {mediaType}
          </div>

          {movingsRatingCount > 0 ? (
            <div className="movie-card-badge absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {movingsRating.toFixed(1)}
            </div>
          ) : (
            <div className="movie-card-badge absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold opacity-90">
              Sem opiniões
            </div>
          )}

          {(isInWatchlist || hasUserRating) && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5">
              {isInWatchlist && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background/85 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-lg backdrop-blur">
                  <BookmarkCheck className="h-3 w-3 text-primary" />
                  Na Watchlist
                </span>
              )}
              {hasUserRating && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/90 px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-lg backdrop-blur">
                  <Star className="h-3 w-3 fill-current" />
                  A tua nota {formatUserRating(userRating)} ★
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-3.5 pb-3.5 pt-3">
          <h3 className="line-clamp-1 text-[0.92rem] font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-primary">
            {title}
          </h3>

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">
              {year || 'Data por revelar'}
            </span>

            {genres.length > 0 && (
              <span className="line-clamp-1 text-right text-[10px] text-muted-foreground/75">
                {genres.join(' · ')}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-border bg-secondary/45 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {movingsRatingCount > 0 ? pluralizeOpinion(movingsRatingCount) : 'À espera da 1.ª opinião'}
            </span>
            {isInWatchlist && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Guardado
              </span>
            )}
            {hasUserRating && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Já opinaste
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default MovieCard;
