/**
 * Admin dashboard. Manages moderation, users, catalogue, requests and operational stats.
 */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Clock, ExternalLink, FileText, Film, Home, Image as ImageIcon, MessageCircle, PackagePlus, Pencil, PlayCircle, RefreshCw, Save, Search, Shield, Star, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { fetchData, postData } from '@/services/apiHelper';
import { createCatalogItem, deleteCatalogItem, fetchCustomCatalog, updateCatalogItem } from '@/services/api';
import { LOCAL_MOVIES, LOCAL_SHOWS } from '@/data/localCatalog';
import {
  deleteMovieRequest,
  listMovieRequests,
  MovieRequest,
  RequestStatus,
  RequestsStats,
  requestMediaLabels,
  requestStatusLabels,
  updateMovieRequestStatus,
  updateMovieRequestDetails,
} from '@/services/requests';
import { getTrailerAction } from '@/lib/trailers';

interface AdminComment {
  id: number;
  user_id: string;
  username: string;
  content: string;
  status: string;
  created_at: string;
  movie_id: number;
  media_type: string;
  media_title?: string;
  is_spoiler?: number | boolean;
  approved_at?: string;
}

interface AdminRating {
  id: number;
  user_id: string;
  username: string;
  movie_id: number;
  media_type: string;
  media_title?: string;
  rating: number;
  created_at?: string;
  updated_at?: string;
}

interface CatalogAdminItem {
  id?: number | string;
  movie_id?: number | string;
  title?: string | null;
  name?: string | null;
  media_type?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  trailer_url?: string | null;
  overview?: string | null;
  genre_ids?: number[];
}

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
};

type CommentFilter = 'pending' | 'approved';
type AdminTab = 'comments' | 'ratings' | 'requests' | 'catalog';
type RequestFilter = RequestStatus | 'all';
type RequestBoardView = 'not_approved' | 'approved';

const requestFilters: Array<{ key: RequestFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Por aprovar' },
  { key: 'in_progress', label: 'Em revisão' },
  { key: 'cancelled', label: 'Não aprovados' },
];

const emptyRequestStats: RequestsStats = {
  all: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
};

const getRequestFilterCount = (stats: RequestsStats, filter: RequestFilter) => {
  if (filter === 'all') return stats.all;
  return stats[filter] || 0;
};

const requestStatusClass: Record<RequestStatus, string> = {
  pending: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
  in_progress: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  cancelled: 'border-red-400/30 bg-red-400/10 text-red-200',
};

const catalogTitleMap = new Map<string, string>([
  ...LOCAL_MOVIES.map((movie) => [`movie:${movie.id}`, movie.title || movie.name || 'Sem título'] as [string, string]),
  ...LOCAL_SHOWS.map((show) => [`tv:${show.id}`, show.name || show.title || 'Sem título'] as [string, string]),
]);

const getMediaTitle = (item: { movie_id: number; media_type: string; media_title?: string }) => {
  const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
  return item.media_title || catalogTitleMap.get(`${mediaType}:${item.movie_id}`) || `${mediaType === 'tv' ? 'Série' : 'Filme'} #${item.movie_id}`;
};

const getRatingMovieKey = (item: { movie_id: number; media_type: string }) => {
  const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
  return `${mediaType}:${item.movie_id}`;
};

