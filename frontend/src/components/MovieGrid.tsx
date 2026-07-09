/**
 * Responsive grid used to display movie/series cards.
 */
import { Movie } from '@/types/movie';
import MovieCard from './MovieCard';

interface MovieGridProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  isLoading?: boolean;
  watchlistKeys?: Set<string>;
  userRatingsByKey?: Map<string, number>;
}

const movieInteractionKey = (movie: Movie) => `${movie.media_type || 'movie'}-${movie.id}`;

const MovieGrid = ({
  title,
  movies,
  onMovieClick,
  isLoading,
  watchlistKeys,
  userRatingsByKey,
}: MovieGridProps) => {
  if (isLoading) {
    return (
      <section className="py-8">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">A preparar a sessão para ti…</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-muted shimmer" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
        {title}
        <span className="rounded-full bg-secondary/50 px-2 py-0.5 text-sm font-normal text-muted-foreground">
          {movies.length}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie, index) => {
          const key = movieInteractionKey(movie);

          return (
            <MovieCard
              key={`${movie.id}-${movie.media_type || 'movie'}`}
              movie={movie}
              onClick={onMovieClick}
              index={index}
              isInWatchlist={watchlistKeys?.has(key)}
              userRating={userRatingsByKey?.get(key) ?? null}
            />
          );
        })}
      </div>
    </section>
  );
};

export default MovieGrid;
