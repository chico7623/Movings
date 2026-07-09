/**
 * Cliente HTTP principal do frontend.
 *
 * Centraliza chamadas para a API PHP, normalização de dados e endpoints usados
 * pelas páginas React. Manter esta camada isolada reduz duplicação e facilita
 * futuras alterações de URL, autenticação ou deploy.
 */
import { LOCAL_MOVIES, LOCAL_SHOWS } from "@/data/localCatalog";
import { apiFetch } from "@/lib/http";

type MediaType = "movie" | "tv";

export interface RatingsSummaryItem {
  movie_id: number;
  media_type: MediaType;
  rating_avg: number;
  rating_count: number;
  media_title?: string;
}

export interface CatalogItemInput {
  title: string;
  media_type: MediaType;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  trailer_url?: string | null;
  genre_ids?: number[];
}

export interface CatalogItemUpdateInput extends CatalogItemInput {
  id: number;
  movie_id?: number;
}

type ApiCollectionResponse<T> = {
  rows?: T[];
  ok?: boolean;
  [key: string]: unknown;
};

type ApiObjectResponse<T> = T & {
  ok?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

type CatalogRow = {
  id?: number | string;
  movie_id?: number | string;
  title?: string | null;
  name?: string | null;
  poster_path?: string | null;
  poster_url?: string | null;
  backdrop_path?: string | null;
  trailer_url?: string | null;
  overview?: string | null;
  rating_avg?: number | string | null;
  rating_count?: number | string | null;
  vote_average?: number | string | null;
  vote_count?: number | string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  media_type?: MediaType | string | null;
  genre_ids?: number[];
  popularity?: number | string | null;
};

type RatingSummaryRow = {
  movie_id?: number | string;
  media_type?: string;
  rating_avg?: number | string;
  rating_count?: number | string;
  media_title?: string;
};

type UserRatingRow = {
  movie_id?: number | string;
  media_type?: string;
  rating?: number | string;
  media_title?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserRatingItem = {
  movie_id: number;
  media_type: MediaType;
  rating: number;
  media_title?: string;
  created_at?: string;
  updated_at?: string;
};

export type CommentVoteType = "like" | "dislike";

export type CommentRow = {
  id?: number | string;
  user_id: string;
  username: string;
  content: string;
  is_spoiler?: number | boolean | null;
  parent_id?: number | string | null;
  created_at: string;
  likes?: number | string | null;
  dislikes?: number | string | null;
};

export type CommentVoteRow = {
  comment_id: number | string;
  vote_type: CommentVoteType;
};

export type WatchlistRow = {
  id?: number | string;
  user_id?: string;
  movie_id: number | string;
  media_type?: MediaType | string | null;
  media_title?: string | null;
  created_at?: string;
};


type UserBadgeRow = {
  id?: number | string;
  key?: string;
  badge_key?: string;
  name?: string;
  description?: string;
  icon?: string;
  type?: string;
  rarity?: string;
  level?: number | string;
  points?: number | string;
  requirement_label?: string;
  unlock_hint?: string;
  sort_order?: number | string;
  awarded_at?: string;
  [key: string]: unknown;
};

export type PublicUserCardResponse = {
  ok?: boolean;
  user?: {
    id?: string | number;
    username?: string | null;
  };
  stats?: {
    ratings_total?: number | string;
    comments_total?: number | string;
    favorites_total?: number | string;
    ratings_avg?: number | string;
    movies_watched?: number | string;
  };
  favorite_genre_name?: string | null;
  quiz?: {
    result_label?: string | null;
    result_desc?: string | null;
  } | null;
  badges?: UserBadgeRow[];
};

function normalizeUserBadge(row: UserBadgeRow) {
  const badgeKey = String(row.key || row.badge_key || row.id || '');

  return {
    ...row,
    key: badgeKey,
    badge_key: badgeKey,
    name: String(row.name || 'Badge Movings'),
    description: String(row.description || 'Marco desbloqueado no teu percurso.'),
    icon: String(row.icon || '🏆'),
    type: String(row.type || 'general'),
    rarity: row.rarity ? String(row.rarity) : undefined,
    level: row.level !== undefined ? Number(row.level) : undefined,
    points: row.points !== undefined ? Number(row.points) : undefined,
    requirement_label: row.requirement_label ? String(row.requirement_label) : undefined,
    unlock_hint: row.unlock_hint ? String(row.unlock_hint) : undefined,
    sort_order: row.sort_order !== undefined ? Number(row.sort_order) : undefined,
    awarded_at: String(row.awarded_at || ''),
  };
}

type CatalogImageCandidate = {
  poster_path?: string | null;
  poster_url?: string | null;
  backdrop_path?: string | null;
};

function normalizeCatalogTitle(value: string | undefined | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasUsefulImage(item: CatalogImageCandidate) {
  return Boolean(item?.poster_path || item?.poster_url || item?.backdrop_path);
}

function dedupeCatalog<T extends { id: number; title?: string; name?: string; media_type?: MediaType; poster_path?: string | null; backdrop_path?: string | null; trailer_url?: string | null; overview?: string | null }>(items: T[]): T[] {
  const byId = new Map<string, T>();

  for (const item of items) {
    const mediaType = item.media_type || "movie";
    const idKey = `${mediaType}:id:${Number(item.id)}`;
    const previous = byId.get(idKey);

    if (!previous) {
      byId.set(idKey, item);
      continue;
    }

    // Catálogo extra vem depois do catálogo local. Quando o admin edita um filme,
    // a versão persistida no backend deve substituir a local mesmo que o título mude.
    byId.set(idKey, item);
  }

  const byTitle = new Map<string, T>();

  for (const item of byId.values()) {
    const mediaType = item.media_type || "movie";
    const title = normalizeCatalogTitle(item.title || item.name);
    const titleKey = title ? `${mediaType}:title:${title}` : `${mediaType}:id:${Number(item.id)}`;
    const previous = byTitle.get(titleKey);

    if (!previous) {
      byTitle.set(titleKey, item);
      continue;
    }

    const previousHasImage = hasUsefulImage(previous);
    const currentHasImage = hasUsefulImage(item);

    if (!previousHasImage && currentHasImage) {
      byTitle.set(titleKey, item);
    }
  }

  return Array.from(byTitle.values());
}

function mapMovieFromDb(row: CatalogRow) {
  return {
    id: Number(row.movie_id || row.id),
    title: row.title || row.name || "Sem título",
    name: row.name,
    poster_path: row.poster_path || row.poster_url || null,
    backdrop_path: row.backdrop_path || null,
    trailer_url: row.trailer_url || null,
    overview: row.overview || "",
    vote_average: Number(row.rating_avg || row.vote_average || 0),
    vote_count: Number(row.rating_count || row.vote_count || 0),
    release_date: row.release_date || "",
    first_air_date: row.first_air_date || "",
    media_type: (row.media_type || "movie") as MediaType,
    genre_ids: Array.isArray(row.genre_ids) ? row.genre_ids : [],
    popularity: Number(row.popularity || 0),
  };
}

// Catálogo base em código para a PAP: 40 filmes e 40 séries.
// A API local pode acrescentar títulos criados pelo admin.
export async function fetchCustomCatalog() {
  const data = await apiFetch<ApiCollectionResponse<CatalogRow>>("catalog.php");
  return Array.isArray(data?.rows) ? data.rows.map(mapMovieFromDb) : [];
}

export async function createCatalogItem(item: CatalogItemInput) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("catalog.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", ...item }),
    auth: true,
    csrf: true,
  });

  return data;
}

