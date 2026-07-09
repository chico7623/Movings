/**
 * Modal de comentários do Movings.
 *
 * Responsabilidades principais:
 * - listar apenas comentários aprovados;
 * - criar comentários/respostas que ficam pendentes para o admin;
 * - permitir likes/dislikes;
 * - permitir ao dono pedir edição, que volta a moderação;
 * - abrir o Cartão Movings público ao clicar no autor.
 */
import { useCallback, useEffect, useState } from 'react';
import { X, MessageCircle, Send, User, ThumbsUp, ThumbsDown, RefreshCw, Pencil, Check, Award, Star, Heart, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getComments as apiGetComments, addComment as apiAddComment, voteComment as apiVoteComment, upsertUser, getUserVotes, addReply, upsertMovieGenres, updateComment as apiUpdateComment, getPublicUserCard } from '@/services/api';
import SpoilerContent from './SpoilerContent';
import EmptyState from './EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  content: string;
  is_spoiler?: number;
  parent_id?: number | null;
  created_at: string;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
}

interface PublicUserBadge {
  badge_key?: string;
  key?: string;
  name?: string;
  description?: string;
  icon?: string;
  rarity?: string;
  points?: number;
  awarded_at?: string;
}

interface PublicUserCardData {
  user: {
    id: string;
    username: string;
  };
  stats: {
    ratings_total?: number;
    comments_total?: number;
    favorites_total?: number;
    ratings_avg?: number;
    movies_watched?: number;
  };
  favorite_genre_name?: string | null;
  quiz?: {
    result_label?: string | null;
    result_desc?: string | null;
  } | null;
  badges: PublicUserBadge[];
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  movieId: number;
  mediaType?: 'movie' | 'tv';
}

