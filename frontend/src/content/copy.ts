/**
 * Centralized Portuguese copy by theme/context, keeping UI text consistent.
 */
import type { MovingsTheme } from '@/hooks/useTheme';

export type ThemeTone = {
  name: string;
  shortName: string;
  symbol: string;
  verb: string;
  mood: string;
  heroBadge: string;
  heroSubtitle: string;
  heroCta: string;
  searchPlaceholder: string;
  loadingHero: string;
  loadingCatalog: string;
  imageFallback: string;
  overviewFallback: string;
  genericError: string;
  networkError: string;
  watchlistSaved: string;
  watchlistRemoved: string;
  favoriteSaved: string;
  favoriteRemoved: string;
  ratingSaved: string;
  commentSaved: string;
  emptyWatchlistTitle: string;
  emptyWatchlistBody: string;
  emptyFavoritesTitle: string;
  emptyFavoritesBody: string;
  emptyCommentsTitle: string;
  emptyCommentsBody: string;
  noSearchTitle: (query: string) => string;
  noSearchBody: string;
  noFilterTitle: string;
  noFilterBody: string;
};

const base: ThemeTone = {
  name: 'Escuro',
  shortName: 'Sala Escura',
  symbol: '★',
  verb: 'revisitar',
  mood: 'ouro sobre sala escura, com tom de cinéfilo clássico',
  heroBadge: 'A nossa escolha desta semana',
  heroSubtitle: 'Descobre, guarda, avalia e conversa sobre cinema sem pressa.',
  heroCta: 'Dê a sua opinião',
  searchPlaceholder: 'Procura um título, realizador ou aquele filme que te fugiu do nome',
  loadingHero: 'As cortinas estão a abrir para o destaque de hoje…',
  loadingCatalog: 'A alinhar o ecrã para a tua Watchlist…',
  imageFallback: 'Este fotograma ainda não chegou, mas a história já está pronta para ti.',
  overviewFallback: 'Ainda não temos sinopse, mas este título já deixou um rasto no catálogo.',
  genericError: 'Algo falhou do nosso lado. Tenta novamente dentro de instantes.',
  networkError: 'Não conseguimos falar com a API. Confirma o WAMP e tenta novamente.',
  watchlistSaved: 'Guardado. Já não te escapa.',
  watchlistRemoved: 'Removido da tua Watchlist.',
  favoriteSaved: 'Favorito guardado. Ficou com lugar cativo no teu perfil.',
  favoriteRemoved: 'Saiu dos favoritos. O teu gosto continua a mudar.',
  ratingSaved: 'Avaliação registada. Bom gosto fica guardado.',
  commentSaved: 'Comentário enviado. Depois de aprovado, entra na conversa.',
  emptyWatchlistTitle: 'Ainda não guardaste nada.',
  emptyWatchlistBody: 'Quando encontrares aquele filme ou série que não queres esquecer, ele aparece aqui.',
  emptyFavoritesTitle: 'Ainda não escolheste os teus favoritos.',
  emptyFavoritesBody: 'Quando um título ficar mesmo contigo, guarda-o aqui para o teu Cartão ganhar mais personalidade.',
  emptyCommentsTitle: 'Ainda ninguém abriu a conversa.',
  emptyCommentsBody: 'Depois de veres este título, deixa uma opinião e ajuda a conversa a começar.',
  noSearchTitle: (query: string) => `Ainda não encontrámos “${query}”.`,
  noSearchBody: 'Tenta outro nome, uma palavra-chave mais curta, ou sugere esse título ao admin.',
  noFilterTitle: 'Esse filtro ficou demasiado apertado.',
  noFilterBody: 'Alarga a década, o género ou o tipo de título para dar mais espaço ao catálogo.',
};