const openExternal = (url?: string | null) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>('comments');
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [filter, setFilter] = useState<CommentFilter>('pending');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestBoardView, setRequestBoardView] = useState<RequestBoardView>('not_approved');
  const [requestStats, setRequestStats] = useState<RequestsStats>(emptyRequestStats);
  const [movieRequests, setMovieRequests] = useState<MovieRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingRequestId, setSavingRequestId] = useState<number | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [editingRequestForm, setEditingRequestForm] = useState({
    title: '',
    media_type: 'movie' as 'movie' | 'tv' | 'other',
    poster_url: '',
    trailer_url: '',
    synopsis: '',
    note: '',
  });
  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);
  const [editingRatingValue, setEditingRatingValue] = useState('');
  const [savingRatingId, setSavingRatingId] = useState<number | null>(null);
  const [editingMovieKey, setEditingMovieKey] = useState<string | null>(null);
  const [editingMovieTitle, setEditingMovieTitle] = useState('');
  const [savingMovieKey, setSavingMovieKey] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [catalogItems, setCatalogItems] = useState<CatalogAdminItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [deletingCatalogId, setDeletingCatalogId] = useState<number | null>(null);
  const [editingCatalogForm, setEditingCatalogForm] = useState({
    title: '',
    media_type: 'movie' as 'movie' | 'tv',
    release_date: '',
    poster_path: '',
    backdrop_path: '',
    trailer_url: '',
    overview: '',
  });
  const [catalogForm, setCatalogForm] = useState({
    title: '',
    media_type: 'movie' as 'movie' | 'tv',
    release_date: '',
    poster_path: '',
    backdrop_path: '',
    trailer_url: '',
    overview: '',
  });
  const [stats, setStats] = useState({
    users: 0,
    pending_comments: 0,
    approved_comments: 0,
    ratings: 0,
    requests_pending: 0,
    requests_in_progress: 0,
    requests_completed: 0,
  });

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'comments' || tab === 'ratings' || tab === 'requests' || tab === 'catalog') {
      setActiveTab(tab);
    }
  }, [location.search]);

  const changeTab = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate(`/admin?tab=${tab}`, { replace: true });
  };

  const loadStats = useCallback(async () => {
    const data = await fetchData('admin.php', { action: 'stats' });
    if (data?.stats) {
      setStats((current) => ({
        ...current,
        users: Number(data.stats.users || 0),
        pending_comments: Number(data.stats.pending_comments || 0),
        approved_comments: Number(data.stats.approved_comments || 0),
        ratings: Number(data.stats.ratings || 0),
        requests_pending: Number(data.stats.requests_pending || current.requests_pending || 0),
        requests_in_progress: Number(data.stats.requests_in_progress || current.requests_in_progress || 0),
        requests_completed: Number(data.stats.requests_completed || current.requests_completed || 0),
      }));
    }
  }, []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData('admin.php', { action: 'comments', status: filter });
      setComments(Array.isArray(data?.comments) ? data.comments : []);
      await loadStats();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os comentários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filter, loadStats]);

  const loadRatings = useCallback(async () => {
    setLoadingRatings(true);
    try {
      const data = await fetchData('admin.php', { action: 'ratings' });
      setRatings(Array.isArray(data?.ratings) ? data.ratings : []);
      await loadStats();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as avaliações.',
        variant: 'destructive',
      });
    } finally {
      setLoadingRatings(false);
    }
  }, [loadStats]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await listMovieRequests(requestFilter, true);
      setMovieRequests(data.requests);
      setRequestStats(data.stats);
      setStats((current) => ({
        ...current,
        requests_pending: data.stats.pending,
        requests_in_progress: data.stats.in_progress,
        requests_completed: data.stats.completed,
      }));
      const notes: Record<number, string> = {};
      data.requests.forEach((request) => {
        notes[request.id] = request.admin_note || '';
      });
      setAdminNotes(notes);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sugestões.',
        variant: 'destructive',
      });
    } finally {
      setLoadingRequests(false);
    }
  }, [requestFilter]);


  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const rows = await fetchCustomCatalog();
      setCatalogItems(Array.isArray(rows) ? rows : []);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o catálogo extra.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const refreshAll = async () => {
    await Promise.all([loadComments(), loadRatings(), loadRequests(), loadStats(), loadCatalog()]);
  };

  const decideComment = async (commentId: number, status: 'approved' | 'rejected') => {
    setSavingId(commentId);
    try {
      const result = await postData('admin.php', {
        action: 'update_comment',
        comment_id: commentId,
        status,
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      toast({
        title: status === 'approved' ? 'Comentário aprovado' : 'Comentário rejeitado',
        description: status === 'approved' ? 'Agora já aparece no site.' : 'Foi removido dos pendentes.',
      });

      setComments((current) => current.filter((comment) => comment.id !== commentId));
      await loadStats();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível atualizar o comentário.'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const deleteComment = async (commentId: number) => {
    setSavingId(commentId);
    try {
      const result = await postData('admin.php', {
        action: 'delete_comment',
        comment_id: commentId,
        list: filter,
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      toast({
        title: 'Comentário apagado',
        description: 'Foi removido do ficheiro de dados local.',
      });

      setComments((current) => current.filter((comment) => comment.id !== commentId));
      await loadStats();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível apagar o comentário.'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const startEditComment = (comment: AdminComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const saveCommentEdit = async (comment: AdminComment) => {
    const cleanContent = editingCommentContent.trim();
    if (cleanContent.length < 2) {
      toast({
        title: 'Comentário demasiado curto',
        description: 'O comentário precisa de pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSavingId(comment.id);
    try {
      const result = await postData('admin.php', {
        action: 'edit_comment',
        comment_id: comment.id,
        list: filter,
        content: cleanContent,
        is_spoiler: Boolean(comment.is_spoiler),
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      setComments((current) => current.map((item) => (
        item.id === comment.id ? { ...item, content: cleanContent } : item
      )));
      cancelEditComment();

      toast({
        title: 'Comentário editado',
        description: 'O texto foi atualizado com o mesmo fluxo de moderação das sugestões.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível editar o comentário.'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const updateRequest = async (requestId: number, status: RequestStatus) => {
    setSavingRequestId(requestId);
    try {
      const result = await updateMovieRequestStatus(requestId, status, adminNotes[requestId] || '');
      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      toast({
        title: 'Sugestão atualizada',
        description: `Estado alterado para ${requestStatusLabels[status]}.`,
      });

      await loadRequests();
      await loadStats();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível atualizar a sugestão.'),
        variant: 'destructive',
      });
    } finally {
      setSavingRequestId(null);
    }
  };

  const removeRequest = async (requestId: number) => {
    const confirmed = window.confirm('Apagar esta sugestão? Depois não há botão mágico para a ressuscitar.');
    if (!confirmed) return;

    setSavingRequestId(requestId);
    try {
      const result = await deleteMovieRequest(requestId);
      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      toast({ title: 'Sugestão apagada', description: 'Foi removido da lista.' });
      await loadRequests();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível apagar a sugestão.'),
        variant: 'destructive',
      });
    } finally {
      setSavingRequestId(null);
    }
  };


  const startEditRequest = (request: MovieRequest) => {
    setEditingRequestId(request.id);
    setEditingRequestForm({
      title: request.title || '',
      media_type: request.media_type || 'movie',
      poster_url: request.poster_url || '',
      trailer_url: request.trailer_url || '',
      synopsis: request.synopsis || '',
      note: request.note || '',
    });
  };

  const cancelEditRequest = () => {
    setEditingRequestId(null);
    setEditingRequestForm({
      title: '',
      media_type: 'movie',
      poster_url: '',
      trailer_url: '',
      synopsis: '',
      note: '',
    });
  };

  const saveRequestDetails = async (request: MovieRequest) => {
    const cleanTitle = editingRequestForm.title.trim();
    if (cleanTitle.length < 2) {
      toast({
        title: 'Título demasiado curto',
        description: 'A sugestão precisa de pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSavingRequestId(request.id);
    try {
      const result = await updateMovieRequestDetails(request.id, {
        title: cleanTitle,
        media_type: editingRequestForm.media_type,
        poster_url: editingRequestForm.poster_url.trim(),
        trailer_url: editingRequestForm.trailer_url.trim(),
        synopsis: editingRequestForm.synopsis.trim(),
        note: editingRequestForm.note.trim(),
        admin_note: adminNotes[request.id] || request.admin_note || '',
      });

      const updatedRequest = result.request;
      if (!result?.ok || !updatedRequest) {
        throw new Error(result?.message || result?.error || 'Não foi possível guardar a sugestão.');
      }

      setMovieRequests((current) => current.map((item) => (item.id === request.id ? updatedRequest : item)));
      setAdminNotes((current) => ({ ...current, [request.id]: updatedRequest.admin_note || '' }));
      cancelEditRequest();

      toast({
        title: 'Sugestão editada',
        description: 'Imagem, trailer, sinopse e dados ficaram atualizados.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível editar a sugestão.'),
        variant: 'destructive',
      });
    } finally {
      setSavingRequestId(null);
    }
  };

  const submitCatalogItem = async (event?: FormEvent, fromRequest?: MovieRequest) => {
    event?.preventDefault();

    const cleanTitle = (fromRequest?.title || catalogForm.title).trim();
    const mediaType = fromRequest ? (fromRequest.media_type === 'tv' ? 'tv' : 'movie') : catalogForm.media_type;

    if (cleanTitle.length < 2) {
      toast({
        title: 'Título demasiado curto',
        description: 'Escreve pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSavingCatalog(true);
    try {
      const result = await createCatalogItem({
        title: cleanTitle,
        media_type: mediaType,
        overview: fromRequest ? (fromRequest.synopsis || fromRequest.note || '') : catalogForm.overview.trim(),
        release_date: fromRequest ? '' : catalogForm.release_date.trim(),
        poster_path: fromRequest ? (fromRequest.poster_url || null) : (catalogForm.poster_path.trim() || null),
        backdrop_path: fromRequest ? (fromRequest.poster_url || null) : (catalogForm.backdrop_path.trim() || null),
        trailer_url: fromRequest ? (fromRequest.trailer_url || null) : (catalogForm.trailer_url.trim() || null),
        genre_ids: [],
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Não foi possível adicionar ao catálogo.');

      if (!fromRequest) {
        setCatalogForm({ title: '', media_type: 'movie', release_date: '', poster_path: '', backdrop_path: '', trailer_url: '', overview: '' });
      }

      toast({
        title: 'Título adicionado',
        description: `${cleanTitle} já entra na pesquisa e na contagem do catálogo.`,
      });

      if (fromRequest) {
        await updateMovieRequestStatus(fromRequest.id, 'completed', adminNotes[fromRequest.id] || 'Aprovado e adicionado ao catálogo.');
        setRequestBoardView('approved');
        await loadRequests();
        await loadStats();
      }

      await loadCatalog();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível adicionar o título.'),
        variant: 'destructive',
      });
    } finally {
      setSavingCatalog(false);
    }
  };

  const startEditRating = (rating: AdminRating) => {
    setEditingRatingId(rating.id);
    setEditingRatingValue(String(Number(rating.rating || 0)));
  };

  const cancelEditRating = () => {
    setEditingRatingId(null);
    setEditingRatingValue('');
  };

  const saveRatingEdit = async (rating: AdminRating) => {
    const value = Number(editingRatingValue);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      toast({
        title: 'Avaliação inválida',
        description: 'A avaliação tem de estar entre 0 e 10.',
        variant: 'destructive',
      });
      return;
    }

    setSavingRatingId(rating.id);
    try {
      const result = await postData('admin.php', {
        action: 'update_rating',
        rating_id: rating.id,
        rating: value,
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      setRatings((current) => current.map((item) => (item.id === rating.id ? { ...item, rating: value, updated_at: new Date().toISOString() } : item)));
      cancelEditRating();
      await loadStats();

      toast({
        title: 'Avaliação atualizada',
        description: `${getMediaTitle(rating)} ficou com ${value.toFixed(1)} / 10.`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível editar a avaliação.'),
        variant: 'destructive',
      });
    } finally {
      setSavingRatingId(null);
    }
  };

  const deleteRating = async (rating: AdminRating) => {
    const confirmed = window.confirm(`Apagar a avaliação de ${getMediaTitle(rating)}?`);
    if (!confirmed) return;

    setSavingRatingId(rating.id);
    try {
      const result = await postData('admin.php', {
        action: 'delete_rating',
        rating_id: rating.id,
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      setRatings((current) => current.filter((item) => item.id !== rating.id));
      await loadStats();

      toast({
        title: 'Avaliação apagada',
        description: 'Foi removida da base de dados.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível apagar a avaliação.'),
        variant: 'destructive',
      });
    } finally {
      setSavingRatingId(null);
    }
  };

  const startEditMovie = (rating: AdminRating) => {
    setEditingMovieKey(getRatingMovieKey(rating));
    setEditingMovieTitle(getMediaTitle(rating));
  };

  const cancelEditMovie = () => {
    setEditingMovieKey(null);
    setEditingMovieTitle('');
  };

  const saveMovieEdit = async (rating: AdminRating) => {
    const cleanTitle = editingMovieTitle.trim();
    if (cleanTitle.length < 2) {
      toast({
        title: 'Título inválido',
        description: 'O nome do filme ou série tem de ter pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    const currentMovieKey = getRatingMovieKey(rating);
    setSavingMovieKey(currentMovieKey);
    try {
      const result = await postData('admin.php', {
        action: 'update_movie_title',
        movie_id: rating.movie_id,
        media_type: rating.media_type === 'tv' ? 'tv' : 'movie',
        media_title: cleanTitle,
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      setRatings((current) => current.map((item) => (
        getRatingMovieKey(item) === currentMovieKey ? { ...item, media_title: cleanTitle, updated_at: new Date().toISOString() } : item
      )));
      cancelEditMovie();

      toast({
        title: 'Filme atualizado',
        description: `O título passou a aparecer como ${cleanTitle}.`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível editar o filme.'),
        variant: 'destructive',
      });
    } finally {
      setSavingMovieKey(null);
    }
  };


  const startEditCatalogItem = (item: CatalogAdminItem) => {
    const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
    setEditingCatalogId(Number(item.id || item.movie_id));
    setEditingCatalogForm({
      title: item.title || item.name || '',
      media_type: mediaType,
      release_date: mediaType === 'tv' ? (item.first_air_date || '') : (item.release_date || ''),
      poster_path: item.poster_path || '',
      backdrop_path: item.backdrop_path || '',
      trailer_url: item.trailer_url || '',
      overview: item.overview || '',
    });
  };

  const cancelEditCatalogItem = () => {
    setEditingCatalogId(null);
    setEditingCatalogForm({ title: '', media_type: 'movie', release_date: '', poster_path: '', backdrop_path: '', trailer_url: '', overview: '' });
  };

  const saveCatalogItemEdit = async (item: CatalogAdminItem) => {
    const cleanTitle = editingCatalogForm.title.trim();
    if (cleanTitle.length < 2) {
      toast({
        title: 'Título inválido',
        description: 'O título tem de ter pelo menos 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    const itemId = Number(item.id || item.movie_id);
    setSavingCatalog(true);
    try {
      const result = await updateCatalogItem({
        id: itemId,
        movie_id: Number(item.movie_id || item.id),
        title: cleanTitle,
        media_type: editingCatalogForm.media_type,
        overview: editingCatalogForm.overview.trim(),
        release_date: editingCatalogForm.release_date.trim(),
        poster_path: editingCatalogForm.poster_path.trim() || null,
        backdrop_path: editingCatalogForm.backdrop_path.trim() || null,
        trailer_url: editingCatalogForm.trailer_url.trim() || null,
        genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : [],
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Não foi possível editar o título.');

      toast({
        title: 'Título atualizado',
        description: `${cleanTitle} foi atualizado no catálogo.`,
      });

      cancelEditCatalogItem();
      await Promise.all([loadCatalog(), loadRatings(), loadComments()]);
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível editar o título.'),
        variant: 'destructive',
      });
    } finally {
      setSavingCatalog(false);
    }
  };

  const removeCatalogItem = async (item: CatalogAdminItem) => {
    const title = item.title || item.name || 'este título';
    const confirmed = window.confirm(`Apagar ${title} do catálogo extra?`);
    if (!confirmed) return;

    const itemId = Number(item.id || item.movie_id);
    setDeletingCatalogId(itemId);
    try {
      const result = await deleteCatalogItem(itemId, item.media_type === 'tv' ? 'tv' : 'movie');
      if (!result?.ok) throw new Error(result?.message || result?.error || 'Não foi possível apagar o título.');

      setCatalogItems((current) => current.filter((catalogItem) => Number(catalogItem.id || catalogItem.movie_id) !== itemId));
      toast({
        title: 'Título apagado',
        description: `${title} saiu do catálogo extra.`,
      });
      await Promise.all([loadStats(), loadRatings()]);
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível apagar o título.'),
        variant: 'destructive',
      });
    } finally {
      setDeletingCatalogId(null);
    }
  };

  const deleteMovieFromRatings = async (rating: AdminRating) => {
    const title = getMediaTitle(rating);
    const confirmed = window.confirm(`Apagar ${title} da lista de avaliações? Isto remove todas as avaliações desse filme/série.`);
    if (!confirmed) return;

    const currentMovieKey = getRatingMovieKey(rating);
    setSavingMovieKey(currentMovieKey);
    try {
      const result = await postData('admin.php', {
        action: 'delete_movie',
        movie_id: rating.movie_id,
        media_type: rating.media_type === 'tv' ? 'tv' : 'movie',
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      setRatings((current) => current.filter((item) => getRatingMovieKey(item) !== currentMovieKey));
      await loadStats();

      toast({
        title: 'Filme removido das avaliações',
        description: `${title} desapareceu da lista de ratings.`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não foi possível apagar o filme das avaliações.'),
        variant: 'destructive',
      });
    } finally {
      setSavingMovieKey(null);
    }
  };

  const filterLabel = filter === 'pending' ? 'pendentes' : 'aprovados';
  const normalizedRequestSearch = requestSearch.trim().toLowerCase();
  const notApprovedMovieRequests = movieRequests.filter((request) => request.status !== 'completed');
  const visibleMovieRequests = normalizedRequestSearch
    ? notApprovedMovieRequests.filter((request) => {
        const haystack = [request.title, request.username, request.note, request.synopsis, request.poster_url, request.trailer_url, request.admin_note]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedRequestSearch);
      })
    : notApprovedMovieRequests;
  const visibleApprovedCatalogItems = normalizedRequestSearch
    ? catalogItems.filter((item) => {
        const haystack = [
          item.title,
          item.name,
          item.release_date,
          item.first_air_date,
          item.poster_path,
          item.backdrop_path,
          item.trailer_url,
          item.overview,
          item.media_type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedRequestSearch);
      })
    : catalogItems;
  const activeRequestTotal = requestStats.pending + requestStats.in_progress;
  const notApprovedTotal = requestStats.pending + requestStats.in_progress + requestStats.cancelled;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Painel de Admin</span>
              <Badge variant="secondary">Role: admin</Badge>
            </div>
            <h1 className="text-3xl font-bold">Controlo do Movings</h1>
            <p className="text-muted-foreground mt-2">
              Modera comentários, confirma avaliações com o título certo e gere sugestões da comunidade.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Voltar ao site
            </Button>
            <Button onClick={refreshAll} disabled={loading || loadingRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Utilizadores
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.users}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Comentários pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.pending_comments}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Comentários aprovados
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.approved_comments}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" /> Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.ratings}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <PackagePlus className="h-4 w-4" /> Por aprovar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.requests_pending}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Em revisão
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.requests_in_progress}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4" /> Aprovados
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{stats.requests_completed}</CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/70 p-2">
          <Button variant={activeTab === 'comments' ? 'gold' : 'ghost'} onClick={() => changeTab('comments')}>
            <MessageCircle className="h-4 w-4" />
            Comentários
          </Button>
          <Button variant={activeTab === 'ratings' ? 'gold' : 'ghost'} onClick={() => changeTab('ratings')}>
            <Star className="h-4 w-4" />
            Avaliações
          </Button>
          <Button variant={activeTab === 'requests' ? 'gold' : 'ghost'} onClick={() => changeTab('requests')}>
            <PackagePlus className="h-4 w-4" />
            Sugestões
          </Button>
          <Button variant={activeTab === 'catalog' ? 'gold' : 'ghost'} onClick={() => changeTab('catalog')}>
            <Film className="h-4 w-4" />
            Filmes aprovados
          </Button>
        </div>

        {activeTab === 'comments' ? (
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Comentários {filterLabel}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant={filter === 'pending' ? 'gold' : 'outline'} onClick={() => setFilter('pending')}>
                  Pendentes
                  <Badge className="ml-2" variant="secondary">{stats.pending_comments}</Badge>
                </Button>
                <Button variant={filter === 'approved' ? 'gold' : 'outline'} onClick={() => setFilter('approved')}>
                  Aprovados
                  <Badge className="ml-2" variant="secondary">{stats.approved_comments}</Badge>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-muted-foreground">A carregar comentários...</div>
              ) : comments.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                  Não há comentários {filterLabel}. Pequena vitória administrativa, aproveita enquanto dura.
                </div>
              ) : (
                comments.map((comment) => {
                  const isEditingComment = editingCommentId === comment.id;

                  return (
                    <div key={`${filter}-${comment.id}`} className="rounded-2xl border bg-card p-4 space-y-4 transition hover:border-primary/30">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{comment.username}</p>
                            <Badge variant="outline">{comment.media_type === 'tv' ? 'Série' : 'Filme'}</Badge>
                            <Badge variant={filter === 'pending' ? 'secondary' : 'default'}>
                              {filter === 'pending' ? 'Pendente' : 'Aprovado'}
                            </Badge>
                            {comment.is_spoiler ? <Badge variant="destructive">Spoiler</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getMediaTitle(comment)} ·{' '}
                            {new Date(comment.created_at).toLocaleString('pt-PT')}
                          </p>
                        </div>

                        <div className="rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                          Fluxo: submetido → moderação → publicação
                        </div>
                      </div>

                      {isEditingComment ? (
                        <div className="space-y-3 rounded-xl border border-primary/20 bg-background/50 p-3">
                          <label className="text-sm font-medium text-muted-foreground">Editar comentário</label>
                          <textarea
                            value={editingCommentContent}
                            onChange={(event) => setEditingCommentContent(event.target.value)}
                            className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            maxLength={2000}
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="ghost" onClick={cancelEditComment} disabled={savingId === comment.id}>
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                            <Button variant="gold" onClick={() => saveCommentEdit(comment)} disabled={savingId === comment.id}>
                              <Save className="h-4 w-4 mr-2" />
                              Guardar comentário
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-lg bg-secondary/40 p-3 leading-relaxed">{comment.content}</p>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {!isEditingComment && (
                          <Button variant="outline" onClick={() => startEditComment(comment)} disabled={savingId === comment.id}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        )}

                        {filter === 'pending' ? (
                          <>
                            <Button variant="outline" onClick={() => decideComment(comment.id, 'rejected')} disabled={savingId === comment.id || isEditingComment}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                            <Button variant="gold" onClick={() => decideComment(comment.id, 'approved')} disabled={savingId === comment.id || isEditingComment}>
                              <Check className="h-4 w-4 mr-2" />
                              Aprovar
                            </Button>
                          </>
                        ) : (
                          <Button variant="destructive" onClick={() => deleteComment(comment.id)} disabled={savingId === comment.id || isEditingComment}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Apagar comentário
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : activeTab === 'ratings' ? (
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Avaliações guardadas
              </CardTitle>
              <Badge variant="secondary">{ratings.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingRatings ? (
                <div className="text-muted-foreground">A carregar avaliações...</div>
              ) : ratings.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                  Ainda não há avaliações. Quando alguém avaliar, aparece aqui com o título do filme ou série.
                </div>
              ) : (
                ratings.map((rating) => {
                  const currentMovieKey = getRatingMovieKey(rating);
                  return (
                    <div key={rating.id} className="rounded-xl border bg-card p-4 space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{rating.media_type === 'tv' ? 'Série' : 'Filme'}</Badge>
                            <Badge variant="secondary">{Number(rating.rating).toFixed(1)} / 10</Badge>
                          </div>
                          <h3 className="text-lg font-semibold">{getMediaTitle(rating)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Avaliado por {rating.username || 'utilizador'} · {new Date(rating.updated_at || rating.created_at || '').toLocaleString('pt-PT')}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {editingMovieKey === currentMovieKey ? (
                            <>
                              <input
                                type="text"
                                value={editingMovieTitle}
                                onChange={(event) => setEditingMovieTitle(event.target.value)}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground sm:w-56"
                                aria-label="Novo nome do filme ou série"
                                placeholder="Nome do filme/série"
                                maxLength={200}
                              />
                              <Button variant="ghost" onClick={() => saveMovieEdit(rating)} disabled={savingMovieKey === currentMovieKey}>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar
                              </Button>
                              <Button variant="ghost" onClick={cancelEditMovie} disabled={savingMovieKey === currentMovieKey}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" onClick={() => startEditMovie(rating)} disabled={savingMovieKey === currentMovieKey}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar filme
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => deleteMovieFromRatings(rating)}
                                disabled={savingMovieKey === currentMovieKey}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Apagar filme
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/40 p-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Rating deste utilizador</p>
                          <p className="text-xs text-muted-foreground">Edita só a nota desta avaliação, sem mexer nas outras.</p>
                        </div>
                        {editingRatingId === rating.id ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="number"
                              value={editingRatingValue}
                              onChange={(event) => setEditingRatingValue(event.target.value)}
                              min="0.5"
                              max="5"
                              step="0.5"
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground sm:w-28"
                              aria-label="Editar avaliação"
                            />
                            <Button variant="ghost" onClick={() => saveRatingEdit(rating)} disabled={savingRatingId === rating.id}>
                              <Save className="h-4 w-4 mr-2" />
                              Guardar rating
                            </Button>
                            <Button variant="ghost" onClick={cancelEditRating} disabled={savingRatingId === rating.id}>
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button variant="outline" onClick={() => startEditRating(rating)} disabled={savingRatingId === rating.id}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar rating
                            </Button>
                            <Button variant="destructive" onClick={() => deleteRating(rating)} disabled={savingRatingId === rating.id}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Apagar rating
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : activeTab === 'requests' ? (
          <div className="space-y-5">
            <Card className="overflow-hidden border-primary/20 bg-card/80">
              <CardHeader className="space-y-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PackagePlus className="h-5 w-5 text-primary" />
                      Gestão de sugestões
                    </CardTitle>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      Área exclusiva do admin para validar pedidos completos, consultar poster/trailer/sinopse e transformar sugestões em entradas reais do catálogo.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
                    <div className="rounded-2xl border border-border bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Total pedidos</p>
                      <p className="mt-1 text-2xl font-bold">{requestStats.all}</p>
                    </div>
                    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-yellow-200/80">Não aprovados</p>
                      <p className="mt-1 text-2xl font-bold">{notApprovedTotal}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-blue-200/80">Em revisão</p>
                      <p className="mt-1 text-2xl font-bold">{activeRequestTotal}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-200/80">Aprovados</p>
                      <p className="mt-1 text-2xl font-bold">{catalogItems.length}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[340px_1fr_320px]">
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/50 p-2">
                    <Button
                      variant={requestBoardView === 'not_approved' ? 'gold' : 'ghost'}
                      onClick={() => setRequestBoardView('not_approved')}
                      className="gap-2"
                    >
                      Não aprovados
                      <Badge variant="secondary">{notApprovedTotal}</Badge>
                    </Button>
                    <Button
                      variant={requestBoardView === 'approved' ? 'gold' : 'ghost'}
                      onClick={() => setRequestBoardView('approved')}
                      className="gap-2"
                    >
                      Filmes aprovados
                      <Badge variant="secondary">{catalogItems.length}</Badge>
                    </Button>
                  </div>

                  {requestBoardView === 'not_approved' ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/50 p-2">
                      {requestFilters.map((item) => (
                        <Button
                          key={item.key}
                          variant={requestFilter === item.key ? 'gold' : 'ghost'}
                          onClick={() => setRequestFilter(item.key)}
                          className="gap-2"
                        >
                          {item.label}
                          <Badge variant="secondary">{item.key === 'all' ? notApprovedTotal : getRequestFilterCount(requestStats, item.key)}</Badge>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                      Aqui ficam os filmes e séries já aprovados/adicionados pelo admin. Dá para editar poster, trailer, sinopse, tipo e data.
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={requestSearch}
                      onChange={(event) => setRequestSearch(event.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-10 text-sm text-foreground outline-none transition focus:border-primary"
                      placeholder={requestBoardView === 'approved' ? 'Pesquisar aprovados...' : 'Pesquisar sugestões...'}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                {requestBoardView === 'approved' ? (
                  loadingCatalog ? (
                    <div className="rounded-2xl border border-border bg-secondary/30 p-8 text-center text-muted-foreground">
                      A carregar filmes aprovados...
                    </div>
                  ) : visibleApprovedCatalogItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                      Ainda não há filmes/séries aprovados neste filtro. Quando o admin adicionar uma sugestão ao catálogo, aparece aqui.
                    </div>
                  ) : (
                    visibleApprovedCatalogItems.map((item) => {
                      const itemId = Number(item.id || item.movie_id);
                      const isEditing = editingCatalogId === itemId;
                      const itemTitle = item.title || item.name || 'Sem título';
                      const itemType = item.media_type === 'tv' ? 'tv' : 'movie';
                      const releaseLabel = itemType === 'tv' ? (item.first_air_date || '') : (item.release_date || '');
                      const trailerAction = getTrailerAction(item.trailer_url, itemTitle);

                      return (
                        <div
                          key={`approved-${itemType}-${itemId}`}
                          className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-card shadow-sm transition duration-300 hover:border-emerald-400/40"
                        >
                          <div className="grid gap-4 p-4 xl:grid-cols-[132px_1fr]">
                            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-secondary/40">
                              {item.poster_path ? (
                                <img
                                  src={item.poster_path}
                                  alt={`Poster de ${itemTitle}`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <ImageIcon className="h-8 w-8" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 space-y-4">
                              {!isEditing ? (
                                <>
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{itemType === 'tv' ? 'Série' : 'Filme'}</Badge>
                                        <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100">Aprovado</Badge>
                                        {item.poster_path && (
                                          <Badge variant="secondary" className="gap-1">
                                            <ImageIcon className="h-3.5 w-3.5" />
                                            Imagem
                                          </Badge>
                                        )}
                                        {item.trailer_url && (
                                          <Badge variant="secondary" className="gap-1">
                                            <PlayCircle className="h-3.5 w-3.5" />
                                            Trailer
                                          </Badge>
                                        )}
                                      </div>
                                      <h3 className="truncate text-xl font-semibold">{itemTitle}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {releaseLabel || 'Sem data'} · ID local #{itemId}
                                      </p>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[260px]">
                                      <Button variant="outline" onClick={() => startEditCatalogItem(item)} disabled={savingCatalog || deletingCatalogId === itemId}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar tudo
                                      </Button>
                                      <Button variant="destructive" onClick={() => removeCatalogItem(item)} disabled={savingCatalog || deletingCatalogId === itemId}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Apagar
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="grid gap-3 lg:grid-cols-2">
                                    {item.poster_path && (
                                      <button
                                        type="button"
                                        onClick={() => openExternal(item.poster_path)}
                                        className="rounded-xl border border-border bg-background/50 p-3 text-left text-sm transition hover:border-primary/40"
                                      >
                                        <span className="flex items-center gap-2 font-medium">
                                          <ImageIcon className="h-4 w-4 text-primary" />
                                          URL da imagem
                                        </span>
                                        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.poster_path}</span>
                                      </button>
                                    )}

                                    {item.backdrop_path && (
                                      <button
                                        type="button"
                                        onClick={() => openExternal(item.backdrop_path)}
                                        className="rounded-xl border border-border bg-background/50 p-3 text-left text-sm transition hover:border-primary/40"
                                      >
                                        <span className="flex items-center gap-2 font-medium">
                                          <ImageIcon className="h-4 w-4 text-primary" />
                                          URL da imagem hero
                                        </span>
                                        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.backdrop_path}</span>
                                      </button>
                                    )}

                                    {item.trailer_url && (
                                      <button
                                        type="button"
                                        onClick={() => openExternal(trailerAction.externalUrl || item.trailer_url)}
                                        className="rounded-xl border border-border bg-background/50 p-3 text-left text-sm transition hover:border-primary/40"
                                      >
                                        <span className="flex items-center gap-2 font-medium">
                                          <ExternalLink className="h-4 w-4 text-primary" />
                                          URL do trailer
                                        </span>
                                        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.trailer_url}</span>
                                      </button>
                                    )}
                                  </div>

                                  {item.overview ? (
                                    <div className="rounded-xl border border-border bg-background/50 p-3">
                                      <p className="mb-1 flex items-center gap-2 text-sm font-medium">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Sinopse aprovada
                                      </p>
                                      <p className="text-sm leading-relaxed text-muted-foreground">{item.overview}</p>
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                                      Sem sinopse. Clica em “Editar tudo” para adicionar.
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Título aprovado</label>
                                    <input
                                      value={editingCatalogForm.title}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, title: event.target.value }))}
                                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                      maxLength={140}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Tipo</label>
                                    <select
                                      value={editingCatalogForm.media_type}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, media_type: event.target.value as 'movie' | 'tv' }))}
                                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                    >
                                      <option value="movie">Filme</option>
                                      <option value="tv">Série</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Ano ou data</label>
                                    <input
                                      value={editingCatalogForm.release_date}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, release_date: event.target.value }))}
                                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                      placeholder="2026 ou 2026-05-21"
                                      maxLength={20}
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">URL da imagem/poster</label>
                                    <input
                                      value={editingCatalogForm.poster_path}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, poster_path: event.target.value }))}
                                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                      placeholder="https://..."
                                      maxLength={500}
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">URL da imagem hero/backdrop</label>
                                    <input
                                      value={editingCatalogForm.backdrop_path}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, backdrop_path: event.target.value }))}
                                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                      placeholder="https://... imagem larga para o topo/detalhes"
                                      maxLength={500}
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">URL do trailer YouTube</label>
                                    <input
                                      value={editingCatalogForm.trailer_url}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, trailer_url: event.target.value }))}
                                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      maxLength={500}
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Sinopse</label>
                                    <textarea
                                      value={editingCatalogForm.overview}
                                      onChange={(event) => setEditingCatalogForm((current) => ({ ...current, overview: event.target.value }))}
                                      className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                      placeholder="Sinopse que aparece nos detalhes..."
                                      maxLength={1000}
                                    />
                                  </div>
                                  <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                    <Button variant="ghost" onClick={cancelEditCatalogItem} disabled={savingCatalog}>
                                      <X className="h-4 w-4 mr-2" />
                                      Cancelar
                                    </Button>
                                    <Button variant="gold" onClick={() => saveCatalogItemEdit(item)} disabled={savingCatalog}>
                                      <Save className="h-4 w-4 mr-2" />
                                      Guardar aprovado
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : loadingRequests ? (
                  <div className="rounded-2xl border border-border bg-secondary/30 p-8 text-center text-muted-foreground">
                    A carregar sugestões...
                  </div>
                ) : visibleMovieRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                    Não há sugestões para este filtro ou pesquisa.
                  </div>
                ) : (
                  visibleMovieRequests.map((request) => {
                    const trailerAction = getTrailerAction(request.trailer_url, request.title);
                    const isEditingRequest = editingRequestId === request.id;

                    return (
                      <div
                        key={request.id}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
                      >
                        <div className="grid gap-4 p-4 xl:grid-cols-[132px_1fr]">
                          <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-secondary/40">
                            {request.poster_url ? (
                              <img
                                src={request.poster_url}
                                alt={`Poster de ${request.title}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 space-y-4">
                            {!isEditingRequest ? (
                              <>
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">{requestMediaLabels[request.media_type]}</Badge>
                                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${requestStatusClass[request.status]}`}>
                                        {requestStatusLabels[request.status]}
                                      </span>
                                      {request.poster_url && (
                                        <Badge variant="secondary" className="gap-1">
                                          <ImageIcon className="h-3.5 w-3.5" />
                                          Poster
                                        </Badge>
                                      )}
                                      {request.trailer_url && (
                                        <Badge variant="secondary" className="gap-1">
                                          <PlayCircle className="h-3.5 w-3.5" />
                                          Trailer
                                        </Badge>
                                      )}
                                      {request.synopsis && (
                                        <Badge variant="secondary" className="gap-1">
                                          <FileText className="h-3.5 w-3.5" />
                                          Sinopse
                                        </Badge>
                                      )}
                                    </div>
                                    <h3 className="truncate text-xl font-semibold">{request.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Pedido por {request.username || 'utilizador'} · {new Date(request.created_at).toLocaleString('pt-PT')}
                                    </p>
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[560px]">
                                    <select
                                      value={request.status}
                                      onChange={(event) => updateRequest(request.id, event.target.value as RequestStatus)}
                                      disabled={savingRequestId === request.id}
                                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground sm:col-span-2"
                                      aria-label="Alterar estado da sugestão"
                                    >
                                      <option value="pending">Por aprovar</option>
                                      <option value="in_progress">Em revisão</option>
                                      <option value="completed">Aprovado</option>
                                      <option value="cancelled">Não aprovado</option>
                                    </select>
                                    <Button variant="outline" onClick={() => startEditRequest(request)} disabled={savingRequestId === request.id}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar dados
                                    </Button>
                                    <Button variant="outline" onClick={() => submitCatalogItem(undefined, request)} disabled={savingCatalog || request.media_type === 'other'}>
                                      <PackagePlus className="h-4 w-4 mr-2" />
                                      Aprovar catálogo
                                    </Button>
                                    <Button variant="destructive" onClick={() => removeRequest(request.id)} disabled={savingRequestId === request.id} className="sm:col-span-2">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Apagar sugestão
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-3">
                                  {request.poster_url && (
                                    <button
                                      type="button"
                                      onClick={() => openExternal(request.poster_url)}
                                      className="rounded-xl border border-border bg-background/50 p-3 text-left text-sm transition hover:border-primary/40"
                                    >
                                      <span className="flex items-center gap-2 font-medium">
                                        <ImageIcon className="h-4 w-4 text-primary" />
                                        Imagem/poster
                                      </span>
                                      <span className="mt-1 block truncate text-xs text-muted-foreground">{request.poster_url}</span>
                                    </button>
                                  )}

                                  {request.trailer_url && (
                                    <button
                                      type="button"
                                      onClick={() => openExternal(trailerAction.externalUrl || request.trailer_url)}
                                      className="rounded-xl border border-border bg-background/50 p-3 text-left text-sm transition hover:border-primary/40"
                                    >
                                      <span className="flex items-center gap-2 font-medium">
                                        <ExternalLink className="h-4 w-4 text-primary" />
                                        Trailer
                                      </span>
                                      <span className="mt-1 block truncate text-xs text-muted-foreground">{request.trailer_url}</span>
                                    </button>
                                  )}

                                  {!request.poster_url && !request.trailer_url && !request.synopsis && (
                                    <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                                      Esta sugestão veio sem imagem, trailer ou sinopse.
                                    </div>
                                  )}
                                </div>

                                {request.synopsis && (
                                  <div className="rounded-xl border border-border bg-background/50 p-3">
                                    <p className="mb-1 flex items-center gap-2 text-sm font-medium">
                                      <FileText className="h-4 w-4 text-primary" />
                                      Sinopse enviada
                                    </p>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{request.synopsis}</p>
                                  </div>
                                )}

                                {request.note && (
                                  <p className="rounded-xl bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">{request.note}</p>
                                )}

                                <div className="rounded-xl border border-border bg-background/50 p-3">
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Nota/resposta do admin</label>
                                  <div className="flex flex-col gap-2 md:flex-row">
                                    <input
                                      value={adminNotes[request.id] || ''}
                                      onChange={(event) => setAdminNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                                      className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                      placeholder="Ex: Já está a ser adicionado ao catálogo..."
                                      maxLength={500}
                                    />
                                    <Button variant="outline" onClick={() => updateRequest(request.id, request.status)} disabled={savingRequestId === request.id}>
                                      <Save className="h-4 w-4 mr-2" />
                                      Guardar
                                    </Button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Título da sugestão</label>
                                  <input
                                    value={editingRequestForm.title}
                                    onChange={(event) => setEditingRequestForm((current) => ({ ...current, title: event.target.value }))}
                                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                    maxLength={120}
                                  />
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Tipo</label>
                                  <select
                                    value={editingRequestForm.media_type}
                                    onChange={(event) => setEditingRequestForm((current) => ({ ...current, media_type: event.target.value as 'movie' | 'tv' | 'other' }))}
                                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                  >
                                    <option value="movie">Filme</option>
                                    <option value="tv">Série</option>
                                    <option value="other">Outro</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Estado atual</label>
                                  <div className={`flex h-10 items-center rounded-lg border px-3 text-sm ${requestStatusClass[request.status]}`}>
                                    {requestStatusLabels[request.status]}
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">URL da imagem/poster</label>
                                  <input
                                    value={editingRequestForm.poster_url}
                                    onChange={(event) => setEditingRequestForm((current) => ({ ...current, poster_url: event.target.value }))}
                                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                    placeholder="https://..."
                                    maxLength={500}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">URL do trailer YouTube</label>
                                  <input
                                    value={editingRequestForm.trailer_url}
                                    onChange={(event) => setEditingRequestForm((current) => ({ ...current, trailer_url: event.target.value }))}
                                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    maxLength={500}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Sinopse</label>
                                  <textarea
                                    value={editingRequestForm.synopsis}
                                    onChange={(event) => setEditingRequestForm((current) => ({ ...current, synopsis: event.target.value }))}
                                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                    placeholder="Sinopse enviada ou corrigida pelo admin..."
                                    maxLength={1200}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Observações do pedido</label>
                                  <textarea
                                    value={editingRequestForm.note}
                                    onChange={(event) => setEditingRequestForm((current) => ({ ...current, note: event.target.value }))}
                                    className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                    placeholder="Observações adicionais..."
                                    maxLength={500}
                                  />
                                </div>
                                <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                  <Button variant="ghost" onClick={cancelEditRequest} disabled={savingRequestId === request.id}>
                                    <X className="h-4 w-4 mr-2" />
                                    Cancelar
                                  </Button>
                                  <Button variant="gold" onClick={() => saveRequestDetails(request)} disabled={savingRequestId === request.id}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar dados
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Adicionar/editar filmes aprovados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={submitCatalogItem} className="grid gap-4 rounded-2xl border border-border bg-background/40 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Título</label>
                  <input
                    value={catalogForm.title}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, title: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    placeholder="Ex: Dune, The Bear, Shōgun..."
                    maxLength={140}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Tipo</label>
                  <select
                    value={catalogForm.media_type}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, media_type: event.target.value as 'movie' | 'tv' }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="movie">Filme</option>
                    <option value="tv">Série</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Ano ou data</label>
                  <input
                    value={catalogForm.release_date}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, release_date: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    placeholder="2026 ou 2026-05-21"
                    maxLength={20}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">URL do poster opcional</label>
                  <input
                    value={catalogForm.poster_path}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, poster_path: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    placeholder="https://... ou deixa vazio"
                    maxLength={500}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">URL da imagem hero/backdrop opcional</label>
                  <input
                    value={catalogForm.backdrop_path}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, backdrop_path: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    placeholder="https://... imagem larga para o topo/detalhes"
                    maxLength={500}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">URL do trailer YouTube opcional</label>
                  <input
                    value={catalogForm.trailer_url}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, trailer_url: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    placeholder="https://www.youtube.com/watch?v=..."
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aceita links YouTube normais, youtu.be, embed, shorts ou live.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Sinopse opcional</label>
                  <textarea
                    value={catalogForm.overview}
                    onChange={(event) => setCatalogForm((current) => ({ ...current, overview: event.target.value }))}
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Pequena descrição para aparecer nos detalhes..."
                    maxLength={1000}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" variant="gold" disabled={savingCatalog}>
                    <PackagePlus className="h-4 w-4 mr-2" />
                    {savingCatalog ? 'A adicionar...' : 'Adicionar ao catálogo'}
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Filmes e séries aprovados pelo admin</h3>
                  <Badge variant="secondary">{catalogItems.length}</Badge>
                </div>

                {loadingCatalog ? (
                  <div className="text-muted-foreground">A preparar o catálogo extra…</div>
                ) : catalogItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                    O catálogo está em branco. Adiciona o primeiro filme e dá vida a isto.
                  </div>
                ) : (
                  catalogItems.map((item) => {
                    const itemId = Number(item.id || item.movie_id);
                    const isEditing = editingCatalogId === itemId;
                    return (
                      <div key={`${item.media_type}-${item.id}`} className="rounded-xl border bg-card p-4 space-y-4">
                        {!isEditing ? (
                          <>
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{item.media_type === 'tv' ? 'Série' : 'Filme'}</Badge>
                                  <Badge variant="secondary">Extra</Badge>
                                  {item.trailer_url && (
                                    <Badge variant="secondary" className="gap-1">
                                      <PlayCircle className="h-3 w-3" />
                                      Trailer
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold">{item.title || item.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.release_date || item.first_air_date || 'Sem data'}</p>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button variant="outline" onClick={() => startEditCatalogItem(item)} disabled={savingCatalog || deletingCatalogId === itemId}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </Button>
                                <Button variant="destructive" onClick={() => removeCatalogItem(item)} disabled={savingCatalog || deletingCatalogId === itemId}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar
                                </Button>
                              </div>
                            </div>
                            {item.trailer_url && (
                              <p className="rounded-lg border border-border/60 bg-secondary/25 p-3 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Trailer:</span> {item.trailer_url}
                              </p>
                            )}
                            {item.overview && <p className="rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">{item.overview}</p>}
                          </>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">Título</label>
                              <input
                                value={editingCatalogForm.title}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, title: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                maxLength={140}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">Tipo</label>
                              <select
                                value={editingCatalogForm.media_type}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, media_type: event.target.value as 'movie' | 'tv' }))}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                              >
                                <option value="movie">Filme</option>
                                <option value="tv">Série</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">Ano ou data</label>
                              <input
                                value={editingCatalogForm.release_date}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, release_date: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                maxLength={20}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">URL do poster</label>
                              <input
                                value={editingCatalogForm.poster_path}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, poster_path: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                maxLength={500}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">URL da imagem hero/backdrop</label>
                              <input
                                value={editingCatalogForm.backdrop_path}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, backdrop_path: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                placeholder="https://... imagem larga para o topo/detalhes"
                                maxLength={500}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">URL do trailer YouTube</label>
                              <input
                                value={editingCatalogForm.trailer_url}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, trailer_url: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                placeholder="https://www.youtube.com/watch?v=..."
                                maxLength={500}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-muted-foreground">Sinopse</label>
                              <textarea
                                value={editingCatalogForm.overview}
                                onChange={(event) => setEditingCatalogForm((current) => ({ ...current, overview: event.target.value }))}
                                className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                maxLength={1000}
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                              <Button variant="ghost" onClick={cancelEditCatalogItem} disabled={savingCatalog}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                              <Button variant="gold" onClick={() => saveCatalogItemEdit(item)} disabled={savingCatalog}>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar alterações
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default Admin;