export async function updateCatalogItem(item: CatalogItemUpdateInput) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("catalog.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", ...item }),
    auth: true,
    csrf: true,
  });

  return data;
}

export async function upsertCatalogItem(item: CatalogItemUpdateInput) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("catalog.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upsert", ...item }),
    auth: true,
    csrf: true,
  });

  return data;
}

export async function deleteCatalogItem(id: number, mediaType: MediaType = "movie") {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("catalog.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id, movie_id: id, media_type: mediaType }),
    auth: true,
    csrf: true,
  });

  return data;
}

export async function fetchMovies() {
  const baseCatalog = [
    ...LOCAL_MOVIES.map((m) => ({ ...m, media_type: "movie" as const })),
    ...LOCAL_SHOWS.map((s) => ({ ...s, media_type: "tv" as const })),
  ];

  try {
    const customCatalog = await fetchCustomCatalog();
    return dedupeCatalog([...baseCatalog, ...customCatalog]);
  } catch {
    return dedupeCatalog(baseCatalog);
  }
}

export const getMovies = fetchMovies;

export async function fetchComments(movieId: number, mediaType: MediaType = "movie") {
  const data = await apiFetch<ApiCollectionResponse<CommentRow>>(`comments.php?movie_id=${movieId}&media_type=${mediaType}`);
  return data?.rows || [];
}

