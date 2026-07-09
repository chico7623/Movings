/**
 * Main catalogue/index page with search, filters and media grid.
 */
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookmarkCheck, Compass, Film, Flame, PackagePlus, SearchX, Sparkles, Star, Tv, Filter, UserRound } from 'lucide-react';
import { GENRES, Movie } from '@/types/movie';
import Header from '@/components/Header';
import { MovingsTheme, useTheme } from '@/hooks/useTheme';
import HeroSection from '@/components/HeroSection';
import MovieGrid from '@/components/MovieGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import StatusPanel from '@/components/StatusPanel';
import { fetchMovies, getRatingsSummary, listUserRatings, listWatchlist, RatingsSummaryItem } from '@/services/api';
import movingsLogo from '../assets/movings-logo.png';
import EmptyState from '@/components/EmptyState';
import { getThemeCopy } from '@/content/copy';
import { getDirectorNames, movieMatchesDirector, RECOMMENDED_DIRECTORS } from '@/data/directors';

type CatalogFilter = 'all' | 'movies' | 'shows' | 'top';
type UserWatchlistRow = {
  movie_id?: number | string;
  media_type?: 'movie' | 'tv' | string;
};

const interactionKey = (mediaType: Movie['media_type'], id: number | string) => `${mediaType || 'movie'}-${Number(id)}`;


const HERO_BY_THEME: Record<MovingsTheme, { id: number; media_type: 'movie' | 'tv' }> = {
  dark: { id: 19995, media_type: 'movie' }, // Avatar: fica reservado para o tema escuro.
  light: { id: 597, media_type: 'movie' }, // Titanic: imagem suave e romântica para Rose Cinema.
  burgundy: { id: 238, media_type: 'movie' }, // O Padrinho: tons escuros e dramáticos para Red Velvet.
  evergreen: { id: 122, media_type: 'movie' }, // O Regresso do Rei: paisagem verde/épica para Verde Pandora.
  periwinkle: { id: 157336, media_type: 'movie' }, // Interstellar: azul frio e espacial para Blue Frost.
};

const getItemYear = (movie: Movie) => (movie.release_date || movie.first_air_date || '').slice(0, 4);

type HeroActionCardProps = {
  icon: ReactNode;
  title?: string;
  description?: string;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  children?: ReactNode;
};

