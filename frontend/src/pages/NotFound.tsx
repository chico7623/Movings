/**
 * 404 fallback page.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArchiveX, Compass, Home, Shuffle } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex min-h-screen items-center justify-center px-4 pt-24">
        <div className="relative max-w-2xl overflow-hidden rounded-3xl border border-border bg-card/80 p-8 text-center shadow-2xl md:p-10">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/25 bg-primary/15 text-primary">
              <ArchiveX className="h-10 w-10" />
            </div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-primary/80">Erro 404 · {copy.shortName}</p>
            <h1 className="mb-3 font-display text-4xl font-bold tracking-[-0.05em] text-foreground md:text-5xl">Este rolo perdeu-se no arquivo.</h1>
            <p className="mx-auto mb-7 max-w-lg text-muted-foreground">
              A página que procuravas não está disponível. Mas o catálogo continua aberto e ainda há muito para descobrir.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="gold">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Voltar ao início
                </Link>
              </Button>
              <Button variant="outline" onClick={() => navigate('/quiz')}>
                <Shuffle className="h-4 w-4" />
                Quiz
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                <Compass className="h-4 w-4" />
                Descobrir filmes
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
