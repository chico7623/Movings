/**
 * Shared footer used across the application.
 */
import { Link } from 'react-router-dom';
import { BookmarkPlus, HeartHandshake, MessageCircle, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';
import movingsLogo from '../assets/movings-logo.png';

const usefulLinks = [
  { to: '/sobre', label: 'Sobre', icon: HeartHandshake },
  { to: '/sugestoes', label: 'Sugestões', icon: MessageCircle },
  { to: '/watchlist', label: 'Watchlist', icon: BookmarkPlus },
  { to: '/quiz', label: 'Quiz', icon: Sparkles },
];

const Footer = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const isAdmin = user?.role === 'admin';

  return (
    <footer className="border-t border-border/60 bg-background/95 text-foreground">
      <div className="container mx-auto px-4 py-10 md:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div>
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Ir para a página inicial">
              {theme === 'dark' ? (
                <img
                  src={movingsLogo}
                  alt="Movings"
                  className="h-12 w-auto max-w-[170px] object-contain"
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
            </Link>

            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Uma sala digital para descobrir, guardar, avaliar e conversar sobre cinema com identidade própria.
            </p>

            <p className="mt-4 max-w-xl rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
              {copy.heroSubtitle}
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Links úteis
            </h2>
            <nav className="grid gap-2 text-sm">
              {usefulLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="inline-flex w-fit items-center gap-2 rounded-full px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex w-fit items-center gap-2 rounded-full px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Shield className="h-4 w-4 text-primary" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