const heroActionCardClassName =
  'group rounded-2xl border border-border bg-background/55 p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-primary/45 hover:bg-background/75 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function HeroActionCard({
  icon,
  title,
  description,
  onClick,
  ariaLabel,
  className = '',
  children,
}: HeroActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${heroActionCardClassName} ${className}`.trim()}
    >
      <div className="mb-2 text-primary transition group-hover:scale-110 group-active:scale-95">{icon}</div>
      {children ?? (
        <>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </>
      )}
    </button>
  );
}

const ratingKey = (mediaType: Movie['media_type'], id: number) => `${mediaType || 'movie'}-${id}`;

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const { user } = useAuth();
  const searchQuery = new URLSearchParams(location.search).get('q') || '';
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');
  const [selectedDecade, setSelectedDecade] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedDirector, setSelectedDirector] = useState('');

  const { data: catalog = [], isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['movingsCatalog'],
    queryFn: fetchMovies,
    refetchInterval: 300000,
  });

  const { data: ratingsSummary = [], isLoading: isLoadingRatings } = useQuery<RatingsSummaryItem[]>({
    queryKey: ['movingsRatingsSummary'],
    queryFn: getRatingsSummary,
    refetchInterval: 30000,
  });

  const { data: userWatchlist = [] } = useQuery({
    queryKey: ['movingsUserWatchlist', user?.id],
    queryFn: () => listWatchlist(user!.id),
    enabled: Boolean(user?.id),
    refetchInterval: 45000,
  });

  const { data: userRatings = [] } = useQuery({
    queryKey: ['movingsUserRatings', user?.id],
    queryFn: () => listUserRatings(user!.id),
    enabled: Boolean(user?.id),
    refetchInterval: 45000,
  });

  const ratingsByMovie = useMemo(() => {
    const map = new Map<string, RatingsSummaryItem>();
    ratingsSummary.forEach((item) => {
      map.set(ratingKey(item.media_type, item.movie_id), item);
    });
    return map;
  }, [ratingsSummary]);

  const catalogWithRatings = useMemo(() => {
    return catalog.map((movie) => {
      const mediaType = movie.media_type || 'movie';
      const summary = ratingsByMovie.get(ratingKey(mediaType, movie.id));
      return {
        ...movie,
        movings_rating_avg: summary?.rating_avg || 0,
        movings_rating_count: summary?.rating_count || 0,
      };
    });
  }, [catalog, ratingsByMovie]);

  const watchlistKeys = useMemo(() => {
    return new Set(
      (Array.isArray(userWatchlist) ? userWatchlist : [])
        .map((item) => {
          const row = item as UserWatchlistRow;
          return row.movie_id ? interactionKey(row.media_type === 'tv' ? 'tv' : 'movie', row.movie_id) : '';
        })
        .filter(Boolean)
    );
  }, [userWatchlist]);

  const userRatingsByKey = useMemo(() => {
    return new Map(
      (Array.isArray(userRatings) ? userRatings : []).map((rating) => [
        interactionKey(rating.media_type, rating.movie_id),
        Number(rating.rating || 0),
      ])
    );
  }, [userRatings]);

  const availableDecades = useMemo(() => {
    const decades = new Set<number>();

    catalogWithRatings.forEach((movie) => {
      const year = Number(getItemYear(movie));
      if (!Number.isNaN(year) && year > 0) {
        decades.add(Math.floor(year / 10) * 10);
      }
    });

    return Array.from(decades)
      .sort((a, b) => b - a)
      .map((decade) => ({
        value: String(decade),
        label: `${decade}s`,
        range: `${decade}–${decade + 9}`,
      }));
  }, [catalogWithRatings]);

  const availableGenres = useMemo(() => {
    const ids = new Set<number>();
    catalogWithRatings.forEach((movie) => {
      (movie.genre_ids || []).forEach((genreId) => ids.add(Number(genreId)));
    });

    return Array.from(ids)
      .filter((genreId) => Boolean(GENRES[genreId]))
      .map((genreId) => ({ id: genreId, name: GENRES[genreId] }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [catalogWithRatings]);

  const filteredCatalog = useMemo(() => {
    return catalogWithRatings.filter((movie) => {
      const itemYear = Number(getItemYear(movie));
      const itemDecade = !Number.isNaN(itemYear) && itemYear > 0 ? Math.floor(itemYear / 10) * 10 : null;
      const matchesDecade = selectedDecade === 'all' || itemDecade === Number(selectedDecade);
      const matchesGenre = selectedGenre === 'all' || (movie.genre_ids || []).map(Number).includes(Number(selectedGenre));
      const matchesDirector = movieMatchesDirector(movie, selectedDirector);
      return matchesDecade && matchesGenre && matchesDirector;
    });
  }, [catalogWithRatings, selectedDecade, selectedGenre, selectedDirector]);

  const hasAdvancedFilters = selectedDecade !== 'all' || selectedGenre !== 'all' || selectedDirector.trim().length > 0;
  const clearAdvancedFilters = () => {
    setSelectedDecade('all');
    setSelectedGenre('all');
    setSelectedDirector('');
  };

  const popularMovies = useMemo(() => filteredCatalog.filter((movie) => (movie.media_type || 'movie') === 'movie'), [filteredCatalog]);
  const popularShows = useMemo(() => filteredCatalog.filter((movie) => movie.media_type === 'tv'), [filteredCatalog]);
  const trending = useMemo(() => filteredCatalog.slice(0, 20), [filteredCatalog]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return catalogWithRatings.filter((item) => {
      const title = (item.title || item.name || '').toLowerCase();
      const overview = (item.overview || '').toLowerCase();
      const directors = getDirectorNames(item).join(' ').toLowerCase();
      return title.includes(q) || overview.includes(q) || directors.includes(q);
    });
  }, [catalogWithRatings, searchQuery]);

  const handleMovieClick = useCallback((movie: Movie) => {
    const mediaType = movie.media_type || 'movie';
    navigate(`/details/${mediaType}/${movie.id}`);
  }, [navigate]);

  const isLoadingInitial = isLoadingCatalog || isLoadingRatings;
  const heroMovie = useMemo(() => {
    const selectedHero = HERO_BY_THEME[theme] || HERO_BY_THEME.dark;

    return (
      catalogWithRatings.find((movie) => {
        const mediaType = movie.media_type || 'movie';
        return movie.id === selectedHero.id && mediaType === selectedHero.media_type;
      }) ||
      catalogWithRatings.find((movie) => movie.id === HERO_BY_THEME.dark.id && (movie.media_type || 'movie') === 'movie') ||
      trending[0] ||
      null
    );
  }, [catalogWithRatings, theme, trending]);
  const isSearching = searchQuery.trim().length > 0;

  const topRated = useMemo(() => {
    return filteredCatalog
      .filter((movie) => Number(movie.movings_rating_count || 0) > 0)
      .sort((a, b) => Number(b.movings_rating_avg || 0) - Number(a.movings_rating_avg || 0))
      .slice(0, 12);
  }, [filteredCatalog]);

  const visibleSections = {
    trending: catalogFilter === 'all',
    movies: catalogFilter === 'all' || catalogFilter === 'movies',
    shows: catalogFilter === 'all' || catalogFilter === 'shows',
    top: catalogFilter === 'top',
  };

  const totalItems = filteredCatalog.length;

  const displayName = user?.username || user?.email?.split('@')[0] || 'amante de cinema';
  const welcomeLine = user
    ? `Bem-vindo de volta, ${displayName}. Já sabes o que vais ver hoje?`
    : 'Hoje é uma boa altura para descobrires algo para ver.';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <StatusPanel
        catalogCount={totalItems}
        moviesCount={popularMovies.length}
        showsCount={popularShows.length}
        isLoading={isLoadingInitial}
      />

      <main className="pt-24 md:pt-28">
        {!isSearching && <HeroSection movie={heroMovie} onPlayClick={handleMovieClick} />}

        {!isSearching && (
          <section className="container mx-auto px-4 md:px-6 pt-8">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-6 shadow-2xl md:p-8">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="mb-3 text-sm font-semibold text-primary">{welcomeLine}</p>
                  <h2 className="font-display text-3xl font-bold tracking-[-0.04em] md:text-4xl">
                    O teu gosto por cinema começa aqui.
                  </h2>
                  <p className="mt-3 max-w-2xl text-muted-foreground">
                    Guarda títulos na Watchlist, deixa avaliações, dá sugestões e conversa sobre o que viste. Abre o Quiz para saberes qual é o teu tipo de espectador.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button variant="gold" onClick={() => navigate('/quiz')} aria-label="Abrir o quiz do Movings">
                      <UserRound className="h-4 w-4" />
                      Quiz
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('catalogo-movings')?.scrollIntoView({ behavior: 'smooth' })}
                      aria-label="Ir para o catálogo do Movings"
                    >
                      <Compass className="h-4 w-4" />
                      Descobrir filmes
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <HeroActionCard
                    icon={<Film className="h-5 w-5" />}
                    onClick={() => document.getElementById('catalogo-movings')?.scrollIntoView({ behavior: 'smooth' })}
                    ariaLabel="Descobrir todos os títulos visíveis no catálogo"
                  >
                    <p className="text-3xl font-bold leading-none">{totalItems}</p>
                    <p className="mt-1 text-sm text-muted-foreground">títulos visíveis no catálogo</p>
                  </HeroActionCard>

                  <HeroActionCard
                    icon={<BookmarkCheck className="h-5 w-5" />}
                    title="Guarda o que ficou debaixo de olho"
                    description="A Watchlist guarda tudo o que queres ver depois."
                    onClick={() => navigate('/watchlist')}
                    ariaLabel="Abrir a tua watchlist"
                  />

                  <HeroActionCard
                    icon={<Star className="h-5 w-5" />}
                    title="Avalia de maneira simples"
                    description="As estrelas ficam ligadas ao filme certo."
                    onClick={() => navigate('/rate-movies')}
                    ariaLabel="Abrir a página de avaliações"
                  />

                  <HeroActionCard
                    icon={<UserRound className="h-5 w-5" />}
                    title="Cria o teu Cartão do Movings"
                    description="Favoritos, badges e Quiz contam a tua história."
                    onClick={() => navigate('/profile')}
                    ariaLabel="Abrir o teu perfil Movings"
                  />

                  <HeroActionCard
                    icon={<PackagePlus className="h-5 w-5" />}
                    title="Falta algum filme ou série?"
                    description="Envia uma sugestão; o admin pode adicioná-la ao catálogo."
                    onClick={() => navigate('/sugestoes')}
                    ariaLabel="Enviar uma sugestão de filme ou série"
                    className="border-primary/25 bg-primary/10 hover:border-primary/50 hover:bg-primary/15 sm:col-span-2"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        <div id="catalogo-movings" className="container mx-auto px-4 md:px-6 py-8">
          {isSearching ? (
            <>
              <div className="mb-6 rounded-3xl border border-border bg-card/70 p-5 md:p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">Pesquisa</Badge>
                    <h1 className="text-2xl font-bold md:text-4xl">Resultados para “{searchQuery}”</h1>
                    <p className="mt-1 text-muted-foreground">A procurar no catálogo Movings, incluindo títulos adicionados pelo admin.</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/')}>Limpar pesquisa</Button>
                </div>
              </div>
              <MovieGrid
                title="O que encontrámos para ti"
                movies={searchResults}
                onMovieClick={handleMovieClick}
                isLoading={isLoadingInitial}
                watchlistKeys={watchlistKeys}
                userRatingsByKey={userRatingsByKey}
              />
            </>
          ) : (
            <>
              <section className="mb-4 rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Descobrir filmes</h2>
                    <p className="text-sm text-muted-foreground">Filtra por tipo, década, género ou diretor e encontra algo que combine com a tua Watchlist.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={catalogFilter === 'all' ? 'gold' : 'outline'} size="sm" onClick={() => setCatalogFilter('all')}>
                      <Sparkles className="h-4 w-4" /> Tudo
                    </Button>
                    <Button variant={catalogFilter === 'movies' ? 'gold' : 'outline'} size="sm" onClick={() => setCatalogFilter('movies')}>
                      <Film className="h-4 w-4" /> Filmes
                    </Button>
                    <Button variant={catalogFilter === 'shows' ? 'gold' : 'outline'} size="sm" onClick={() => setCatalogFilter('shows')}>
                      <Tv className="h-4 w-4" /> Séries
                    </Button>
                    <Button variant={catalogFilter === 'top' ? 'gold' : 'outline'} size="sm" onClick={() => setCatalogFilter('top')}>
                      <Flame className="h-4 w-4" /> Top Movings
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[0.85fr_0.85fr_1fr_auto]">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Década</span>
                    <select
                      value={selectedDecade}
                      onChange={(event) => setSelectedDecade(event.target.value)}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">Todas as décadas</option>
                      {availableDecades.map((decade) => (
                        <option key={decade.value} value={decade.value}>{decade.label} ({decade.range})</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Género</span>
                    <select
                      value={selectedGenre}
                      onChange={(event) => setSelectedGenre(event.target.value)}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">Todos os géneros</option>
                      {availableGenres.map((genre) => (
                        <option key={genre.id} value={genre.id}>{genre.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Diretor / criador</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        list="movings-director-suggestions"
                        value={selectedDirector}
                        onChange={(event) => setSelectedDirector(event.target.value)}
                        placeholder="Ex.: Christopher Nolan"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 pl-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <datalist id="movings-director-suggestions">
                      {RECOMMENDED_DIRECTORS.map((director) => (
                        <option key={director} value={director} />
                      ))}
                    </datalist>
                  </label>

                  <div className="flex items-end">
                    <Button variant="outline" size="sm" onClick={clearAdvancedFilters} disabled={!hasAdvancedFilters} className="h-10 w-full gap-2 md:w-auto">
                      <Filter className="h-4 w-4" /> Limpar filtros
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Diretores recomendados
                  </span>
                  {RECOMMENDED_DIRECTORS.map((director) => (
                    <Button
                      key={director}
                      type="button"
                      variant={selectedDirector === director ? 'gold' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedDirector(director)}
                      className="h-8 rounded-full px-3 text-xs"
                    >
                      {director}
                    </Button>
                  ))}
                </div>
              </section>

              {visibleSections.top && topRated.length > 0 && (
                <MovieGrid
                  title="Os mais acarinhados por aqui"
                  movies={topRated}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoadingInitial}
                  watchlistKeys={watchlistKeys}
                  userRatingsByKey={userRatingsByKey}
                />
              )}

              {visibleSections.top && !isLoadingInitial && topRated.length === 0 && (
                <EmptyState
                  icon={<Star className="h-8 w-8" />}
                  eyebrow="Top Movings"
                  title="Ainda ninguém deixou a primeira opinião."
                  body="Quando aparecerem as primeiras estrelas, guardamos aqui os favoritos da comunidade."
                  action={<Button variant="gold" onClick={() => navigate('/rate-movies')}>Dar a primeira opinião</Button>}
                />
              )}

              {visibleSections.trending && (
                <MovieGrid
                  title="A nossa escolha desta semana"
                  movies={trending.slice(0, 12)}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoadingInitial}
                  watchlistKeys={watchlistKeys}
                  userRatingsByKey={userRatingsByKey}
                />
              )}

              {visibleSections.movies && (
                <MovieGrid
                  title="Filmes"
                  movies={popularMovies.slice(0, 24)}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoadingInitial}
                  watchlistKeys={watchlistKeys}
                  userRatingsByKey={userRatingsByKey}
                />
              )}

              {visibleSections.shows && (
                <MovieGrid
                  title="Séries"
                  movies={popularShows.slice(0, 24)}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoadingInitial}
                  watchlistKeys={watchlistKeys}
                  userRatingsByKey={userRatingsByKey}
                />
              )}

              {!isLoadingInitial && filteredCatalog.length === 0 && catalogWithRatings.length > 0 && (
                <EmptyState
                  icon={<SearchX className="h-8 w-8" />}
                  eyebrow="Filtro sem cena"
                  title={copy.noFilterTitle}
                  body={copy.noFilterBody}
                  action={<Button variant="outline" onClick={clearAdvancedFilters}>Alargar a pesquisa</Button>}
                />
              )}

              {!isLoadingInitial && catalogWithRatings.length === 0 && (
                <EmptyState
                  icon={<Film className="h-8 w-8" />}
                  eyebrow="Catálogo"
                  title="O catálogo ficou sem projeção."
                  body={copy.genericError}
                  action={<Button variant="outline" onClick={() => window.location.reload()}>Tentar outra vez</Button>}
                />
              )}
            </>
          )}

          {isSearching && !isLoadingInitial && searchResults.length === 0 && (
            <EmptyState
              icon={<SearchX className="h-8 w-8" />}
              eyebrow="Pesquisa"
              title={copy.noSearchTitle(searchQuery)}
              body={copy.noSearchBody}
              action={<Button variant="gold" onClick={() => navigate('/sugestoes')}>Sugerir ao admin</Button>}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-border py-12 mt-12 bg-secondary/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={movingsLogo} alt="Movings" className="h-9 w-auto object-contain" />
            </div>
            <p className="text-muted-foreground text-sm text-center md:text-right">
              © 2026 Movings. Filmes, séries e opiniões de quem gosta mesmo disto.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
