/**
 * User watchlist page.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookmarkPlus, SearchX, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { fetchMovies, listWatchlist, toggleWatchlist } from '@/services/api';
import { getImageUrl } from '@/services/tmdb';
import { toast } from 'sonner';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';

type CatalogListItem = {
  id?: number | string;
  movie_id?: number | string;
  media_type?: string | null;
  title?: string | null;
  name?: string | null;
  poster_path?: string | null;
};

type WatchlistRow = {
  id?: number;
  movie_id: number;
  media_type: 'movie' | 'tv';
  media_title?: string | null;
  title?: string | null;
  name?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  created_at?: string | null;
};

const Watchlist = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const [rows, setRows] = useState<WatchlistRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    Promise.all([listWatchlist(user.id), fetchMovies()])
      .then(([watchlistRows, movies]) => {
        if (!active) return;
        setRows(Array.isArray(watchlistRows) ? watchlistRows : []);
        setCatalog(Array.isArray(movies) ? movies : []);
      })
      .catch(() => toast.error(copy.genericError))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, copy.genericError]);

  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogListItem>();
    catalog.forEach((item) => {
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      map.set(`${mediaType}:${Number(item.id || item.movie_id)}`, item);
    });
    return map;
  }, [catalog]);

  const items = useMemo(() => rows.map((row) => {
    const mediaType = row.media_type === 'tv' ? 'tv' : 'movie';
    const fallback = catalogMap.get(`${mediaType}:${Number(row.movie_id)}`);
    const title = row.media_title || row.title || row.name || fallback?.title || fallback?.name || 'Título por revelar';
    const posterPath = row.poster_path || fallback?.poster_path || null;
    const posterUrl = posterPath && !String(posterPath).includes('placeholder') ? getImageUrl(posterPath, 'w500') : null;
    return {
      ...row,
      media_type: mediaType,
      title,
      posterUrl,
    };
  }), [rows, catalogMap]);

  const removeFromWatchlist = async (item: typeof items[number]) => {
    if (!user) return;
    const key = `${item.media_type}:${item.movie_id}`;
    setRemovingKey(key);
    try {
      await toggleWatchlist(user.id, item.movie_id, item.media_type, item.title);
      setRows((current) => current.filter((row) => `${row.media_type}:${row.movie_id}` !== key));
      toast.success(copy.watchlistRemoved, { description: 'A lista ficou mais leve.' });
    } catch {
      toast.error(copy.genericError, { description: 'Não conseguimos remover esse título agora.' });
    } finally {
      setRemovingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 md:px-6 md:pt-28">
        <section className="mb-8 rounded-3xl border border-border bg-card/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3 gap-2">
                <BookmarkPlus className="h-4 w-4" />
                Watchlist
              </Badge>
              <h1 className="text-3xl font-bold md:text-4xl">A tua Watchlist</h1>
              <p className="mt-2 text-muted-foreground">
                Os títulos que chamaram por ti ficam aqui até decidires o que ver a seguir.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>Descobrir filmes</Button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
            A preparar a tua Watchlist…
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-8 w-8" />}
            eyebrow="Watchlist"
            title={copy.emptyWatchlistTitle}
            body={copy.emptyWatchlistBody}
            action={<Button variant="gold" onClick={() => navigate('/')}>Descobrir filmes</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => {
              const key = `${item.media_type}:${item.movie_id}`;
              return (
                <div key={key} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
                  <Link to={`/details/${item.media_type}/${item.movie_id}`}>
                    <div className="aspect-[2/3] bg-muted">
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={`${item.title} — poster`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                            event.currentTarget.parentElement?.classList.add('movie-card-fallback');
                          }}
                        />
                      ) : (
                        <div className="movie-card-fallback flex h-full w-full flex-col justify-end p-4">
                          <p className="relative z-10 line-clamp-4 font-display text-xl font-bold leading-[0.98] tracking-[-0.055em] text-white drop-shadow-lg">{item.title}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs uppercase text-muted-foreground">{item.media_type === 'tv' ? 'Série' : 'Filme'}</p>
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => removeFromWatchlist(item)}
                      disabled={removingKey === key}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover da Watchlist
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Watchlist;
