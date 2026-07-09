/**
 * Modal with media details, trailer, rating, watchlist and comments entry points.
 */
import { useEffect, useState } from 'react';
import { X, Star, Clock, Calendar, Users, ImageOff, BookmarkPlus, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Movie, MovieDetails } from '@/types/movie';
import { fetchMovieDetails, getImageUrl, getBackdropUrl } from '@/services/tmdb';
import CommentsModal from './CommentsModal';
import StarRating from './StarRating';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';
import { getRatings, getUserRating, upsertRating, toggleWatchlist, listWatchlist, upsertMovieGenres, type WatchlistRow } from '@/services/api';
import { upsertUser } from '@/services/api';
import TrailerModal from './TrailerModal';
import { getTrailerAction } from '@/lib/trailers';

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

const MovieDetailModal = ({ movie, isOpen, onClose }: MovieDetailModalProps) => {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);
  const [ratingImgError, setRatingImgError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const { user } = useAuth();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const navigate = useNavigate();

  const [ratingCount, setRatingCount] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);

  useEffect(() => {
    if (movie && isOpen) {
      setIsLoading(true);
      const mediaType = movie.media_type || 'movie';
      fetchMovieDetails(movie.id, mediaType).then((data) => {
        setDetails(data);
        setIsLoading(false);
      });
    }
  }, [movie, isOpen]);

  // Fetch ratings summary and current user's rating
  useEffect(() => {
    if (!movie || !isOpen) return;

    const loadRatings = async () => {
      try {
        const mediaType = movie.media_type || 'movie';
        const rows = await getRatings(movie.id, mediaType);
        const count = rows.length;
        const sum = rows.reduce((s, r) => s + Number(r.rating || 0), 0);
        const avg = count > 0 ? sum / count : 0;
        setRatingCount(count);
        setRatingAvg(Number(avg.toFixed(1)));
        if (user) {
          const ur = await getUserRating(movie.id, user.id, mediaType);
          setUserRating(ur?.rating ?? null);
          const watchlistRows = await listWatchlist(user.id);
          setWatchlisted(watchlistRows.some((row: WatchlistRow) => Number(row.movie_id) === movie.id && (row.media_type || 'movie') === mediaType));
        } else {
          setUserRating(null);
          setWatchlisted(false);
        }
      } catch (e) {
        console.error('Error loading ratings:', e);
      }
    };

    loadRatings();
  }, [movie, isOpen, user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTrailer) {
          setShowTrailer(false);
        } else if (showComments) {
          setShowComments(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, showComments, showTrailer]);

  const submitRating = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!selectedRating) return;

    if (!movie) {
      toast.error('Filme inválido.');
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertUser(user.id, user.email, user.username || user.email?.split('@')[0] || null);
      const mediaType = movie.media_type || 'movie';
      const ok = await upsertRating(user.id, movie.id, selectedRating, mediaType, title);
      if (!ok) throw new Error('upsertRating failed');
      const rows = await getRatings(movie.id, mediaType);
      const count = rows.length;
      const sum = rows.reduce((s, r) => s + Number(r.rating || 0), 0);
      const avg = count > 0 ? sum / count : 0;
      setRatingCount(count);
      setRatingAvg(Number(avg.toFixed(1)));
      setUserRating(selectedRating);
      toast.success(copy.ratingSaved);
      setShowRating(false);
      setSelectedRating(0);
    } catch (err: unknown) {
      console.error('Error saving rating:', err);
      toast.error(copy.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWish = async () => {
    if (!user || !movie) {
      navigate('/auth');
      return;
    }
    try {
      const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';
      try {
        const genreIds = details?.genres?.map((genre) => genre.id) || movie.genre_ids || [];
        await upsertMovieGenres(movie.id, mediaType, genreIds, title);
      } catch {}
      const next = await toggleWatchlist(user.id, movie.id, mediaType, title);
      setWatchlisted(next);
      toast.success(next ? copy.watchlistSaved : copy.watchlistRemoved);
    } catch {
      toast.error(copy.genericError);
    }
  };

  if (!isOpen || !movie) return null;

  const title = details?.title || details?.name || movie.title || movie.name || 'Título por revelar';
  const posterUrl = getImageUrl(details?.poster_path || movie.poster_path, 'w500');
  const backdropUrl = getBackdropUrl(details?.backdrop_path || movie.backdrop_path) || posterUrl;
  const ratingPosterUrl = posterUrl || backdropUrl;
  const rating = (details?.vote_average || movie.vote_average)?.toFixed(1) || 'N/A';
  const year = (details?.release_date || details?.first_air_date || movie.release_date || movie.first_air_date || '').slice(0, 4);
  const runtime = details?.runtime || details?.episode_run_time?.[0];
  const genres = details?.genres?.map(g => g.name) || [];
  const cast = details?.credits?.cast?.slice(0, 8) || [];
  const director = details?.credits?.crew?.find(c => c.job === 'Director');
  const trailer = getTrailerAction(details?.trailer_url || movie.trailer_url || null, title, year);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />

        {/* Modal */}
        <div
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="overflow-y-auto max-h-[90vh]">
            {isLoading && (
              <div className="absolute left-6 top-6 z-10 rounded-full border border-border bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur-sm">
                A buscar os detalhes…
              </div>
            )}
            {/* Hero Section */}
            <div className="modal-detail-hero relative h-64 overflow-hidden bg-muted md:h-80">
              {backdropUrl && !backdropError ? (
                <img
                  src={backdropUrl}
                  alt={`${title} — imagem`}
                  className="modal-detail-backdrop-image h-full w-full object-cover"
                  onError={() => setBackdropError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center opacity-20">
                  <ImageOff className="mb-3 h-20 w-20" />
                  <p className="text-sm text-muted-foreground">{copy.imageFallback}</p>
                </div>
              )}
              <div className="modal-detail-backdrop-overlay absolute inset-0" />
            </div>

            {/* Info Section */}
            <div className="relative px-6 md:px-8 pb-8 -mt-32">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Poster */}
                <div className="flex-shrink-0 w-40 md:w-48">
                  <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl border border-border bg-muted">
                    {posterUrl && !imgError ? (
                      <img
                        src={posterUrl}
                        alt={`${title} — imagem`}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="movie-card-fallback flex h-full w-full flex-col justify-between p-4 text-left">
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="rounded-full border border-white/20 bg-black/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur">
                            Movings
                          </span>
                          <ImageOff className="h-4 w-4 text-white/45" />
                        </div>
                        <div className="relative z-10">
                          <div className="mb-2 h-px w-10 bg-white/35" />
                          <p className="line-clamp-4 font-display text-xl font-bold leading-[0.98] tracking-[-0.055em] text-white drop-shadow-lg">{title}</p>
                          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/62">{year || movie.media_type}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 pt-4 md:pt-20">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                    {title}
                  </h2>

                  {details?.tagline && (
                    <p className="text-muted-foreground italic mb-4">"{details.tagline}"</p>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    {year && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{year}</span>
                      </div>
                    )}
                    {runtime && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{runtime} min</span>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground border border-border"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Overview */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Sinopse</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {details?.overview || movie.overview || copy.overviewFallback}
                    </p>
                  </div>

                  {/* Director */}
                  {director && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Realizador</h3>
                      <p className="text-muted-foreground">{director.name}</p>
                    </div>
                  )}

                  {/* Rating summary + Actions */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/20">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="font-semibold text-foreground">{ratingAvg.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({ratingCount} pessoas já viram)</span>
                      </div>
                      {userRating !== null && (
                        <div className="text-sm text-muted-foreground">A tua leitura: {userRating}★</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {trailer.hasTrailer && (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => {
                            if (trailer.embedUrl) {
                              setShowTrailer(true);
                              return;
                            }
                            if (trailer.externalUrl) {
                              window.open(trailer.externalUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <PlayCircle className="w-5 h-5" />
                          {trailer.label}
                        </Button>
                      )}
                      <Button
                        variant="gold"
                        size="lg"
                        onClick={() => {
                          if (!user) {
                            navigate('/auth');
                            return;
                          }
                          if (userRating !== null) {
                            toast.error('Já deixaste a tua opinião sobre este título.');
                            return;
                          }
                          // open rating dialog with a valid default (0.5)
                          setRatingImgError(false);
                          setSelectedRating(0.5);
                          setShowRating(true);
                        }}
                        disabled={userRating !== null}
                      >
                        <Star className="w-5 h-5" />
                        Dar opinião
                      </Button>
                      <Button variant={watchlisted ? 'gold' : 'secondary'} size="lg" onClick={toggleWish}>
                        <BookmarkPlus className="w-5 h-5" />
                        {watchlisted ? 'Guardado para ver' : 'Guardar para ver'}
                      </Button>
                      <Button variant="secondary" size="lg" onClick={() => setShowComments(true)}>
                        <Users className="w-5 h-5" />
                        Comentários
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cast */}
              {cast.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Elenco</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {cast.map((person) => (
                      <div key={person.id} className="text-center">
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted mb-2">
                          {person.profile_path ? (
                            <img
                              src={getImageUrl(person.profile_path, 'w200') || ''}
                              alt={person.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground/50">
                              {person.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">{person.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Rating Dialog */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deixar a tua opinião sobre {title}</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-6">
              <div className="w-24 md:w-32 flex-shrink-0">
                <div className="aspect-[2/3] relative rounded-lg overflow-hidden border border-border bg-muted shadow-md">
                  {ratingPosterUrl && !ratingImgError ? (
                    <img
                      src={ratingPosterUrl}
                      alt={`${title} — imagem`}
                      className="w-full h-full object-cover"
                      onError={() => setRatingImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center md:items-start gap-4 pt-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">A tua leitura</p>
                <StarRating
                  rating={selectedRating}
                  onRatingChange={setSelectedRating}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 border-t border-border/50 pt-4">
              <Button variant="ghost" onClick={() => { setShowRating(false); setSelectedRating(0); }}>
                Cancelar
              </Button>
              <Button onClick={submitRating} disabled={selectedRating === 0 || isSubmitting} className="min-w-[140px]">
                {isSubmitting ? 'A guardar...' : 'Guardar opinião'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trailer Modal */}
      <TrailerModal
        title={title}
        embedUrl={trailer.embedUrl || ''}
        isOpen={showTrailer && Boolean(trailer.embedUrl)}
        onOpenChange={setShowTrailer}
      />

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        movieTitle={title}
        movieId={movie.id}
        mediaType={movie.media_type === 'tv' ? 'tv' : 'movie'}
      />
    </>
  );
};

export default MovieDetailModal;
