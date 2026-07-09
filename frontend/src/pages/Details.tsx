/**
 * Details page for individual movies/series.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Edit3, Heart, ImageOff, BookmarkPlus, PlayCircle, Save, Star, Users, X } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GENRES, MovieDetails } from '@/types/movie';
import { fetchMovieDetails, getImageUrl, getBackdropUrl } from '@/services/tmdb';
import CommentsModal from '@/components/CommentsModal';
import StarRating from '@/components/StarRating';
import TrailerModal from '@/components/TrailerModal';
import { getTrailerAction } from '@/lib/trailers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';
import {
  fetchCustomCatalog,
  fetchMovies,
  getRatings,
  getUserRating,
  listFavorites,
  listWatchlist,
  toggleFavorite,
  toggleWatchlist,
  upsertCatalogItem,
  upsertMovieGenres,
  upsertRating,
  upsertUser,
} from '@/services/api';

type CatalogFallbackItem = Partial<MovieDetails> & {
  id: number | string;
  movie_id?: number | string;
  media_type?: string | null;
  poster_url?: string | null;
};

type MovieEditForm = {
  title: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  trailer_url: string;
  overview: string;
};

const toDateValue = (value?: string | null) => (value || '').slice(0, 10);

const getMediaTitleFromDetails = (item: Partial<MovieDetails> | null | undefined) => (
  item?.title || item?.name || 'Título por revelar'
);

const getFormFromDetails = (item: MovieDetails | null): MovieEditForm => ({
  title: getMediaTitleFromDetails(item),
  release_date: toDateValue(item?.release_date || item?.first_air_date),
  poster_path: item?.poster_path || '',
  backdrop_path: item?.backdrop_path || '',
  trailer_url: item?.trailer_url || '',
  overview: item?.overview || '',
});

const genreIdsToGenres = (genreIds?: number[]) => (
  Array.isArray(genreIds)
    ? genreIds.map((genreId) => ({ id: genreId, name: GENRES[genreId] || String(genreId) }))
    : []
);

const mergeCatalogOverride = (
  base: MovieDetails | null,
  override: CatalogFallbackItem,
  mediaType: 'movie' | 'tv'
): MovieDetails => {
  const fallbackGenres = base?.genres?.length ? base.genres : genreIdsToGenres(override.genre_ids);
  const nextTitle = getMediaTitleFromDetails(override) || getMediaTitleFromDetails(base);

  return {
    ...(base || {}),
    ...override,
    id: Number(override.movie_id || override.id),
    title: mediaType === 'movie' ? nextTitle : (override.title || base?.title || nextTitle),
    name: mediaType === 'tv' ? nextTitle : (override.name || base?.name),
    poster_path: override.poster_path ?? override.poster_url ?? base?.poster_path ?? null,
    backdrop_path: override.backdrop_path ?? base?.backdrop_path ?? null,
    trailer_url: override.trailer_url ?? base?.trailer_url ?? null,
    overview: override.overview ?? base?.overview ?? '',
    release_date: mediaType === 'movie' ? (override.release_date || base?.release_date || '') : (base?.release_date || ''),
    first_air_date: mediaType === 'tv' ? (override.first_air_date || override.release_date || base?.first_air_date || '') : (base?.first_air_date || ''),
    media_type: mediaType,
    genres: fallbackGenres,
    genre_ids: override.genre_ids || base?.genre_ids || [],
    status: base?.status || 'Local',
    production_companies: base?.production_companies || [],
    vote_average: override.vote_average ?? base?.vote_average ?? 0,
    vote_count: override.vote_count ?? base?.vote_count ?? 0,
    popularity: override.popularity ?? base?.popularity ?? 0,
  } as MovieDetails;
};

const cleanOptionalValue = (value: string) => {
  const clean = value.trim();
  return clean === '' ? null : clean;
};

const Details = () => {
  const { mediaType, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);
  const [ratingImgError, setRatingImgError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isEditingMovie, setIsEditingMovie] = useState(false);
  const [isSavingMovie, setIsSavingMovie] = useState(false);
  const [editForm, setEditForm] = useState<MovieEditForm>(() => getFormFromDetails(null));
  const mid = Number(id || 0);
  const currentMediaType = mediaType === 'tv' ? 'tv' : 'movie';
  const isAdmin = user?.role === 'admin';
  const title = details?.title || details?.name || 'Título por revelar';
  const year = (details?.release_date || details?.first_air_date || '').slice(0, 4);

  useEffect(() => {
    if (!mid) return;
    let mounted = true;
    setIsLoading(true);
    setImgError(false);
    setBackdropError(false);

    const loadDetails = async () => {
      try {
        const localDetails = await fetchMovieDetails(mid, currentMediaType);
        const customCatalog = await fetchCustomCatalog().catch(() => [] as CatalogFallbackItem[]);
        const override = customCatalog.find((item: CatalogFallbackItem) => (
          Number(item.movie_id || item.id) === mid && (item.media_type || 'movie') === currentMediaType
        ));

        if (!mounted) return;

        if (override) {
          setDetails(mergeCatalogOverride(localDetails, override, currentMediaType));
          return;
        }

        if (localDetails) {
          setDetails(localDetails);
          return;
        }

        const catalog = await fetchMovies();
        const fallback = catalog.find((item: CatalogFallbackItem) => (
          Number(item.id) === mid && (item.media_type || 'movie') === currentMediaType
        ));

        setDetails(fallback ? mergeCatalogOverride(null, fallback, currentMediaType) : null);
      } catch {
        if (mounted) setDetails(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [mid, currentMediaType]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!mid) return;
    const loadRatings = async () => {
      try {
        const rows = await getRatings(mid, currentMediaType);
        const count = rows.length;
        const sum = rows.reduce((s, r) => s + Number(r.rating || 0), 0);
        const avg = count > 0 ? sum / count : 0;
        setRatingCount(count);
        setRatingAvg(Number(avg.toFixed(1)));
        if (user) {
          const ur = await getUserRating(mid, user.id, currentMediaType);
          setUserRating(ur?.rating ?? null);
        } else {
          setUserRating(null);
        }
      } catch { }
    };
    loadRatings();
  }, [mid, user, currentMediaType]);

  useEffect(() => {
    if (!details) return;
    const ids = (details.genres || []).map(g => g.id);
    if (ids.length) upsertMovieGenres(mid, currentMediaType, ids, title).catch(() => { });
  }, [details, mid, currentMediaType, title]);

  useEffect(() => {
    if (userRating && selectedRating === 0) {
      setSelectedRating(userRating);
    }
  }, [userRating, selectedRating]);

  useEffect(() => {
    if (!user || !mid) return;
    listFavorites(user.id).then(rows => {
      setFavorited(rows.some(r => Number(r.movie_id) === mid && (r.media_type || 'movie') === currentMediaType));
    }).catch(() => { });
    listWatchlist(user.id).then(rows => {
      setWatchlisted(rows.some(r => Number(r.movie_id) === mid && (r.media_type || 'movie') === currentMediaType));
    }).catch(() => { });
  }, [user, mid, currentMediaType]);

  useEffect(() => {
    if (!details || isEditingMovie) return;
    setEditForm(getFormFromDetails(details));
  }, [details, isEditingMovie]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTrailer) {
          setShowTrailer(false);
          return;
        }
        if (isEditingMovie) {
          setIsEditingMovie(false);
          setEditForm(getFormFromDetails(details));
          return;
        }
        if (!showComments) {
          if (window.history.length > 1) navigate(-1);
          else navigate('/');
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showComments, showTrailer, isEditingMovie, details, navigate]);

  const submitRating = async () => {
    if (!user) {
      toast.message('Inicia sessão para guardar a tua avaliação.', { description: 'Depois voltas diretamente ao teu perfil de gosto.' });
      navigate('/auth');
      return;
    }
    if (!selectedRating || !mid) return;
    try {
      await upsertUser(user.id, user.email, user.username || user.email?.split('@')[0] || null);
      try { await upsertMovieGenres(mid, currentMediaType, (details?.genres || []).map(g => g.id), title); } catch { }
      const ok = await upsertRating(user.id, mid, selectedRating, currentMediaType, title);
      if (!ok) throw new Error('upsertRating failed');
      const rows = await getRatings(mid, currentMediaType);
      const count = rows.length;
      const sum = rows.reduce((s, r) => s + Number(r.rating || 0), 0);
      const avg = count > 0 ? sum / count : 0;
      setRatingCount(count);
      setRatingAvg(Number(avg.toFixed(1)));
      setUserRating(selectedRating);
      toast.success(copy.ratingSaved, { description: `${title} ficou com ${selectedRating} estrela${selectedRating === 1 ? '' : 's'}.` });
    } catch {
      toast.error(copy.genericError, { description: 'A tua avaliação não ficou guardada.' });
    }
  };

  const saveMovieEdits = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin || !details || !mid) {
      toast.error('Sem permissões para editar este filme.');
      return;
    }

    const cleanTitle = editForm.title.trim();
    if (!cleanTitle) {
      toast.error('O título é obrigatório.');
      return;
    }

    setIsSavingMovie(true);

    try {
      const genreIds = details.genres?.map((genre) => genre.id) || details.genre_ids || [];
      const releaseDate = editForm.release_date.trim();

      const result = await upsertCatalogItem({
        id: mid,
        movie_id: mid,
        title: cleanTitle,
        media_type: currentMediaType,
        overview: editForm.overview.trim(),
        release_date: releaseDate,
        poster_path: cleanOptionalValue(editForm.poster_path),
        backdrop_path: cleanOptionalValue(editForm.backdrop_path),
        trailer_url: cleanOptionalValue(editForm.trailer_url),
        genre_ids: genreIds,
      });

      if (!result?.ok) {
        throw new Error(result?.message || 'Não foi possível atualizar o filme.');
      }

      setDetails((previous) => {
        const next = {
          ...(previous || details),
          title: cleanTitle,
          name: currentMediaType === 'tv' ? cleanTitle : previous?.name,
          overview: editForm.overview.trim(),
          poster_path: cleanOptionalValue(editForm.poster_path),
          backdrop_path: cleanOptionalValue(editForm.backdrop_path),
          trailer_url: cleanOptionalValue(editForm.trailer_url),
          release_date: currentMediaType === 'movie' ? releaseDate : previous?.release_date || '',
          first_air_date: currentMediaType === 'tv' ? releaseDate : previous?.first_air_date || '',
          media_type: currentMediaType,
        } as MovieDetails;

        return next;
      });

      setImgError(false);
      setBackdropError(false);
      setRatingImgError(false);
      setIsEditingMovie(false);

      toast.success('Filme atualizado.', {
        description: 'As alterações foram guardadas no backend e ficam disponíveis no catálogo.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível guardar as alterações.';
      toast.error('Erro ao atualizar filme.', { description: message });
    } finally {
      setIsSavingMovie(false);
    }
  };

  const toggleFav = async () => {
    if (!user || !details) { toast.message('Inicia sessão para guardar favoritos.'); navigate('/auth'); return; }
    try {
      try { await upsertMovieGenres(mid, currentMediaType, details?.genres?.map(g => g.id) || [], title); } catch { }
      const f = await toggleFavorite(user.id, mid, currentMediaType, title);
      setFavorited(f);
      toast.success(f ? copy.favoriteSaved : copy.favoriteRemoved, { description: f ? 'Este título ficou mais perto do teu perfil.' : 'Removido sem drama.' });
    } catch {
      toast.error(copy.genericError, { description: 'Não conseguimos atualizar os favoritos.' });
    }
  };

  const toggleWish = async () => {
    if (!user || !details) { toast.message('Inicia sessão para guardar na Watchlist.'); navigate('/auth'); return; }
    try {
      try { await upsertMovieGenres(mid, currentMediaType, details?.genres?.map(g => g.id) || [], title); } catch { }
      const w = await toggleWatchlist(user.id, mid, currentMediaType, title);
      setWatchlisted(w);
      toast.success(w ? copy.watchlistSaved : copy.watchlistRemoved, { description: w ? 'A tua Watchlist ganhou uma opção.' : 'A lista ficou mais leve.' });
    } catch {
      toast.error(copy.genericError, { description: 'Não conseguimos atualizar a watchlist.' });
    }
  };

  const updateEditForm = (field: keyof MovieEditForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const posterUrl = getImageUrl(details?.poster_path || null, 'w500');
  const backdropUrl = getBackdropUrl(details?.backdrop_path || null) || posterUrl;
  const ratingPosterUrl = posterUrl || backdropUrl;
  const runtime = details?.runtime || details?.episode_run_time?.[0];
  const genres = details?.genres?.map(g => g.name) || [];
  const cast = details?.credits?.cast?.slice(0, 8) || [];
  const director = details?.credits?.crew?.find(c => c.job === 'Director');
  const trailer = getTrailerAction(details?.trailer_url || null, title, year);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 md:pt-20">
        <div className="relative">
          {isLoading && (
            <div className="absolute left-6 top-6 z-10 rounded-full border border-border bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur-sm">
              A buscar os detalhes…
            </div>
          )}
          <div className="detail-page-hero relative h-[48vh] min-h-[360px] overflow-hidden">
            {backdropUrl && !backdropError ? (
              <img
                src={backdropUrl}
                alt={`${title} — imagem`}
                className="detail-page-backdrop-image h-full w-full object-cover"
                onError={() => setBackdropError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center opacity-10">
                <ImageOff className="mb-3 h-40 w-40" />
                <p className="text-sm text-muted-foreground">{copy.imageFallback}</p>
              </div>
            )}
            <div className="detail-page-backdrop-overlay absolute inset-0" />
          </div>
          <div className="container mx-auto mt-6 px-4 pb-12 md:px-6">
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr]">
              <div className="w-full">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-2xl">
                  {posterUrl && !imgError ? (
                    <img
                      src={posterUrl}
                      alt={`${title} — imagem`}
                      className="h-full w-full object-cover"
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
                        <p className="line-clamp-4 font-display text-2xl font-bold leading-[0.98] tracking-[-0.055em] text-white drop-shadow-lg">{title}</p>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/62">{year || mediaType}</p>
                      </div>
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Modo admin · edição disponível
                  </div>
                )}
              </div>
              <div className="flex-1 pt-2">
                <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h2>
                {details?.tagline && <p className="mb-4 text-muted-foreground italic">"{details.tagline}"</p>}
                <div className="mb-6 flex flex-wrap items-center gap-4">
                  {year && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{year}</span>
                    </div>
                  )}
                  {runtime && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{runtime} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 rounded-lg bg-primary/20 px-3 py-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold text-foreground">{ratingAvg.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({ratingCount} pessoas já viram)</span>
                  </div>
                  <button onClick={toggleFav} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 transition duration-200 hover:-translate-y-0.5 hover:bg-secondary/80 active:scale-[0.98] ${favorited ? 'bg-secondary text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Heart className={`h-4 w-4 ${favorited ? 'fill-primary text-primary' : ''}`} />
                    <span>{favorited ? 'Favorito' : 'Guardar nos favoritos'}</span>
                  </button>
                  <button onClick={toggleWish} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 transition duration-200 hover:-translate-y-0.5 hover:bg-secondary/80 active:scale-[0.98] ${watchlisted ? 'bg-secondary text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <BookmarkPlus className={`h-4 w-4 ${watchlisted ? 'fill-primary text-primary' : ''}`} />
                    <span>{watchlisted ? 'Guardado para ver' : 'Guardar para ver'}</span>
                  </button>
                </div>
                {genres.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {genres.map((genre, idx) => (
                      <span key={idx} className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Sinopse</h3>
                  <p className="leading-relaxed text-muted-foreground">{details?.overview || copy.overviewFallback}</p>
                </div>
                {director && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-foreground">Realizador</h3>
                    <p className="text-muted-foreground">{director.name}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {userRating !== null && <div className="text-sm text-muted-foreground">A tua avaliação: {userRating}★</div>}
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
                        <PlayCircle className="h-5 w-5" />
                        {trailer.label}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setEditForm(getFormFromDetails(details));
                          setIsEditingMovie((open) => !open);
                        }}
                      >
                        {isEditingMovie ? <X className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                        {isEditingMovie ? 'Fechar edição' : 'Editar filme'}
                      </Button>
                    )}
                    <Button
                      variant="gold"
                      size="lg"
                      onClick={() => {
                        if (!user) { navigate('/auth'); return; }
                        setSelectedRating(selectedRating > 0 ? 0 : (userRating ?? 0.5));
                      }}
                    >
                      {userRating ? (selectedRating > 0 ? 'Cancelar' : 'Alterar opinião') : (selectedRating > 0 ? 'Cancelar' : 'Dar opinião')}
                    </Button>
                    <Button variant="secondary" size="lg" onClick={() => setShowComments(true)}>
                      <Users className="h-5 w-5" />
                      Comentários
                    </Button>
                  </div>
                </div>

                {isAdmin && isEditingMovie && (
                  <form onSubmit={saveMovieEdits} className="mt-6 rounded-2xl border border-primary/25 bg-card/80 p-5 shadow-xl animate-in fade-in slide-in-from-top-2">
                    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Edição rápida admin</p>
                        <h3 className="mt-1 text-xl font-semibold text-foreground">Atualizar dados deste título</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Estas alterações são guardadas no backend PHP e sobrepõem os dados do catálogo local.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditForm(getFormFromDetails(details));
                          setIsEditingMovie(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="movie-edit-title">Título</Label>
                        <Input
                          id="movie-edit-title"
                          value={editForm.title}
                          onChange={(event) => updateEditForm('title', event.target.value)}
                          placeholder="Título do filme ou série"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="movie-edit-date">Ano/data</Label>
                        <Input
                          id="movie-edit-date"
                          value={editForm.release_date}
                          onChange={(event) => updateEditForm('release_date', event.target.value)}
                          placeholder="1999 ou 1999-03-31"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="movie-edit-poster">Poster / imagem vertical</Label>
                        <Input
                          id="movie-edit-poster"
                          value={editForm.poster_path}
                          onChange={(event) => updateEditForm('poster_path', event.target.value)}
                          placeholder="https://... ou /caminho-tmdb.jpg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="movie-edit-backdrop">Hero image / backdrop</Label>
                        <Input
                          id="movie-edit-backdrop"
                          value={editForm.backdrop_path}
                          onChange={(event) => updateEditForm('backdrop_path', event.target.value)}
                          placeholder="https://... ou /caminho-tmdb.jpg"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="movie-edit-trailer">Trailer do YouTube</Label>
                        <Input
                          id="movie-edit-trailer"
                          value={editForm.trailer_url}
                          onChange={(event) => updateEditForm('trailer_url', event.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="movie-edit-overview">Sinopse</Label>
                        <Textarea
                          id="movie-edit-overview"
                          value={editForm.overview}
                          onChange={(event) => updateEditForm('overview', event.target.value)}
                          placeholder="Escreve ou corrige a sinopse..."
                          className="min-h-32"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col justify-end gap-3 border-t border-border/60 pt-4 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditForm(getFormFromDetails(details))}
                        disabled={isSavingMovie}
                      >
                        Repor valores
                      </Button>
                      <Button type="submit" disabled={isSavingMovie}>
                        <Save className="h-4 w-4" />
                        {isSavingMovie ? 'A guardar...' : 'Guardar alterações'}
                      </Button>
                    </div>
                  </form>
                )}

                {selectedRating > 0 && (
                  <div className="mt-6 rounded-xl border border-border/50 bg-secondary/30 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="mb-6 flex flex-col items-center gap-6 md:flex-row md:items-start">
                      <div className="w-24 flex-shrink-0 md:w-32">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted shadow-md">
                          {ratingPosterUrl && !ratingImgError ? (
                            <img
                              src={ratingPosterUrl}
                              alt={`${title} — imagem`}
                              className="h-full w-full object-cover"
                              onError={() => setRatingImgError(true)}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col items-center gap-4 pt-2 md:items-start">
                        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">A tua avaliação</p>
                        <StarRating
                          rating={selectedRating}
                          onRatingChange={setSelectedRating}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3 border-t border-border/50 pt-4">
                      <Button variant="ghost" onClick={() => { setSelectedRating(0); }}>
                        Cancelar
                      </Button>
                      <Button onClick={submitRating} disabled={selectedRating === 0}>
                        Guardar opinião
                      </Button>
                    </div>
                  </div>
                )}
                {cast.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Elenco</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                      {cast.map((person) => (
                        <div key={person.id} className="text-center">
                          <div className="mb-2 aspect-square w-full overflow-hidden rounded-xl bg-muted">
                            {person.profile_path ? (
                              <img src={getImageUrl(person.profile_path, 'w200') || ''} alt={person.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground/50">
                                {person.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="line-clamp-1 text-sm font-medium text-foreground">{person.name}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{person.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
        <TrailerModal
          title={title}
          embedUrl={trailer.embedUrl || ''}
          isOpen={showTrailer && Boolean(trailer.embedUrl)}
          onOpenChange={setShowTrailer}
        />
        <CommentsModal isOpen={showComments} onClose={() => setShowComments(false)} movieTitle={title} movieId={mid} mediaType={currentMediaType} />
      </main>
    </div>
  );
};

export default Details;
