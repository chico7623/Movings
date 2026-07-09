/**
 * User profile and Cartão Movings screen.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BarChart3,
  BookmarkPlus,
  Clapperboard,
  Film,
  Heart,
  Lock,
  MessageSquare,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { getProfileLine, getThemeCopy } from '@/content/copy';
import {
  deleteAccount,
  getAllBadges,
  getFavoriteGenre,
  getQuizResult,
  getUserBadges,
  getUserStats,
  listFavorites,
  listWatchlist,
  seedBadges,
} from '@/services/api';
import { fetchMovieDetails, getImageUrl } from '@/services/tmdb';
import { toast } from 'sonner';

type Favorite = { movie_id: number; media_type: 'movie' | 'tv'; title: string; poster: string | null };
type WatchlistItem = { movie_id: number; media_type: 'movie' | 'tv'; media_title?: string };
type QuizResult = { result_key: string; result_label: string; result_desc: string };
type UserBadge = {
  key?: string;
  badge_key?: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  rarity?: string;
  level?: number;
  points?: number;
  requirement_label?: string;
  unlock_hint?: string;
  awarded_at: string;
  sort_order?: number;
};

type Stats = {
  ratings_total: number;
  comments_total: number;
  pending_comments_total?: number;
  favorites_total: number;
  ratings_avg: number;
  top_genre_id: number | null;
  top_genre_name?: string | null;
  favorite_genre_name?: string | null;
  genre_distribution: Record<string, number>;
  genre_distribution_labels?: Record<string, string>;
  genre_distribution_rows?: Array<{ genre_id: number; genre_name: string; count: number }>;
};

type BadgeProgress = {
  current: number;
  target: number;
  label: string;
  href: string;
  cta: string;
};

const badgeRarityLabels: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Invulgar',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

const getBadgeKey = (badge: Pick<UserBadge, 'key' | 'badge_key' | 'name'>) => badge.key || badge.badge_key || badge.name;

const formatBadgeDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(date);
};

const getProgressPercent = (progress: BadgeProgress | null) => {
  if (!progress) return 0;
  return Math.min(100, Math.round((progress.current / Math.max(1, progress.target)) * 100));
};

const getBadgeProgress = (
  badgeKey: string,
  stats: Stats | null,
  favoritesCount: number,
  watchlistCount: number,
  quiz: QuizResult | null,
  genreCount: number
): BadgeProgress | null => {
  const ratings = Number(stats?.ratings_total || 0);
  const comments = Number(stats?.comments_total || 0);
  const favorites = Number(stats?.favorites_total || favoritesCount || 0);
  const quizDone = quiz ? 1 : 0;

  const progressMap: Record<string, BadgeProgress> = {
    first_rating: {
      current: ratings,
      target: 1,
      label: 'Deixa a primeira avaliação.',
      href: '/rate-movies',
      cta: 'Avaliar agora',
    },
    first_comment: {
      current: comments,
      target: 1,
      label: 'Comenta um título e espera aprovação.',
      href: '/',
      cta: 'Escolher título',
    },
    five_ratings: {
      current: ratings,
      target: 5,
      label: 'Chega às 5 avaliações.',
      href: '/rate-movies',
      cta: 'Continuar a avaliar',
    },
    ten_ratings: {
      current: ratings,
      target: 10,
      label: 'Chega às 10 avaliações.',
      href: '/rate-movies',
      cta: 'Somar avaliações',
    },
    twenty_five_ratings: {
      current: ratings,
      target: 25,
      label: 'Chega às 25 avaliações.',
      href: '/rate-movies',
      cta: 'Entrar no ritmo',
    },
    fifty_ratings: {
      current: ratings,
      target: 50,
      label: 'Chega às 50 avaliações.',
      href: '/rate-movies',
      cta: 'Virar arquivo vivo',
    },
    five_favorites: {
      current: favorites,
      target: 5,
      label: 'Marca 5 favoritos.',
      href: '/',
      cta: 'Descobrir favoritos',
    },
    ten_favorites: {
      current: favorites,
      target: 10,
      label: 'Marca 10 favoritos.',
      href: '/',
      cta: 'Aumentar favoritos',
    },
    quiz_done: {
      current: quizDone,
      target: 1,
      label: 'Completa o Quiz.',
      href: '/quiz',
      cta: 'Fazer o Quiz',
    },
    approved_comments_5: {
      current: comments,
      target: 5,
      label: 'Chega aos 5 comentários aprovados.',
      href: '/',
      cta: 'Comentar mais',
    },
    approved_comments_10: {
      current: comments,
      target: 10,
      label: 'Chega aos 10 comentários aprovados.',
      href: '/',
      cta: 'Dar voz à comunidade',
    },
    genre_explorer: {
      current: genreCount,
      target: 5,
      label: 'Interage com 5 géneros diferentes.',
      href: '/',
      cta: 'Explorar géneros',
    },
    balanced_user: {
      current: [ratings >= 1, comments >= 1, favorites >= 1, quizDone === 1].filter(Boolean).length,
      target: 4,
      label: 'Avalia, comenta, favorita e completa o Quiz.',
      href: '/profile',
      cta: 'Ver progresso',
    },
    legend_movings: {
      current: [ratings >= 50, comments >= 10, favorites >= 10, quizDone === 1].filter(Boolean).length,
      target: 4,
      label: '50 avaliações, 10 comentários, 10 favoritos e Quiz.',
      href: '/profile',
      cta: 'Modo lenda',
    },
  };

  if (progressMap[badgeKey]) return progressMap[badgeKey];

  if (badgeKey === 'helpful_voter') {
    return {
      current: 0,
      target: 1,
      label: 'Dá like ou dislike num comentário.',
      href: '/',
      cta: 'Ler comentários',
    };
  }

  if (badgeKey.includes('watchlist')) {
    return {
      current: watchlistCount,
      target: 5,
      label: 'Guarda títulos na Watchlist.',
      href: '/watchlist',
      cta: 'Abrir Watchlist',
    };
  }

  return null;
};

const Profile = () => {
  const { user, isLoading, signOut } = useAuth();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favGenre, setFavGenre] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<UserBadge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    seedBadges().catch(() => {});

    listFavorites(user.id).then(async rows => {
      const withTitles = await Promise.all((Array.isArray(rows) ? rows : []).map(async raw => {
        const r = raw as { movie_id: number; media_type: 'movie' | 'tv'; media_title?: string };
        const d = await fetchMovieDetails(r.movie_id, r.media_type);
        const t = r.media_title || d?.title || d?.name || 'Título por revelar';
        const p = getImageUrl(d?.poster_path || null, 'w500');
        return { movie_id: Number(r.movie_id), media_type: r.media_type === 'tv' ? 'tv' : 'movie', title: t, poster: p } as Favorite;
      }));
      if (active) setFavorites(withTitles);
    }).catch(() => {
      if (active) setFavorites([]);
    });

    listWatchlist(user.id).then(rows => {
      if (!active) return;
      const normalized = (Array.isArray(rows) ? rows : []).map((raw) => {
        const r = raw as { movie_id?: number | string; media_type?: string; media_title?: string };
        return {
          movie_id: Number(r.movie_id || 0),
          media_type: r.media_type === 'tv' ? 'tv' : 'movie',
          media_title: r.media_title,
        } as WatchlistItem;
      }).filter((item) => item.movie_id > 0);
      setWatchlist(normalized);
    }).catch(() => {
      if (active) setWatchlist([]);
    });

    getFavoriteGenre(user.id).then(row => {
      const data = row as { genre_name?: string; genre_id?: number } | null;
      if (active) setFavGenre(data?.genre_name || (data?.genre_id ? `Género #${data.genre_id}` : null));
    }).catch(() => {});
    getQuizResult(user.id).then(result => active && setQuiz(result as QuizResult | null)).catch(() => {});
    getUserBadges(user.id).then(rows => active && setBadges(Array.isArray(rows) ? rows : [])).catch(() => {});
    getAllBadges().then(rows => active && setAllBadges(Array.isArray(rows) ? rows : [])).catch(() => {});
    getUserStats(user.id).then(data => active && setStats(data as Stats || null)).catch(() => {});

    return () => { active = false; };
  }, [user]);

  const favoriteGenre = favGenre || stats?.favorite_genre_name || stats?.top_genre_name || null;
  const displayName = user?.username || user?.email?.split('@')[0] || 'Utilizador';
  const profileLine = useMemo(() => getProfileLine({
    username: displayName,
    quizLabel: quiz?.result_label,
    favoriteGenre,
    ratingsTotal: stats?.ratings_total,
    commentsTotal: stats?.comments_total,
    favoritesTotal: stats?.favorites_total || favorites.length,
    ratingsAvg: stats?.ratings_avg,
  }), [displayName, favoriteGenre, quiz?.result_label, stats, favorites.length]);

  const genreRows = useMemo(() => {
    if (stats?.genre_distribution_rows?.length) return stats.genre_distribution_rows;
    return Object.entries(stats?.genre_distribution || {}).map(([gid, val]) => ({
      genre_id: Number(gid),
      genre_name: stats?.genre_distribution_labels?.[gid] || `Género #${gid}`,
      count: Number(val),
    }));
  }, [stats]);

  const maxGenreCount = Math.max(1, ...genreRows.map((genre) => Number(genre.count || 0)));
  const unlockedBadgeKeys = useMemo(() => new Set(badges.map(getBadgeKey)), [badges]);
  const sortedAllBadges = useMemo(() => {
    return [...allBadges].sort((a, b) => Number(a.sort_order || a.level || 0) - Number(b.sort_order || b.level || 0));
  }, [allBadges]);

  const badgeProgressItems = useMemo(() => {
    return sortedAllBadges.map((badge) => {
      const badgeKey = getBadgeKey(badge);
      const progress = getBadgeProgress(
        badgeKey,
        stats,
        favorites.length,
        watchlist.length,
        quiz,
        genreRows.length
      );

      return {
        badge,
        badgeKey,
        progress,
        unlocked: unlockedBadgeKeys.has(badgeKey),
        percent: getProgressPercent(progress),
      };
    });
  }, [sortedAllBadges, stats, favorites.length, watchlist.length, quiz, genreRows.length, unlockedBadgeKeys]);

  const nextBadge = badgeProgressItems.find((item) => !item.unlocked && item.progress) || null;
  const lockedPreview = badgeProgressItems.filter((item) => !item.unlocked).slice(0, 4);
  const totalBadgePoints = badges.reduce((sum, badge) => sum + Number(badge.points || 0), 0);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const ok = await deleteAccount(user.id);
      if (!ok) throw new Error('failed');
      await signOut();
      toast.success('Conta apagada.', { description: 'A sessão fechou em definitivo.' });
      navigate('/auth');
    } catch (error) {
      console.error('delete account failed', error);
      toast.error('Não foi possível apagar a conta.', { description: 'Tenta novamente dentro de instantes.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const statCards = [
    {
      icon: <Star className="mb-2 h-5 w-5 text-primary" />,
      value: (stats?.ratings_avg || 0).toFixed(1),
      label: 'média',
    },
    {
      icon: <BarChart3 className="mb-2 h-5 w-5 text-primary" />,
      value: stats?.ratings_total || 0,
      label: 'avaliações',
    },
    {
      icon: <BookmarkPlus className="mb-2 h-5 w-5 text-primary" />,
      value: watchlist.length,
      label: 'na Watchlist',
    },
    {
      icon: <MessageSquare className="mb-2 h-5 w-5 text-primary" />,
      value: stats?.comments_total || 0,
      label: 'comentários',
    },
    {
      icon: <Trophy className="mb-2 h-5 w-5 text-primary" />,
      value: badges.length,
      label: 'badges',
    },
    {
      icon: <Target className="mb-2 h-5 w-5 text-primary" />,
      value: totalBadgePoints,
      label: 'pontos',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 md:px-6 md:pt-28">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card/75 p-6 shadow-2xl md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1fr_620px] xl:items-end">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-primary/25 bg-primary/15 shadow-xl shadow-primary/10">
                <User className="h-11 w-11 text-primary" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">Cartão do Movings · {copy.name}</p>
                <h1 className="font-display text-4xl font-bold tracking-[-0.05em] text-foreground md:text-6xl">{displayName}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{profileLine}</p>
                {user?.email && <p className="mt-2 text-sm text-muted-foreground/80">{user.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {statCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-border bg-background/55 p-4 transition hover:-translate-y-1 hover:border-primary/35">
                  {card.icon}
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </div>
          </div>

          {nextBadge && (
            <div className="relative mt-6 rounded-3xl border border-primary/25 bg-primary/10 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-background/65 text-2xl">
                    {nextBadge.badge.icon || '🏆'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Próximo badge</p>
                    <h2 className="text-xl font-bold">{nextBadge.badge.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{nextBadge.progress?.label || nextBadge.badge.unlock_hint}</p>
                  </div>
                </div>
                <Button variant="gold" onClick={() => navigate(nextBadge.progress?.href || '/')}>
                  {nextBadge.progress?.cta || 'Continuar'}
                </Button>
              </div>
              {nextBadge.progress && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.min(nextBadge.progress.current, nextBadge.progress.target)} de {nextBadge.progress.target}</span>
                    <span>{nextBadge.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-background/65">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${nextBadge.percent}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-border bg-card/65 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">Assinatura</p>
                <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">As escolhas que te definem</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>Encontrar mais</Button>
            </div>

            {favorites.length === 0 ? (
              <EmptyState
                icon={<Heart className="h-8 w-8" />}
                title={copy.emptyFavoritesTitle}
                body={copy.emptyFavoritesBody}
                action={<Button variant="gold" onClick={() => navigate('/')}>Descobrir filmes</Button>}
                className="bg-background/35"
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {favorites.slice(0, 4).map((f) => (
                  <Link
                    key={`${f.media_type}:${f.movie_id}`}
                    to={`/details/${f.media_type}/${f.movie_id}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/40"
                  >
                    <div className="aspect-[2/3] bg-muted">
                      {f.poster ? (
                        <img src={f.poster} alt={f.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="movie-card-fallback flex h-full w-full items-end p-4">
                          <p className="relative z-10 font-display text-xl font-bold leading-none text-white">{f.title}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 font-semibold text-foreground">{f.title}</p>
                      <p className="text-xs uppercase text-muted-foreground">{f.media_type === 'tv' ? 'Série' : 'Filme'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card/65 p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">Perfil cinematográfico</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">Como o Movings te lê</h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Clapperboard className="h-5 w-5" />
                  <span className="text-sm font-semibold">Género dominante</span>
                </div>
                <p className="text-xl font-bold">{favoriteGenre || 'Ainda sem dados suficientes'}</p>
                <p className="mt-1 text-sm text-muted-foreground">Nasce das avaliações e favoritos que já deixaste.</p>
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <BadgeCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold">Resultado do quiz</span>
                </div>
                {quiz ? (
                  <>
                    <p className="text-xl font-bold">{quiz.result_label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{quiz.result_desc}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold">Ainda por descobrir</p>
                    <p className="mt-1 text-sm text-muted-foreground">Faz o quiz para o site começar a falar mais a tua língua.</p>
                  </>
                )}
                <Button variant="gold" size="sm" className="mt-4" onClick={() => navigate('/quiz')}>Fazer / refazer quiz</Button>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-border bg-card/65 p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">Mapa de gosto</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">O que está a ganhar forma</h2>
            <div className="mt-5 grid gap-3">
              {genreRows.length > 0 ? genreRows.slice(0, 6).map((genre) => (
                <div key={genre.genre_id} className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="font-medium">{genre.genre_name}</span>
                    <span className="text-sm text-muted-foreground">{genre.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/15">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.max(8, (Number(genre.count || 0) / maxGenreCount) * 100)}%` }} />
                  </div>
                </div>
              )) : (
                <EmptyState
                  icon={<Film className="h-8 w-8" />}
                  title="Ainda não há mapa de géneros."
                  body="Avalia alguns títulos ou guarda favoritos para este gráfico começar a ter personalidade."
                  className="bg-background/35"
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card/65 p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">Badges e marcos</p>
                <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">Pequenas provas de percurso</h2>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
                <span className="font-bold text-foreground">{badges.length}</span>
                <span className="text-muted-foreground"> / {allBadges.length || badges.length} desbloqueados</span>
              </div>
            </div>

            {badges.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-8 w-8" />}
                title="Ainda não desbloqueaste badges."
                body="As badges já estão preparadas: avalia um título, completa o Quiz ou guarda favoritos para começares a desbloquear marcos."
                action={<Button variant="outline" onClick={() => navigate('/rate-movies')}>Começar a avaliar</Button>}
                className="mt-5 bg-background/35"
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {badges.map((b) => {
                  const badgeKey = getBadgeKey(b);
                  const rarity = b.rarity ? badgeRarityLabels[b.rarity] || b.rarity : null;
                  const awardedAt = formatBadgeDate(b.awarded_at);

                  return (
                    <div key={badgeKey} className="group flex items-start gap-3 rounded-2xl border border-border bg-background/50 p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-2xl transition duration-300 group-hover:scale-110">
                        {b.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-foreground">{b.name}</div>
                          {rarity && (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                              {rarity}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{b.description}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground/80">
                          {b.requirement_label && <span>Objetivo: {b.requirement_label}</span>}
                          {awardedAt && <span>· desbloqueada em {awardedAt}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {lockedPreview.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Próximos marcos</h3>
                <div className="grid gap-3">
                  {lockedPreview.map((item) => (
                    <div key={item.badgeKey} className="rounded-2xl border border-border bg-background/35 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-xl grayscale">
                            {item.badge.icon || <Lock className="h-4 w-4" />}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{item.badge.name}</p>
                            <p className="text-sm text-muted-foreground">{item.progress?.label || item.badge.unlock_hint || item.badge.description}</p>
                          </div>
                        </div>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {item.progress && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{Math.min(item.progress.current, item.progress.target)} / {item.progress.target}</span>
                            <span>{item.percent}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="my-8 rounded-3xl border border-border bg-card/65 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">Zona sensível</span>
              </div>
              <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">Despedir-te do Movings</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Ao apagar a conta, favoritos, comentários, avaliações e badges são removidos permanentemente.</p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'A apagar...' : 'Apagar conta'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Queres mesmo despedir-te?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apaga avaliações, favoritos, comentários e badges de forma permanente. Não há botão mágico para recuperar depois.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Ficar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar conta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;
