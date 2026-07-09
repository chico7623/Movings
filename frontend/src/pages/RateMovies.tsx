/**
 * Dedicated page for rating movies/series.
 */
import { useNavigate } from 'react-router-dom';
import { Film, RefreshCw, Star } from 'lucide-react';
import MovieCard from '@/components/MovieCard';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useMovies } from '@/hooks/useMovies';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';

type CatalogCardItem = { id: number | string; media_type?: string | null };

export default function RateMovies() {
  const navigate = useNavigate();
  const { movies, loading, error } = useMovies();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);

  const handleMovieClick = (movie: CatalogCardItem) => {
    navigate(`/details/${movie.media_type || 'movie'}/${movie.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 md:pt-28">
          <div className="container mx-auto px-4 py-8">
            <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
              {copy.loadingCatalog}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 md:pt-28">
          <div className="container mx-auto px-4 py-8">
            <EmptyState
              icon={<RefreshCw className="h-8 w-8" />}
              title="Não conseguimos abrir as avaliações."
              body={copy.genericError}
              action={<Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-28">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <section className="mb-8 rounded-3xl border border-border bg-card/70 p-6 md:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Star className="h-4 w-4" />
              Avaliações Movings
            </div>
            <h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl">Dá forma ao teu gosto</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Cada avaliação ajuda o teu Cartão do Movings a ficar mais teu e mostra à comunidade o que vale mesmo a pena ver.</p>
          </section>

          {movies.length === 0 ? (
            <EmptyState
              icon={<Film className="h-8 w-8" />}
              title="Ainda não há títulos para avaliar."
              body="Quando houver títulos no catálogo, as estrelas aparecem aqui para começares a deixar a tua opinião."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {movies.map((movie, index) => (
                <MovieCard key={`${movie.media_type || 'movie'}-${movie.id}`} movie={movie} onClick={handleMovieClick} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