const CommentsModal = ({ isOpen, onClose, movieTitle, movieId, mediaType = 'movie' }: CommentsModalProps) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const navigate = useNavigate();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [publicCard, setPublicCard] = useState<PublicUserCardData | null>(null);
  const [publicCardLoading, setPublicCardLoading] = useState(false);

  const fetchComments = useCallback(async (force = false) => {
    if (editingCommentId && !force) return;
    setLoading(true);
    try {
      const rows = await apiGetComments(movieId, mediaType);
      let userVotesMap: Record<string, 'like' | 'dislike'> = {};
      if (user) {
        const votes = await getUserVotes(user.id, movieId, mediaType);
        userVotesMap = votes.reduce((acc, v) => {
          acc[String(v.comment_id)] = v.vote_type;
          return acc;
        }, {} as Record<string, 'like' | 'dislike'>);
      }
      const formattedComments: Comment[] = rows.map(c => ({
        id: String(c.id),
        user_id: String(c.user_id || ''),
        username: c.username,
        content: c.content,
        is_spoiler: c.is_spoiler,
        parent_id: c.parent_id,
        created_at: c.created_at,
        likes: Number(c.likes || 0),
        dislikes: Number(c.dislikes || 0),
        userVote: userVotesMap[String(c.id)] || null,
      }));
      setComments(formattedComments);
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setLoading(false);
    }
  }, [editingCommentId, mediaType, movieId, user]);

  useEffect(() => {
    if (!isOpen) return;

    fetchComments();
    const timer = window.setInterval(() => {
      fetchComments();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [fetchComments, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.message('Entra na tua conta para comentar.', { description: 'A conversa fica associada ao teu Cartão do Movings.' });
      navigate('/auth');
      return;
    }
    if (!comment.trim()) return;

    try {
      try {
        await upsertUser(user.id, user.email, user.username || user.email?.split('@')[0] || null);
      } catch { }
      let ok = true;
      // ensure movie_genres row exists before adding comments (avoids FK errors)
      try { await upsertMovieGenres(movieId, mediaType, [], movieTitle); } catch { }
      if (replyTo) {
        ok = await addReply(user.id, movieId, mediaType, user.username || user.email?.split('@')[0] || 'Anónimo', comment, replyTo, movieTitle);
      } else {
        ok = await apiAddComment(user.id, movieId, mediaType, user.username || user.email?.split('@')[0] || 'Anónimo', comment, null, false, movieTitle);
      }
      if (!ok) throw new Error('failed');
      setComment('');
      setReplyTo(null);
      fetchComments();
      toast.success(copy.commentSaved, { description: replyTo ? 'A resposta fica à espera de aprovação.' : 'A tua opinião fica à espera de aprovação.' });
    } catch (e) {
      console.error('Error adding comment:', e);
      toast.error(copy.genericError, { description: 'Não conseguimos enviar o comentário agora.' });
    }
  };

  const handleVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    if (!user) {
      toast.message('Entra para reagires aos comentários.');
      navigate('/auth');
      return;
    }

    const currentComment = comments.find(c => c.id === commentId);
    if (!currentComment) return;

    try {
      try {
        await upsertUser(user.id, user.email, user.username || user.email?.split('@')[0] || null);
      } catch { }
      const ok = await apiVoteComment(user.id, commentId, voteType);
      if (!ok) throw new Error('failed');
      fetchComments();
      toast.success(voteType === 'like' ? 'Marcaste como útil.' : 'Reação registada.', { description: 'A conversa ficou um pouco mais tua.' });
    } catch (e) {
      console.error('Error voting:', e);
      toast.error(copy.genericError, { description: 'Não conseguimos registar a tua reação.' });
    }
  };

  const startEditing = (targetComment: Comment) => {
    setReplyTo(null);
    setEditingCommentId(targetComment.id);
    setEditContent(targetComment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const saveEditedComment = async (commentId: string) => {
    if (!user) {
      toast.message('Entra na tua conta para editar comentários.');
      navigate('/auth');
      return;
    }

    const nextContent = editContent.trim();
    if (nextContent.length < 2) {
      toast.error('Comentário demasiado curto.', { description: 'Escreve pelo menos 2 caracteres.' });
      return;
    }

    try {
      const result = await apiUpdateComment(commentId, nextContent);
      if (!result.ok) throw new Error('failed');

      setEditingCommentId(null);
      setEditContent('');
      await fetchComments(true);

      if (result.pendingReview) {
        toast.success('Alteração enviada para aprovação.', {
          description: 'O admin tem de aprovar a nova versão antes de ela aparecer publicamente.',
        });
      } else {
        toast.success('Comentário atualizado.', { description: 'A tua alteração ficou guardada.' });
      }
    } catch (e) {
      console.error('Error editing comment:', e);
      toast.error(copy.genericError, { description: 'Não conseguimos atualizar o comentário agora.' });
    }
  };

  // O Cartão Movings é público, mas apenas mostra estatísticas seguras.
  // Dados sensíveis como email, hash da password e tokens nunca são expostos.
  const openPublicCard = async (targetComment: Comment) => {
    const targetUserId = String(targetComment.user_id || '').trim();
    if (!targetUserId) {
      toast.error('Não foi possível abrir o cartão.', { description: 'Este comentário não tem autor associado.' });
      return;
    }

    setPublicCardLoading(true);
    setPublicCard(null);

    try {
      const card = await getPublicUserCard(targetUserId, targetComment.username);
      if (!card?.user) throw new Error('missing-card');

      setPublicCard({
        user: {
          id: String(card.user.id || targetUserId),
          username: String(card.user.username || targetComment.username || 'Utilizador'),
        },
        stats: {
          ratings_total: Number(card.stats?.ratings_total || 0),
          comments_total: Number(card.stats?.comments_total || 0),
          favorites_total: Number(card.stats?.favorites_total || 0),
          ratings_avg: Number(card.stats?.ratings_avg || 0),
          movies_watched: Number(card.stats?.movies_watched || 0),
        },
        favorite_genre_name: card.favorite_genre_name || null,
        quiz: card.quiz || null,
        badges: Array.isArray(card.badges) ? card.badges : [],
      });
    } catch (error) {
      console.error('Error loading public user card:', error);
      toast.error('Não foi possível abrir o cartão Movings.', { description: 'Tenta novamente dentro de momentos.' });
    } finally {
      setPublicCardLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `Há ${days} dias`;
    return date.toLocaleDateString('pt-PT');
  };

  if (!isOpen) return null;

  const renderItem = (c: Comment, level = 0) => {
    const currentUserId = String(user?.id || '');
    const currentUsername = String(user?.username || '').trim().toLowerCase();
    const commentOwnerId = String(c.user_id || '');
    const commentUsername = String(c.username || '').trim().toLowerCase();
    // Autorização visual: mostra o botão apenas ao dono ou ao admin.
    // A autorização real continua a ser validada no backend em comments.php.
    const canEdit = Boolean(user && (
      currentUserId === commentOwnerId ||
      (currentUsername !== '' && currentUsername === commentUsername) ||
      user.role === 'admin'
    ));
    const isEditing = editingCommentId === c.id;

    return (
      <div key={c.id} className="flex gap-3" style={{ paddingLeft: level * 16 }}>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => openPublicCard(c)}
              className="font-medium text-sm text-foreground transition hover:text-primary hover:underline underline-offset-4"
              title={`Ver cartão Movings de ${c.username}`}
            >
              {c.username}
            </button>
            <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
          </div>

          {isEditing ? (
            <div className="mb-3 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[72px] bg-secondary/50 border-border/50 resize-none text-sm"
                maxLength={2000}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="gold" onClick={() => saveEditedComment(c.id)} className="h-8 gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={cancelEditing} className="h-8">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            c.is_spoiler ? <SpoilerContent content={c.content} /> : <p className="text-sm text-muted-foreground mb-2">{c.content}</p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-3">
              <button onClick={() => handleVote(c.id, 'like')} className={`flex items-center gap-1 text-xs transition hover:-translate-y-0.5 active:scale-95 ${c.userVote === 'like' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{c.likes}</span>
              </button>
              <button onClick={() => handleVote(c.id, 'dislike')} className={`flex items-center gap-1 text-xs transition hover:-translate-y-0.5 active:scale-95 ${c.userVote === 'dislike' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}>
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>{c.dislikes}</span>
              </button>
              <button onClick={() => setReplyTo(c.id)} className="text-xs text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground active:scale-95">Responder</button>
              {canEdit && (
                <button onClick={() => startEditing(c)} className="flex items-center gap-1 text-xs text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground active:scale-95">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>
          )}

          {comments.filter(x => x.parent_id === Number(c.id)).map(r => renderItem(r, level + 1))}
        </div>
      </div>
    );
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />

      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Comentários</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchComments(true)}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
              title="Atualizar comentários"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
          {movieTitle}
        </p>

        {/* Comments List */}
        <div className="overflow-y-auto max-h-[50vh] p-4 space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">A abrir a conversa…</p>
          ) : comments.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-8 w-8" />}
              title={copy.emptyCommentsTitle}
              body={copy.emptyCommentsBody}
              className="border-border/70 bg-background/35 p-6 md:p-6"
            />
          ) : (
            comments.filter(c => !c.parent_id).map((c) => renderItem(c, 0))
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-border">
          {user ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                placeholder="O que te ficou depois dos créditos? Escreve a tua opinião; depois de aprovada, entra na conversa."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[60px] bg-secondary/50 border-border/50 resize-none"
              />
              <Button type="submit" variant="gold" size="icon" className="h-[60px] w-12">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-2">
                Entra na tua conta para comentar.
              </p>
              <Button variant="gold" size="sm" onClick={() => navigate('/auth')}>
                Entrar para comentar
              </Button>
            </div>
          )}
        </div>
      </div>

      {(publicCardLoading || publicCard) && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-none bg-background/85 p-4 backdrop-blur-sm"
          onClick={(event) => {
            event.stopPropagation();
            setPublicCard(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Cartão Movings</p>
                <h3 className="mt-1 text-2xl font-bold text-foreground">
                  {publicCardLoading ? 'A carregar…' : publicCard?.user.username}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {publicCardLoading
                    ? 'A preparar o cartão da comunidade.'
                    : publicCard?.quiz?.result_label || 'Perfil cinematográfico por descobrir'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublicCard(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Fechar cartão Movings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {publicCardLoading ? (
              <div className="space-y-3">
                <div className="h-20 rounded-2xl bg-secondary/60 animate-pulse" />
                <div className="h-24 rounded-2xl bg-secondary/40 animate-pulse" />
              </div>
            ) : publicCard ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/45 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 text-primary" />
                      Avaliações
                    </div>
                    <p className="text-xl font-bold text-foreground">{publicCard.stats.ratings_total || 0}</p>
                    <p className="text-xs text-muted-foreground">média {Number(publicCard.stats.ratings_avg || 0).toFixed(1)}/5</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/45 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      Comentários
                    </div>
                    <p className="text-xl font-bold text-foreground">{publicCard.stats.comments_total || 0}</p>
                    <p className="text-xs text-muted-foreground">aprovados</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/45 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Heart className="h-3.5 w-3.5 text-primary" />
                      Favoritos
                    </div>
                    <p className="text-xl font-bold text-foreground">{publicCard.stats.favorites_total || 0}</p>
                    <p className="text-xs text-muted-foreground">no cartão</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/45 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      Género
                    </div>
                    <p className="truncate text-sm font-semibold text-foreground">{publicCard.favorite_genre_name || 'Por descobrir'}</p>
                    <p className="text-xs text-muted-foreground">preferência</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Badges desbloqueadas</p>
                  </div>

                  {publicCard.badges.length ? (
                    <div className="grid grid-cols-1 gap-2">
                      {publicCard.badges.slice(0, 4).map((badge) => (
                        <div key={badge.badge_key || badge.key || badge.name} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-lg">{badge.icon || '🏆'}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{badge.name || 'Badge Movings'}</p>
                            <p className="truncate text-xs text-muted-foreground">{badge.rarity || 'conquista'} · {badge.points || 0} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ainda não há badges desbloqueadas.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsModal;
