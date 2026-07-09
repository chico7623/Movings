/**
 * Password reset form opened from the email recovery link.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Film, Lock, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { postData } from '@/services/apiHelper';
import { MovingsTheme, useTheme } from '@/hooks/useTheme';

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
};

type PasswordStrength = 'Fraca' | 'Média' | 'Forte' | null;
const themeOptions: MovingsTheme[] = ['dark', 'light', 'burgundy', 'evergreen', 'periwinkle'];

const getPasswordStrength = (pwd: string): PasswordStrength => {
  if (!pwd) return null;
  const lengthScore = pwd.length >= 8 ? 1 : 0;
  const hasUpper = /[A-Z]/.test(pwd) ? 1 : 0;
  const hasLower = /[a-z]/.test(pwd) ? 1 : 0;
  const hasNumber = /\d/.test(pwd) ? 1 : 0;
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd) ? 1 : 0;
  const score = lengthScore + hasUpper + hasLower + hasNumber + hasSymbol;
  if (score >= 4) return 'Forte';
  if (score >= 3) return 'Média';
  return 'Fraca';
};

const strengthMeta = {
  Fraca: { width: 'w-1/3', color: 'bg-destructive', text: 'text-destructive' },
  Média: { width: 'w-2/3', color: 'bg-warning', text: 'text-warning' },
  Forte: { width: 'w-full', color: 'bg-primary', text: 'text-primary' },
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme, themeLabels } = useTheme();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (!success) return;
    if (redirectCountdown <= 0) {
      navigate('/auth', { replace: true });
      return;
    }
    const timer = window.setTimeout(() => setRedirectCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [success, redirectCountdown, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSuccess(false);
    setTokenError('');
    setRedirectCountdown(3);

    if (!token) {
      setTokenError('Este link não tem token. Pede uma nova recuperação de palavra-passe.');
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A nova password deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As passwords não batem certo.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await postData('auth.php', {
        action: 'reset_password',
        token,
        password,
      });

      if (!result || !result.ok) {
        const msg = result?.message || 'Link inválido ou expirado.';
        if (result?.error === 'invalid_or_expired_token') {
          setTokenError(msg);
          return;
        }
        throw new Error(msg);
      }

      setSuccess(true);
      setMessage(result.message || 'Password atualizada. Já podes entrar.');
      setPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      setSuccess(false);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const meta = passwordStrength ? strengthMeta[passwordStrength] : null;
  const shouldShowTokenError = Boolean(tokenError || !token);

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

          <h2 className="text-xl font-semibold text-foreground text-center mb-2">
            Criar uma nova chave de entrada
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Escolhe uma nova palavra-passe. O Movings mantém o tema {themeLabels[theme]} enquanto recuperas o acesso.
          </p>

          {shouldShowTokenError ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/25 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {tokenError || 'Este link não tem token. Pede uma nova recuperação e voltamos a abrir-te a porta.'}
              </div>
              <Button asChild variant="gold" className="w-full">
                <Link to="/forgot-password">Pedir novo link</Link>
              </Button>
            </div>
          ) : success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
                {message}
              </div>
              <p className="text-sm text-muted-foreground">
                Serás redirecionado em <span className="text-foreground font-semibold">{redirectCountdown}</span>...
              </p>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/auth">Ir já para login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Nova password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nova palavra-passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordStrength && meta && (
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full ${meta.width} ${meta.color} transition-all`} />
                    </div>
                    <p className={`text-xs ${meta.text}`}>Força da password: {passwordStrength}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Repete a password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirma a nova palavra-passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? 'Esconder confirmação' : 'Mostrar confirmação'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="gold" className="w-full" disabled={isLoading || !token}>
                {isLoading ? 'A guardar a nova palavra-passe…' : 'Guardar e voltar ao Movings'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
