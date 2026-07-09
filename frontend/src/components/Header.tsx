/**
 * Main navigation/header with auth-aware menu and theme controls.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BookmarkPlus,
  Compass,
  Info,
  LogOut,
  Menu,
  MessageCircle,
  Palette,
  Search,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, MovingsTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';
import movingsLogo from '../assets/movings-logo.png';
import { testBackend } from '@/services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header = ({ onSearch }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentQuery = new URLSearchParams(location.search).get('q') || '';
  const [localQuery, setLocalQuery] = useState(currentQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, signOut } = useAuth();
  const { theme, setTheme, themeLabels } = useTheme();
  const copy = getThemeCopy(theme);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setApiStatus('checking');
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await testBackend();
        setApiStatus(data?.status === 'ok' ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    setLocalQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const showBack = location.pathname !== '/';

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const goDiscover = () => {
    const scrollToCatalog = () => document.getElementById('catalogo-movings')?.scrollIntoView({ behavior: 'smooth' });

    if (location.pathname === '/') {
      scrollToCatalog();
      return;
    }

    navigate('/');
    window.setTimeout(scrollToCatalog, 140);
  };

  const runSearch = (query: string) => {
    const clean = query.trim();
    if (onSearch) {
      onSearch(clean);
      return;
    }

    if (clean) {
      navigate(`/?q=${encodeURIComponent(clean)}`);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch(localQuery);
  };

  const clearSearch = () => {
    setLocalQuery('');
    runSearch('');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const apiBadgeClass = apiStatus === 'online'
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
    : apiStatus === 'offline'
      ? 'border-red-400/30 bg-red-400/10 text-red-200'
      : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200';

  const apiText = apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'A verificar';

  const displayName = user?.username || user?.email?.split('@')[0] || 'Conta';
  const personalizedGreeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return `Bom dia, ${displayName}!`;
    if (hour >= 12 && hour < 19) return `Boa tarde, ${displayName}!`;
    return `Boa noite, ${displayName}!`;
  })();

  const searchForm = (className = '') => (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative group min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          type="search"
          placeholder={copy.searchPlaceholder}
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
          className="h-11 rounded-2xl border-border/60 bg-background/70 pl-10 pr-10 focus:border-primary/50 focus:ring-primary/20"
        />
        {localQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Limpar pesquisa"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );

  const themeMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" title="Escolher tema">
          <Palette className="h-4 w-4" />
          <span className="hidden xl:inline">Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sala atual: {themeLabels[theme]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as MovingsTheme)}>
          <DropdownMenuRadioItem value="dark">{themeLabels.dark}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">{themeLabels.light}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="burgundy">{themeLabels.burgundy}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="evergreen">{themeLabels.evergreen}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="periwinkle">{themeLabels.periwinkle}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const accountMenu = isLoading ? (
    <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
  ) : user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" size="sm" className="gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="hidden max-w-[120px] truncate text-sm sm:inline">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="leading-tight">
          <span className="block text-sm text-foreground">{displayName}</span>
          <span className="block text-xs font-normal text-muted-foreground">{personalizedGreeting}</span>
          {user.email && <span className="mt-1 block truncate text-[11px] font-normal text-muted-foreground">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>Cartão do Movings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/sobre')}>Sobre o projeto</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/watchlist')}>Watchlist</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/sugestoes')}>Sugestões</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/quiz')}>Quiz</DropdownMenuItem>
        {user.role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin')}>Admin Panel</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Entrar</Button>
      <Button variant="gold" size="sm" onClick={() => navigate('/auth?mode=signup')}>Criar conta</Button>
    </div>
  );

  const mobileActionClassName = 'h-auto justify-start gap-3 rounded-2xl p-4 text-left';

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-2xl">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center gap-3 md:h-20">
          <button
            type="button"
            className="flex shrink-0 items-center gap-3 text-left"
            onClick={() => navigate('/')}
            aria-label="Ir para a página inicial"
          >
            {theme === 'dark' ? (
              <img
                src={movingsLogo}
                alt="Movings"
                className="h-11 w-auto max-w-[155px] object-contain md:h-12 md:max-w-[180px]"
              />
            ) : (
              <span className="theme-logo" aria-hidden="true">
                <span className="theme-logo-mark">
                  <span className="theme-logo-play">
                    <span className="theme-logo-star">★</span>
                  </span>
                </span>
                <span className="theme-logo-word">
                  <span className="theme-logo-m">M</span>ov<span className="theme-logo-i">i</span>ngs
                </span>
              </span>
            )}
            <div className="sr-only">
              <h1>Movings</h1>
              <p>Sugestões de filmes e séries</p>
            </div>
          </button>

          <div className="hidden min-w-[220px] flex-1 md:block lg:max-w-xl xl:max-w-2xl">
            {searchForm('w-full')}
          </div>

          <nav className="ml-auto hidden items-center justify-end gap-1.5 lg:flex">
            {isAdmin ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=comments')} className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden xl:inline">Alertas</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=requests')} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden xl:inline">Sugestões</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate('/watchlist')} className="gap-2">
                  <BookmarkPlus className="h-4 w-4" />
                  <span className="hidden xl:inline">Watchlist</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate('/sobre')} className="gap-2">
                  <Info className="h-4 w-4" />
                  <span className="hidden xl:inline">Sobre</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=catalog')} className="gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>

                {themeMenu}

                {showBack && (
                  <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden 2xl:inline">Voltar</span>
                  </Button>
                )}

                <span className={`hidden rounded-full border px-2.5 py-1 text-xs font-semibold 2xl:inline-flex ${apiBadgeClass}`} title="Estado da API local">
                  {apiText}
                </span>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={goDiscover} className="gap-2">
                  <Compass className="h-4 w-4" />
                  <span className="hidden xl:inline">Descobrir</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate('/sobre')} className="gap-2">
                  <Info className="h-4 w-4" />
                  <span className="hidden xl:inline">Sobre</span>
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate('/quiz')} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Quiz
                </Button>

                {user && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/watchlist')} className="gap-2">
                    <BookmarkPlus className="h-4 w-4" />
                    <span className="hidden xl:inline">Watchlist</span>
                  </Button>
                )}

                {user && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/sugestoes')} className="gap-2" title="Sugestões">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden xl:inline">Sugestões</span>
                  </Button>
                )}

                {themeMenu}

                {showBack && (
                  <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden 2xl:inline">Voltar</span>
                  </Button>
                )}
              </>
            )}

            {accountMenu}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border/50 py-4 lg:hidden">
            {searchForm('mb-4 md:hidden')}

            <div className="mb-3 rounded-3xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-semibold text-foreground">
                {user ? personalizedGreeting : 'Bem-vindo ao Movings.'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Escolhe uma porta: descobrir, guardar, opinar ou voltar à tua sessão.
              </p>
            </div>

            <div className="grid gap-2">
              {showBack && (
                <Button variant="outline" onClick={goBack} className={mobileActionClassName}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>
                    <span className="block font-semibold">Voltar</span>
                    <span className="block text-xs font-normal text-muted-foreground">Regressa ao ponto anterior.</span>
                  </span>
                </Button>
              )}

              <Button variant="ghost" onClick={goDiscover} className={mobileActionClassName}>
                <Compass className="h-4 w-4" />
                <span>
                  <span className="block font-semibold">Descobrir filmes</span>
                  <span className="block text-xs font-normal text-muted-foreground">Abre o catálogo e os filtros.</span>
                </span>
              </Button>

              <Button variant="ghost" onClick={() => navigate('/sobre')} className={mobileActionClassName}>
                <Info className="h-4 w-4" />
                <span>
                  <span className="block font-semibold">Sobre</span>
                  <span className="block text-xs font-normal text-muted-foreground">Conhece o projeto e a PAP.</span>
                </span>
              </Button>

              <Button variant="ghost" onClick={() => navigate('/quiz')} className={mobileActionClassName}>
                <Sparkles className="h-4 w-4" />
                <span>
                  <span className="block font-semibold">Quiz</span>
                  <span className="block text-xs font-normal text-muted-foreground">Descobre o teu tipo de espectador.</span>
                </span>
              </Button>

              {user && (
                <Button variant="outline" onClick={() => navigate('/watchlist')} className={mobileActionClassName}>
                  <BookmarkPlus className="h-4 w-4" />
                  <span>
                    <span className="block font-semibold">Watchlist</span>
                    <span className="block text-xs font-normal text-muted-foreground">Os títulos que não queres perder.</span>
                  </span>
                </Button>
              )}

              {user && (
                <Button variant="outline" onClick={() => navigate('/profile')} className={mobileActionClassName}>
                  <BadgeCheck className="h-4 w-4" />
                  <span>
                    <span className="block font-semibold">Cartão do Movings</span>
                    <span className="block text-xs font-normal text-muted-foreground">Badges, estatísticas e o teu gosto.</span>
                  </span>
                </Button>
              )}

              {user && (
                <Button variant="outline" onClick={() => navigate('/sugestoes')} className={mobileActionClassName}>
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    <span className="block font-semibold">Sugestões</span>
                    <span className="block text-xs font-normal text-muted-foreground">Pede um filme ou série em falta.</span>
                  </span>
                </Button>
              )}

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3">
                <span className="text-sm font-medium">Tema: {themeLabels[theme]}</span>
                <div className="w-fit">{themeMenu}</div>
              </div>

              {isAdmin && (
                <>
                  <Button variant="ghost" onClick={() => navigate('/admin')} className={mobileActionClassName}>
                    <Shield className="h-4 w-4" />
                    <span>
                      <span className="block font-semibold">Admin</span>
                      <span className="block text-xs font-normal text-muted-foreground">Gerir catálogo e sugestões.</span>
                    </span>
                  </Button>
                  <div className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${apiBadgeClass}`}>{apiText}</div>
                </>
              )}

              <div className="pt-2">{accountMenu}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