export const getComments = fetchComments;

export async function addComment(
  userId: string,
  movieId: number,
  mediaType: MediaType,
  username: string,
  content: string,
  parentId?: string | number | null,
  isSpoiler = false,
  mediaTitle?: string
) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("comments.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      movie_id: movieId,
      media_type: mediaType,
      username,
      content,
      parent_id: parentId ?? null,
      is_spoiler: isSpoiler,
      media_title: mediaTitle || null,
    }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function updateComment(
  commentId: string | number,
  content: string,
  isSpoiler = false
): Promise<{ ok: boolean; pendingReview: boolean; message?: string }> {
  // A API devolve pending_review=true quando um utilizador normal edita
  // um comentário aprovado. Esse estado permite à UI explicar que a alteração
  // voltou para aprovação do admin, sem confundir com erro.
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean; pending_review?: boolean; message?: string }>>("comments.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      comment_id: commentId,
      content,
      is_spoiler: isSpoiler,
    }),
    auth: true,
    csrf: true,
  });

  return {
    ok: data?.ok === true,
    pendingReview: data?.pending_review === true,
    message: typeof data?.message === "string" ? data.message : undefined,
  };
}

export async function addReply(
  userId: string,
  movieId: number,
  mediaType: MediaType,
  username: string,
  content: string,
  parentId: string,
  mediaTitle?: string
) {
  return addComment(userId, movieId, mediaType, username, content, parentId, false, mediaTitle);
}

export async function getRatings(movieId: number, mediaType: MediaType = "movie") {
  const data = await apiFetch<ApiCollectionResponse<unknown>>(`ratings.php?movie_id=${movieId}&media_type=${mediaType}`);
  return data?.rows || [];
}

export async function getRatingsSummary(): Promise<RatingsSummaryItem[]> {
  const data = await apiFetch<ApiCollectionResponse<RatingSummaryRow>>("ratings.php?action=summary");
  if (!Array.isArray(data?.rows)) return [];

  return data.rows.map((row) => ({
    movie_id: Number(row.movie_id || 0),
    media_type: row.media_type === "tv" ? "tv" : "movie",
    rating_avg: Number(row.rating_avg || 0),
    rating_count: Number(row.rating_count || 0),
    media_title: row.media_title || undefined,
  }));
}

export async function getUserRating(movieId: number, userId: string, mediaType: MediaType = "movie") {
  const data = await apiFetch<ApiObjectResponse<{ rating?: number | string | null; username?: string | null }>>(
    `ratings.php?movie_id=${movieId}&media_type=${mediaType}&user_id=${encodeURIComponent(userId)}`,
    { auth: true }
  );

  if (data?.rating === undefined || data?.rating === null) return null;
  return { rating: Number(data.rating), username: data.username || null };
}

export async function listUserRatings(userId: string): Promise<UserRatingItem[]> {
  const data = await apiFetch<ApiCollectionResponse<UserRatingRow>>(
    `ratings.php?action=list&user_id=${encodeURIComponent(userId)}`,
    { auth: true }
  );

  if (!Array.isArray(data?.rows)) return [];

  return data.rows
    .map((row) => ({
      movie_id: Number(row.movie_id || 0),
      media_type: row.media_type === "tv" ? "tv" : "movie",
      rating: Number(row.rating || 0),
      media_title: row.media_title || row.title || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
    .filter((row) => row.movie_id > 0 && row.rating > 0);
}

export async function upsertRating(
  userId: string,
  movieId: number,
  rating: number,
  mediaType: MediaType = "movie",
  mediaTitle?: string
) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("ratings.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      movie_id: movieId,
      media_type: mediaType,
      rating,
      media_title: mediaTitle || null,
    }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function upsertUser(id: string, email?: string | null, username?: string | null) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("users.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, email: email || null, username: username || email?.split("@")[0] || "utilizador" }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function deleteAccount(id: string) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("users.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function toggleFavorite(
  userId: string,
  movieId: number,
  mediaType: MediaType = "movie",
  mediaTitle?: string
) {
  const data = await apiFetch<ApiObjectResponse<{ favorited?: boolean }>>("favorites.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      movie_id: movieId,
      media_type: mediaType,
      media_title: mediaTitle || null,
    }),
    auth: true,
    csrf: true,
  });

  return data?.favorited === true;
}

export async function listFavorites(userId: string) {
  const data = await apiFetch<ApiCollectionResponse<unknown>>(`favorites.php?action=list&user_id=${encodeURIComponent(userId)}`, { auth: true });
  return data?.rows || [];
}

export async function toggleWatchlist(
  userId: string,
  movieId: number,
  mediaType: MediaType = "movie",
  mediaTitle?: string
) {
  const data = await apiFetch<ApiObjectResponse<{ watchlisted?: boolean }>>("watchlist.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      movie_id: movieId,
      media_type: mediaType,
      media_title: mediaTitle || null,
    }),
    auth: true,
    csrf: true,
  });

  return data?.watchlisted === true;
}

