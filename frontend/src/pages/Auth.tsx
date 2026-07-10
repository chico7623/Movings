/**
 * Página de autenticação do Movings.
 *
 * Faz validações de UX no frontend, mas a segurança real também é repetida
 * no backend PHP. Isto é importante porque qualquer validação apenas no browser
 * pode ser contornada por chamadas diretas à API.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Film, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { postData, setCsrfToken } from '@/services/apiHelper';
import { getErrorMessage } from '@/lib/errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_REQUIREMENTS = [
  'mínimo 8 caracteres',
  '1 letra maiúscula',
  '1 letra minúscula',
  '1 número',
];

function getPasswordIssues(password: string) {
  const issues: string[] = [];

  if (password.length < 8) issues.push('mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) issues.push('1 letra maiúscula');
  if (!/[a-z]/.test(password)) issues.push('1 letra minúscula');
  if (!/\d/.test(password)) issues.push('1 número');

  return issues;
}

type AuthResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  token?: string;
  csrf_token?: string;
  available?: boolean;
  user?: {
    id: string;
    email?: string | null;
    username?: string | null;
    role?: string;
    blocked?: boolean;
  };
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'Fraca' | 'Média' | 'Forte' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateUser } = useAuth();

  useEffect(() => {
    // Update mode when URL changes
    setIsLogin(searchParams.get('mode') !== 'signup');
  }, [searchParams]);

  useEffect(() => {
    const u = username.trim();
    if (!u || isLogin) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    setUsernameAvailable(null);
    setUsernameChecking(true);

    const handle = setTimeout(async () => {
      try {
        const result = await postData<AuthResponse>('auth.php', { action: 'check_username', username: u });
        setUsernameAvailable(typeof result?.available === 'boolean' ? result.available : false);
      } catch {
        setUsernameAvailable(false);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [username, isLogin]);

  useEffect(() => {
    const pwd = password;
    if (!pwd) {
      setPasswordStrength(null);
      return;
    }
    const issues = getPasswordIssues(pwd);
    if (issues.length === 0) setPasswordStrength('Forte');
    else if (issues.length <= 1) setPasswordStrength('Média');
    else setPasswordStrength('Fraca');
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: 'Erro',
        description: isLogin ? 'Falta preencher o username/email e a password.' : 'Falta preencher o username e a password.',
        variant: 'destructive',
      });
      return;
    }

    if (!isLogin && !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      toast({
        title: 'Email obrigatório',
        description: 'Para poderes recuperar a password depois, a conta tem de ter um email válido.',
        variant: 'destructive',
      });
      return;
    }

    if (!isLogin) {
      const passwordIssues = getPasswordIssues(password);
      if (passwordIssues.length > 0) {
        toast({
          title: 'Password fraca',
          description: `Falta: ${passwordIssues.join(', ')}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        localStorage.removeItem('movings_user');
        setCsrfToken(null);
      }
      const identifier = username.trim();

      const result = await postData<AuthResponse>('auth.php', {
        action: isLogin ? 'login' : 'signup',
        identifier: isLogin ? identifier : undefined,
        username: isLogin ? identifier : username.trim(),
        email: isLogin ? null : email.trim().toLowerCase(),
        password
      });

      if (!result || !result.ok) {
        const errorCode = result?.error || '';
        let msg = result?.message || 'Ocorreu um erro ao comunicar com o backend Movings no Railway.';

        if (errorCode === 'username_taken') msg = 'Este username já está ocupado.';
        else if (errorCode === 'email_taken') msg = 'Esse email já está a ser usado.';
        else if (errorCode === 'invalid_credentials') msg = 'Username/email ou password errados. Confirma se estás em Entrar e não em Criar conta.';
        else if (errorCode === 'missing_fields') msg = isLogin ? 'Preenche username/email e password.' : 'Preenche username, email e password.';
        else if (errorCode === 'username_too_short') msg = 'O username tem de ter pelo menos 3 caracteres.';
        else if (errorCode === 'password_too_short' || errorCode === 'weak_password') msg = result?.message || 'A password tem de ter pelo menos 8 caracteres, 1 maiúscula, 1 minúscula e 1 número.';
        else if (errorCode === 'invalid_email') msg = 'Indica um email válido para poderes recuperar a password.';
        else if (errorCode === 'connection_failed') msg = 'Erro de ligação ao backend Movings. Confirma se o serviço PHP/API está online no Railway.';
        else if (errorCode === 'server_error') msg = `Erro no PHP/base de dados: ${result?.message || 'sem detalhes'}`;
        else if (errorCode.startsWith('http_')) msg = `Backend respondeu com erro ${errorCode.replace('http_', '')}. Confirma o proxy /api/php e os logs do serviço PHP.`;

        throw new Error(msg);
      }

      if (!result.user || !result.token || !result.csrf_token) {
        throw new Error('A resposta do backend não trouxe a sessão completa.');
      }

      const userData = {
        ...result.user,
        token: result.token,
        csrf_token: result.csrf_token
      };

      setCsrfToken(result.csrf_token);
      updateUser(userData);

      toast({
        title: isLogin ? 'Bem-vindo de volta!' : 'Conta criada!',
        description: isLogin ? 'Bem-vindo de volta.' : 'Conta criada. Bem-vindo ao Movings.'
      });
      navigate('/', { replace: true });

    } catch (error: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl animate-scale-in">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-warning flex items-center justify-center shadow-lg">
              <Film className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Movings</h1>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground text-center mb-2">
            {isLogin ? 'Bem-vindo de volta' : 'Cria a tua conta'}
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            {isLogin
              ? 'Entra na tua conta para continuar'
              : 'Junta-te à comunidade Movings'}
          </p>

          {isLogin && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Admin seguro</p>
              <p>Entra pelo formulário normal com o username <span className="font-mono text-foreground">admin</span>.</p>
              <p className="mt-1 text-xs">A password do admin é configurada apenas no Railway, em <span className="font-mono text-foreground">MOVINGS_DEMO_ADMIN_PASSWORD</span>.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                {isLogin ? 'Username ou email' : 'Username'}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={isLogin ? 'O teu username ou email' : 'Escolhe o teu username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-primary/50"
                disabled={isLoading}
              />
              {!isLogin && username && (
                <p className={`text-xs ${usernameAvailable ? 'text-primary' : usernameAvailable === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {usernameChecking ? 'A verificar disponibilidade...' : usernameAvailable ? 'Disponível' : 'Não foi possível verificar, mas podes tentar criar conta'}
                </p>
              )}
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email obrigatório
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="O teu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                A tua password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="A tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary/50"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {!isLogin && passwordStrength && (
                <div className="space-y-1">
                  <p className={`text-xs ${passwordStrength === 'Forte' ? 'text-primary' : passwordStrength === 'Média' ? 'text-warning' : 'text-destructive'}`}>
                    Força da password: {passwordStrength}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deve ter {PASSWORD_REQUIREMENTS.join(', ')}.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading
                ? 'Só um momento…'
                : isLogin
                  ? 'Entrar na minha conta'
                  : 'Criar a minha conta'}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password', { state: { email: username.includes('@') ? username.trim() : email.trim() } })}
                className="text-sm text-primary hover:underline font-medium"
              >
                Esqueceste-te da password?
              </button>
            </div>
          )}

          {/* Toggle */}
          <p className="text-center text-muted-foreground mt-6">
            {isLogin ? 'Ainda não tens conta?' : 'Já tens uma conta?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Criar a minha conta' : 'Entrar na minha conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
