/**
 * Password recovery request screen. Sends reset requests without exposing SMTP details.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink, Film, Mail, MailCheck, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { postData } from '@/services/apiHelper';
import { MovingsTheme, useTheme } from '@/hooks/useTheme';

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const themeOptions: MovingsTheme[] = ['dark', 'light', 'burgundy', 'evergreen', 'periwinkle'];

type ResetDelivery = {
  ok?: boolean;
  method?: string;
  message?: string;
  host?: string;
  port?: number;
  secure?: string;
  outbox_url?: string;
  open_url?: string;
  first_link?: string;
  smtp_failed?: boolean;
  smtp_error?: string;
};

type ForgotPasswordResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  email_sent?: boolean;
  email_processed?: boolean;
  delivery?: ResetDelivery;
  debug_reset_link?: string;
  local_outbox_url?: string;
  local_email_url?: string;
  mail_error?: string;
};


const ForgotPassword = () => {
  const location = useLocation();
  const initialEmail = useMemo(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email || '';
    return EMAIL_REGEX.test(stateEmail.trim()) ? stateEmail.trim() : '';
  }, [location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [debugLink, setDebugLink] = useState('');
  const [localOutboxUrl, setLocalOutboxUrl] = useState('');
  const [localEmailUrl, setLocalEmailUrl] = useState('');
  const [mailError, setMailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme, themeLabels } = useTheme();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendResetEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setMessage('');
    setDebugLink('');
    setLocalOutboxUrl('');
    setLocalEmailUrl('');
    setMailError('');

    if (!cleanEmail) {
      toast({ title: 'Erro', description: 'Escreve o email da tua conta.', variant: 'destructive' });
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast({ title: 'Email inválido', description: 'Escreve um email válido, por exemplo nome@email.com.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await postData<ForgotPasswordResponse>('auth.php', {
        action: 'forgot_password',
        email: cleanEmail,
        frontend_url: window.location.origin,
      });

      const delivery: ResetDelivery = result?.delivery || {};
      const localLink = result?.debug_reset_link || delivery.first_link || '';
      const outboxUrl = result?.local_outbox_url || delivery.outbox_url || '';
      const emailUrl = result?.local_email_url || delivery.open_url || '';
      const smtpError = result?.mail_error || delivery.smtp_error || '';

      if (localLink) setDebugLink(localLink);
      if (outboxUrl) setLocalOutboxUrl(outboxUrl);
      if (emailUrl) setLocalEmailUrl(emailUrl);
      if (smtpError) setMailError(smtpError);

      if (!result || !result.ok) {
        setSubmittedEmail(cleanEmail);
        setSent(true);
        setCooldown(30);
        setMessage(result?.message || 'Não foi possível enviar o pedido de recuperação.');

        toast({
          title: result?.error === 'account_email_not_found' ? 'Conta não encontrada' : 'Envio não concluído',
          description: result?.message || 'Não foi possível enviar o pedido de recuperação.',
          variant: 'destructive',
        });
        return;
      }

      setSubmittedEmail(cleanEmail);
      setSent(true);
      setCooldown(60);
      setMessage(result.message || 'Email de recuperação enviado. Confirma a caixa de entrada e também o spam/promoções.');
    } catch (error: unknown) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendResetEmail();
  };

  const copyLink = async () => {
    if (!debugLink) return;
    await navigator.clipboard.writeText(debugLink);
    toast({ title: 'Copiado', description: 'Link de recuperação copiado.' });
  };

  const debugPath = debugLink ? debugLink.replace(window.location.origin, '') : '';
  const localMode = Boolean(debugLink || localOutboxUrl || mailError);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Button>

          <label className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground shadow-sm">
            <Palette className="h-4 w-4 text-primary" />
            <span className="sr-only">Tema</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as MovingsTheme)}
              className="bg-transparent text-foreground outline-none"
              aria-label="Escolher tema"
            >
              {themeOptions.map((option) => (
                <option key={option} value={option}>{themeLabels[option]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-2xl animate-scale-in">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-warning flex items-center justify-center shadow-lg">
              <Film className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Movings</h1>
            </div>
          </div>

          {!sent ? (
            <>
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                Recuperar palavra-passe
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Escreve o email da tua conta. Enviamos um link seguro e mantemos a tua sala no tema {themeLabels[theme]}.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">O teu email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="gold" className="w-full" disabled={isLoading}>
                  {isLoading ? 'A preparar as instruções…' : 'Enviar link de recuperação'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {localMode ? 'Envio não concluído' : 'Vê a tua caixa de entrada'}
                </h2>
                <p className="text-muted-foreground">
                  {localMode ? (
                    <>Não recebeste o email real. O detalhe do WAMP ficou disponível para <span className="text-foreground font-medium">{submittedEmail}</span>.</>
                  ) : (
                    <>Enviámos instruções para <span className="text-foreground font-medium">{submittedEmail}</span>.</>
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={sendResetEmail}
                disabled={isLoading || cooldown > 0}
              >
                {isLoading ? 'A preparar as instruções…' : cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/auth')}>
                Voltar ao login
              </Button>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          {(debugLink || localOutboxUrl || mailError) && (
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Modo local WAMP</p>
              <p className="text-xs text-muted-foreground">
                O envio real não ficou confirmado. Se aparecer um link abaixo, podes usar no WAMP; se aparecer erro SMTP, corrige a Brevo ou firewall.
              </p>

              {debugLink && (
                <div className="break-all rounded-lg bg-background/70 p-3 text-xs text-foreground border border-border/50">
                  {debugLink}
                </div>
              )}

              {mailError && (
                <div className="rounded-lg bg-background/70 p-3 text-xs text-muted-foreground border border-border/50">
                  <span className="font-semibold text-foreground">Erro SMTP:</span> {mailError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {debugLink && (
                  <Button type="button" variant="secondary" size="sm" onClick={copyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar link
                  </Button>
                )}
                {debugLink && (
                  <Button type="button" variant="gold" size="sm" asChild>
                    <Link to={debugPath}>Abrir reset</Link>
                  </Button>
                )}
                {localOutboxUrl && (
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <a href={localOutboxUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Caixa local
                    </a>
                  </Button>
                )}
                {localEmailUrl && (
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <a href={localEmailUrl} target="_blank" rel="noreferrer">
                      Abrir email local
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {!sent && (
            <p className="text-center text-muted-foreground mt-6">
              Já sabes a password?{' '}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Entrar na minha conta
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