export const themeCopy: Record<MovingsTheme, ThemeTone> = {
  dark: base,
  light: {
    ...base,
    name: 'Rose Cinema',
    shortName: 'Rose Cinema',
    symbol: '◇',
    verb: 'guardar',
    mood: 'suave, cúmplice e romântico sem ficar infantil',
    heroBadge: 'Uma sessão para guardar',
    heroSubtitle: 'Cinema com luz suave, escolhas pessoais e espaço para sentir.',
    heroCta: 'Dê a sua opinião',
    loadingHero: 'A sala está a ganhar luz cor-de-rosa…',
    loadingCatalog: 'A preparar uma sessão bem escolhida…',
    imageFallback: 'A imagem ainda não apareceu, mas este título já tem presença.',
    overviewFallback: 'Ainda não temos sinopse, mas há filmes que começam antes das palavras.',
    watchlistSaved: 'Guardado para uma noite bem escolhida.',
    watchlistRemoved: 'Saiu da lista. Fica espaço para outro encontro.',
    favoriteSaved: 'Favorito guardado. Este ficou perto do coração.',
    favoriteRemoved: 'Saiu dos favoritos, sem drama.',
    ratingSaved: 'Opinião guardada. O teu gosto ficou um pouco mais nítido.',
    emptyWatchlistTitle: 'Ainda não guardaste o filme certo para mais tarde.',
    emptyWatchlistBody: 'A tua próxima noite de cinema pode começar com um só clique.',
  },
  burgundy: {
    ...base,
    name: 'Red Velvet',
    shortName: 'Red Velvet',
    symbol: '◆',
    verb: 'mergulhar',
    mood: 'dramático, intenso e teatral, como veludo e luz vermelha',
    heroBadge: 'Em cena principal',
    heroSubtitle: 'Filmes que entram pela sala com presença, tensão e memória.',
    heroCta: 'Dê a sua opinião',
    loadingHero: 'A cortina vermelha está a subir…',
    loadingCatalog: 'A acender a próxima obsessão…',
    imageFallback: 'Este fotograma falhou a entrada, mas o drama continua.',
    overviewFallback: 'Ainda sem sinopse. Às vezes o mistério faz parte do espetáculo.',
    watchlistSaved: 'Guardado. Este ainda volta a chamar por ti.',
    watchlistRemoved: 'Saiu de cena por agora.',
    favoriteSaved: 'Favorito marcado. Este deixou marca.',
    favoriteRemoved: 'Saiu dos favoritos. Nem todos sobrevivem ao segundo ato.',
    ratingSaved: 'Opinião guardada. A tua sentença ficou escrita.',
    emptyWatchlistTitle: 'Ainda não acendeste a tua próxima obsessão.',
    emptyWatchlistBody: 'Guarda aqui os títulos que prometem voltar a chamar por ti.',
  },
  evergreen: {
    ...base,
    name: 'Verde Pandora',
    shortName: 'Verde Pandora',
    symbol: '⌖',
    verb: 'explorar',
    mood: 'aventura, paisagem, descoberta e ar livre',
    heroBadge: 'Rota da semana',
    heroSubtitle: 'Um catálogo para atravessar como quem encontra novos mundos.',
    heroCta: 'Dê a sua opinião',
    loadingHero: 'A abrir caminho para a próxima descoberta…',
    loadingCatalog: 'A desenhar o mapa do catálogo…',
    imageFallback: 'A paisagem ainda não carregou, mas o caminho está aberto.',
    overviewFallback: 'Ainda não temos sinopse. Este título fica para explorar no terreno.',
    watchlistSaved: 'Guardado para a próxima viagem.',
    watchlistRemoved: 'Saiu da rota por agora.',
    favoriteSaved: 'Favorito guardado. Ficou como ponto de referência.',
    favoriteRemoved: 'Saiu dos favoritos. A rota mudou.',
    ratingSaved: 'Opinião guardada. Mais um marco no teu percurso.',
    emptyWatchlistTitle: 'A tua próxima rota ainda não começou.',
    emptyWatchlistBody: 'Guarda aqui os filmes e séries que queres explorar depois.',
  },
  periwinkle: {
    ...base,
    name: 'Blue Frost',
    shortName: 'Blue Frost',
    symbol: '✧',
    verb: 'observar',
    mood: 'frio, preciso e elegante, com distância de noir europeu',
    heroBadge: 'Recorte da semana',
    heroSubtitle: 'Um olhar calmo para filmes, séries e padrões de gosto.',
    heroCta: 'Dê a sua opinião',
    loadingHero: 'A focar o próximo plano…',
    loadingCatalog: 'A organizar o catálogo por camadas…',
    imageFallback: 'A imagem ainda não chegou ao enquadramento.',
    overviewFallback: 'Ainda sem sinopse. O silêncio também pode dizer alguma coisa.',
    watchlistSaved: 'Guardado para ver com calma.',
    watchlistRemoved: 'Removido do teu recorte.',
    favoriteSaved: 'Favorito guardado. Um ponto fixo no teu perfil.',
    favoriteRemoved: 'Saiu dos favoritos. O recorte mudou.',
    ratingSaved: 'Opinião guardada. O teu perfil ficou mais preciso.',
    emptyWatchlistTitle: 'Ainda não marcaste a próxima descoberta.',
    emptyWatchlistBody: 'Guarda aqui títulos para observar sem pressa.',
  },
};

export function getThemeCopy(theme: MovingsTheme | string | undefined): ThemeTone {
  if (theme === 'light' || theme === 'burgundy' || theme === 'evergreen' || theme === 'periwinkle' || theme === 'dark') {
    return themeCopy[theme];
  }
  return themeCopy.dark;
}

export function getProfileLine(args: {
  username?: string | null;
  quizLabel?: string | null;
  favoriteGenre?: string | null;
  ratingsTotal?: number;
  commentsTotal?: number;
  favoritesTotal?: number;
  ratingsAvg?: number;
}) {
  const genre = args.favoriteGenre || 'cinema ainda por mapear';
  if ((args.ratingsTotal || 0) >= 12 && (args.commentsTotal || 0) >= 3) {
    return `Tens olho para ${genre}, avalias com critério e deixas rasto no que vês.`;
  }
  if ((args.favoritesTotal || 0) >= 4) {
    return `O teu perfil já tem quatro escolhas com assinatura própria — ${genre} começa a destacar-se.`;
  }
  if (args.quizLabel) {
    return `${args.quizLabel}: estás a dar forma ao teu perfil filme a filme.`;
  }
  if ((args.ratingsTotal || 0) > 0) {
    return `Já começaste a desenhar o teu gosto. A média atual é ${(args.ratingsAvg || 0).toFixed(1)} estrelas.`;
  }
  return 'Ainda estamos a conhecer o teu cinema.';
}
