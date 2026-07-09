/**
 * Home hero section that introduces the Movings experience.
 */
import { useState } from 'react';
import { Star, Play, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';
import { Movie, GENRES } from '@/types/movie';
import { getBackdropUrl } from '@/services/tmdb';

interface HeroSectionProps {
  movie: Movie | null;
  onPlayClick: (movie: Movie) => void;
}

const HeroSection = ({ movie, onPlayClick }: HeroSectionProps) => {
  const [imgError, setImgError] = useState(false);
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  if (!movie) {
    return (
      <div className="relative flex h-[70vh] min-h-[500px] items-center justify-center bg-gradient-to-b from-muted to-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{copy.loadingHero}</p>
        </div>
      </div>
    );
  }

  const title = movie.title || movie.name || 'Título por revelar';
  const backdropUrl = getBackdropUrl(movie.backdrop_path);
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const genres = movie.genre_ids?.slice(0, 3).map(id => GENRES[id]).filter(Boolean) || [];
  const movingsRating = Number(movie.movings_rating_avg || 0);
  const movingsRatingCount = Number(movie.movings_rating_count || 0);

  return (
    <section className="hero-section relative h-[66vh] min-h-[520px] overflow-hidden md:h-[70vh]">
      <div className="absolute inset-0 bg-background">
        {backdropUrl && !imgError ? (
          <img
            src={backdropUrl}
            alt={`${title} — imagem do destaque`}
            className="hero-backdrop-image h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-muted to-secondary/30">
            <ImageOff className="mb-3 h-20 w-20 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">{copy.imageFallback}</p>
          </div>
        )}

        <div className="hero-overlay-side absolute inset-0" />
        <div className="hero-overlay-bottom absolute inset-0" />
        <div className="hero-overlay-tint absolute inset-0" />
      </div>

      <div className="container relative z-10 mx-auto flex h-full items-center px-4 pb-10 pt-20 md:px-6 md:pb-12 md:pt-24">
        <div className="hero-content max-w-[40rem] animate-slide-up lg:ml-2">
          <div className="hero-featured-badge mb-5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.08em]">
            {copy.heroBadge}
          </div>

          <h1 className="hero-title mb-5 font-display text-[clamp(2.35rem,5.2vw,5.45rem)] font-bold text-foreground">
            {title}
          </h1>

          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {year && (
              <span className="hero-year text-sm font-semibold text-muted-foreground md:text-base">
                {year}
              </span>
            )}

            {genres.map((genre, idx) => (
              <span
                key={idx}
                className="hero-genre-pill rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-muted-foreground md:text-sm"
              >
                {genre}
              </span>
            ))}

            {movingsRatingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground md:text-sm">
                <Star className="h-4 w-4 fill-primary text-primary" />
                Movings {movingsRating.toFixed(1)} · {movingsRatingCount} opiniões
              </span>
            )}
          </div>

          <p className="hero-overview mb-7 line-clamp-3 text-base text-muted-foreground md:text-lg">
            {movie.overview || copy.overviewFallback}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="gold"
              size="lg"
              onClick={() => onPlayClick(movie)}
              className="group btn-hero-primary rounded-full px-6"
            >
              <Play className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" />
              {copy.heroCta}
            </Button>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 md:h-24"
        style={{
          background:
            'var(--hero-edge-fade, linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.42) 40%, transparent 100%))',
        }}
      />
    </section>
  );
};

export default HeroSection;