export async function listWatchlist(userId: string) {
  const data = await apiFetch<ApiCollectionResponse<WatchlistRow>>(`watchlist.php?action=list&user_id=${encodeURIComponent(userId)}`, { auth: true });
  return data?.rows || [];
}

export async function voteComment(userId: string, commentId: number | string, voteType: "like" | "dislike") {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("comment_votes.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, comment_id: commentId, vote_type: voteType }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function getUserVotes(userId: string, movieId: number, mediaType: MediaType = "movie") {
  const data = await apiFetch<ApiCollectionResponse<CommentVoteRow>>(
    `comment_votes.php?user_id=${encodeURIComponent(userId)}&movie_id=${movieId}&media_type=${mediaType}`,
    { auth: true }
  );
  return data?.rows || [];
}

export async function upsertMovieGenres(
  movieId: number,
  mediaType: MediaType,
  genreIds: number[],
  mediaTitle?: string
) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("movie_genres.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      movie_id: movieId,
      media_type: mediaType,
      genre_ids: genreIds,
      media_title: mediaTitle || null,
    }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function getFavoriteGenre(userId: string) {
  const data = await apiFetch<ApiObjectResponse<{ row?: unknown }>>(`users_favorite_genre.php?user_id=${encodeURIComponent(userId)}`, { auth: true });
  return data?.row || null;
}

export async function saveQuizResult(userId: string, resultKey: string, resultLabel: string, resultDesc: string) {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("quiz.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, result_key: resultKey, result_label: resultLabel, result_desc: resultDesc }),
    auth: true,
    csrf: true,
  });

  return data?.ok === true;
}

export async function getQuizResult(userId: string) {
  const data = await apiFetch<ApiObjectResponse<{ result?: unknown }>>(`quiz.php?user_id=${encodeURIComponent(userId)}`, { auth: true });
  return data?.result || null;
}

export async function seedBadges() {
  const data = await apiFetch<ApiObjectResponse<{ ok?: boolean }>>("badges.php?action=seed");
  return data?.ok !== false;
}

export async function getAllBadges() {
  const data = await apiFetch<ApiCollectionResponse<UserBadgeRow>>("badges.php");
  return Array.isArray(data?.rows) ? data.rows.map(normalizeUserBadge) : [];
}

export async function getUserBadges(userId: string) {
  const data = await apiFetch<ApiCollectionResponse<UserBadgeRow>>(`users_badges.php?user_id=${encodeURIComponent(userId)}`, { auth: true });
  return Array.isArray(data?.rows) ? data.rows.map(normalizeUserBadge) : [];
}

export async function getUserStats(userId: string) {
  return apiFetch<Record<string, unknown>>(`users_stats.php?user_id=${encodeURIComponent(userId)}`, { auth: true });
}

export async function getPublicUserCard(userId: string, username?: string): Promise<PublicUserCardResponse | null> {
  const params = new URLSearchParams({ user_id: userId });
  if (username) params.set("username", username);

  const data = await apiFetch<PublicUserCardResponse>(`public_user_card.php?${params.toString()}`);
  if (!data?.ok || !data.user) return null;

  return {
    ...data,
    badges: Array.isArray(data.badges) ? data.badges.map(normalizeUserBadge) : [],
  };
}

export async function testBackend() {
  const data = await apiFetch<Record<string, unknown>>("health.php");
  return data || { status: "offline" };
}
