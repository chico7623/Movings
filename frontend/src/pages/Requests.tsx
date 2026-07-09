/**
 * User requests/suggestions page for new movies or series.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  PackagePlus,
  PlayCircle,
  Search,
  Send,
  Sparkles,
  Tv,
  XCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  createMovieRequest,
  listMovieRequests,
  MovieRequest,
  RequestMediaType,
  RequestStatus,
  requestMediaLabels,
  requestStatusLabels,
} from '@/services/requests';
import { getTrailerAction } from '@/lib/trailers';

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
};

const statusIcon: Record<RequestStatus, JSX.Element> = {
  pending: <Clock className="h-4 w-4" />,
  in_progress: <Loader2 className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

const statusClasses: Record<RequestStatus, string> = {
  pending: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
  in_progress: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  cancelled: 'border-red-400/30 bg-red-400/10 text-red-200',
};

const isOptionalHttpUrl = (value: string) => {
  const clean = value.trim();
  if (!clean) return true;

  try {
    const url = new URL(clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const openExternal = (url?: string | null) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const Requests = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [requests, setRequests] = useState<MovieRequest[]>([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<RequestMediaType>('movie');
  const [posterUrl, setPosterUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listMovieRequests('all', false);
      setRequests(data.requests);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não conseguimos carregar as tuas sugestões agora. Tenta novamente dentro de instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return requests;

    return requests.filter((request) => {
      const haystack = [
        request.title,
        request.note,
        request.synopsis,
        request.poster_url,
        request.trailer_url,
        request.admin_note,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [requests, search]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    const cleanTitle = title.trim();
    const cleanPosterUrl = posterUrl.trim();
    const cleanTrailerUrl = trailerUrl.trim();
    const cleanSynopsis = synopsis.trim();
    const cleanNote = note.trim();

    if (cleanTitle.length < 2) {
      toast({
        title: 'Título demasiado curto',
        description: 'Escreve pelo menos 2 caracteres para sabermos exatamente que título queres pedir.',
        variant: 'destructive',
      });
      return;
    }

    if (!isOptionalHttpUrl(cleanPosterUrl)) {
      toast({
        title: 'URL da imagem inválido',
        description: 'Usa um link completo começado por https:// ou deixa o campo vazio.',
        variant: 'destructive',
      });
      return;
    }

    if (!isOptionalHttpUrl(cleanTrailerUrl)) {
      toast({
        title: 'URL do trailer inválido',
        description: 'Usa um link de YouTube válido ou deixa o campo vazio.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await createMovieRequest({
        title: cleanTitle,
        media_type: mediaType,
        poster_url: cleanPosterUrl,
        trailer_url: cleanTrailerUrl,
        synopsis: cleanSynopsis,
        note: cleanNote,
      });

      if (!result?.ok) throw new Error(result?.message || result?.error || 'Erro desconhecido');

      setTitle('');
      setPosterUrl('');
      setTrailerUrl('');
      setSynopsis('');
      setNote('');
      setMediaType('movie');
      toast({
        title: 'Sugestão enviada.',
        description: 'O pedido ficou guardado com os detalhes para o admin adicionar mais depressa.',
      });
      await loadRequests();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error, 'Não conseguimos enviar a sugestão agora. Tenta novamente dentro de instantes.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 md:px-6 pt-28 pb-12">
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card/70 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <PackagePlus className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold">Sugestões</h1>
            <p className="mt-3 text-muted-foreground">
              Entra na conta para sugerires filmes e séries para o catálogo Movings.
            </p>
            <Button variant="gold" className="mt-6" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 md:px-6 pt-28 pb-12">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-6 md:p-8 shadow-2xl">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              Área pessoal
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Sugere filmes e séries</h1>
            <p className="mt-3 text-muted-foreground">
              Envia o título, poster, trailer e sinopse para o admin conseguir transformar a sugestão numa entrada completa do catálogo.
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[460px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-primary" />
                Nova sugestão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Título</label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex: Dune: Parte Dois, The Bear..."
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Tipo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['movie', 'tv', 'other'] as RequestMediaType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMediaType(type)}
                        className={`rounded-xl border px-3 py-3 text-sm transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                          mediaType === type
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {type === 'movie' && <Film className="mx-auto mb-1 h-4 w-4" />}
                        {type === 'tv' && <Tv className="mx-auto mb-1 h-4 w-4" />}
                        {type === 'other' && <PackagePlus className="mx-auto mb-1 h-4 w-4" />}
                        {requestMediaLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    URL da imagem/poster
                  </label>
                  <Input
                    value={posterUrl}
                    onChange={(event) => setPosterUrl(event.target.value)}
                    placeholder="https://image.tmdb.org/... ou https://..."
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <PlayCircle className="h-4 w-4" />
                    URL do trailer
                  </label>
                  <Input
                    value={trailerUrl}
                    onChange={(event) => setTrailerUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Sinopse
                  </label>
                  <Textarea
                    value={synopsis}
                    onChange={(event) => setSynopsis(event.target.value)}
                    placeholder="Resumo curto para aparecer na página de detalhes."
                    maxLength={1200}
                    rows={5}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Observações para o admin</label>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ex: ano, plataforma, dobragem, versão certa ou razão para entrar no catálogo."
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <Button type="submit" variant="gold" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar sugestão completa
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <h2 className="text-xl font-semibold">As minhas sugestões</h2>
                <p className="text-sm text-muted-foreground">
                  Histórico pessoal dos pedidos enviados por ti.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar nas minhas sugestões"
                  className="h-full pl-9"
                />
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="grid gap-3 p-4 text-sm text-muted-foreground md:grid-cols-3">
                <p>• Quanto mais dados enviares, mais rápido o admin adiciona.</p>
                <p>• O trailer deve ser do YouTube para abrir embutido no site.</p>
                <p>• A gestão de estados continua reservada ao painel admin.</p>
              </CardContent>
            </Card>

            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                A carregar as tuas sugestões…
              </div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                icon={<PackagePlus className="h-8 w-8" />}
                title={requests.length === 0 ? 'Ainda não enviaste sugestões.' : 'Nenhuma sugestão encontrada.'}
                body={requests.length === 0 ? 'Quando enviares o primeiro pedido, ele aparece aqui.' : 'A pesquisa não encontrou nenhum pedido teu com esse texto.'}
                className="bg-card/45 p-8"
              />
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request) => {
                  const trailerAction = getTrailerAction(request.trailer_url, request.title);
                  return (
                    <article
                      key={request.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
                    >
                      <div className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
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
                              <ImageIcon className="h-7 w-7" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{requestMediaLabels[request.media_type]}</Badge>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses[request.status]}`}>
                              {statusIcon[request.status]}
                              {requestStatusLabels[request.status]}
                            </span>
                            {request.trailer_url && (
                              <Badge variant="secondary" className="gap-1">
                                <PlayCircle className="h-3.5 w-3.5" />
                                Trailer
                              </Badge>
                            )}
                          </div>

                          <h2 className="truncate text-lg font-semibold">{request.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            Enviado em {new Date(request.created_at).toLocaleString('pt-PT')}
                          </p>

                          {request.synopsis && (
                            <p className="mt-3 line-clamp-4 rounded-xl bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">
                              {request.synopsis}
                            </p>
                          )}

                          {request.note && (
                            <p className="mt-3 rounded-xl border border-border bg-background/50 p-3 text-sm text-muted-foreground">
                              {request.note}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {request.poster_url && (
                              <Button size="sm" variant="outline" onClick={() => openExternal(request.poster_url)}>
                                <ImageIcon className="h-4 w-4" />
                                Imagem
                              </Button>
                            )}
                            {trailerAction.externalUrl && request.trailer_url && (
                              <Button size="sm" variant="outline" onClick={() => openExternal(trailerAction.externalUrl)}>
                                <ExternalLink className="h-4 w-4" />
                                Trailer
                              </Button>
                            )}
                          </div>

                          {request.admin_note && (
                            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm">
                              <p className="font-semibold text-primary">Resposta do admin</p>
                              <p className="text-muted-foreground">{request.admin_note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Requests;
