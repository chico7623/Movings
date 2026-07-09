/**
 * Home page entry screen.
 */
import { useNavigate } from 'react-router-dom';
import { Film, RefreshCw } from 'lucide-react';
import MovieCard from '@/components/MovieCard';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useMovies } from '@/hooks/useMovies';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';

type CatalogCardItem = { id: number | string; media_type?: string | null };

export default function Home() {
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
              eyebrow="Catálogo"
              title="Não conseguimos abrir o catálogo."
              body={copy.genericError}
              action={<Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>}
            />
          </div>
        </main>
      </div>
    );
  }

  const featured = movies[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-28">
        {featured && (
          <section className="container mx-auto px-4 md:px-6 py-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">Destaque da base de dados</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.04em] text-foreground md:text-4xl">Uma escolha para abrir a sessão</h2>
            <p className="mb-6 mt-2 max-w-2xl text-muted-foreground">O primeiro título da tua BD local, apresentado como poster e não como bloco genérico.</p>
            <div className="w-full max-w-md">
              <MovieCard movie={featured} onClick={handleMovieClick} />
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 md:px-6 py-8">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">Arquivo local</p>
              <h2 className="font-display text-3xl font-bold tracking-[-0.04em] text-foreground md:text-4xl">Catálogo da BD</h2>
            </div>
            <Button variant="outline" onClick={() => navigate('/quiz')}>Descobrir o meu tipo de espectador</Button>
          </div>

          {movies.length === 0 ? (
            <EmptyState
              icon={<Film className="h-8 w-8" />}
              title="Ainda não há filmes para mostrar."
              body="Quando houver títulos na base de dados, aparecem aqui para começares a descobrir o que ver a seguir."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {movies.map((movie, index) => (
                <MovieCard key={`${movie.media_type || 'movie'}-${movie.id}`} movie={movie} onClick={handleMovieClick} index={index} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
