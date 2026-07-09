/**
 * Personality quiz page used to enrich the user card.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RotateCcw, Sparkles, Star } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCopy } from '@/content/copy';
import { saveQuizResult } from '@/services/api';

const questions = [
  {
    q: 'Quando escolhes algo para ver, o que mais valorizas?',
    opts: [
      { k: 'intelectual', t: 'Uma história profunda e cheia de significado' },
      { k: 'acao', t: 'Explosões, perseguições e adrenalina' },
      { k: 'drama', t: 'Emoção intensa e personagens realistas' },
      { k: 'maratonista', t: 'Algo viciante que me prenda vários episódios' },
    ],
  },
  {
    q: 'Qual o teu plano perfeito para uma noite de cinema?',
    opts: [
      { k: 'intelectual', t: 'Ver um filme premiado e analisar cada detalhe' },
      { k: 'acao', t: 'Algo cheio de cenas épicas e ritmo rápido' },
      { k: 'drama', t: 'Um filme que me faça sentir tudo' },
      { k: 'maratonista', t: 'Começar uma série e ver 5 episódios seguidos' },
    ],
  },
  {
    q: 'Que frase descreve melhor o teu gosto?',
    opts: [
      { k: 'intelectual', t: '“Cinema é arte.”' },
      { k: 'acao', t: '“Quanto mais adrenalina, melhor.”' },
      { k: 'drama', t: '“Se não mexe comigo, não vale a pena.”' },
      { k: 'maratonista', t: '“Só mais um episódio.”' },
    ],
  },
  {
    q: 'Qual destes géneros preferes?',
    opts: [
      { k: 'intelectual', t: 'Thriller psicológico / Indie' },
      { k: 'acao', t: 'Ação / Aventura' },
      { k: 'drama', t: 'Drama / Romance' },
      { k: 'maratonista', t: 'Série de mistério / Crime' },
    ],
  },
  {
    q: 'O que faz uma história ser memorável?',
    opts: [
      { k: 'intelectual', t: 'A complexidade do argumento' },
      { k: 'acao', t: 'As cenas intensas e visualmente fortes' },
      { k: 'drama', t: 'A ligação emocional às personagens' },
      { k: 'maratonista', t: 'O suspense que me obriga a continuar' },
    ],
  },
  {
    q: 'Como costumas ver conteúdos?',
    opts: [
      { k: 'intelectual', t: 'Sozinho, concentrado' },
      { k: 'acao', t: 'Com amigos, para vibrar nas melhores partes' },
      { k: 'drama', t: 'Com alguém especial' },
      { k: 'maratonista', t: 'Sozinho… mas durante horas seguidas' },
    ],
  },
  {
    q: 'O que pensas dos spoilers?',
    opts: [
      { k: 'intelectual', t: 'Estragam a profundidade da experiência' },
      { k: 'acao', t: 'Não me afetam muito' },
      { k: 'drama', t: 'Arruinam a emoção' },
      { k: 'maratonista', t: 'Só me fazem querer ver mais rápido' },
    ],
  },
  {
    q: 'Escolhe uma palavra:',
    opts: [
      { k: 'intelectual', t: 'Reflexão' },
      { k: 'acao', t: 'Intensidade' },
      { k: 'drama', t: 'Emoção' },
      { k: 'maratonista', t: 'Vício' },
    ],
  },
];

const profiles = {
  intelectual: { label: 'Cinéfilo Intelectual', desc: 'Aprecias narrativas complexas, detalhes escondidos e filmes que continuam a trabalhar depois dos créditos.' },
  acao: { label: 'Amante de Ação', desc: 'Procuras ritmo, energia e aquele tipo de cena que obriga a subir o volume.' },
  drama: { label: 'Fã de Drama', desc: 'Valorizas emoção, personagens com cicatrizes e histórias que ficam no peito.' },
  maratonista: { label: 'Maratonista', desc: 'Gostas de universos longos, cliffhangers e da promessa perigosa de “só mais um episódio”.' },
};

const Quiz = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const copy = getThemeCopy(theme);
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [result, setResult] = useState<{ key: string; label: string; desc: string } | null>(null);

  const answeredCount = answers.filter(Boolean).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const choose = (i: number, k: string) => {
    const next = answers.slice();
    next[i] = k;
    setAnswers(next);
  };

  const compute = async () => {
    const score: Record<string, number> = { intelectual: 0, acao: 0, drama: 0, maratonista: 0 };
    answers.forEach(a => { if (a) score[a] = (score[a] || 0) + 1; });
    const order = ['intelectual', 'acao', 'drama', 'maratonista'];
    const sorted = order
      .map(k => ({ k, v: score[k] }))
      .sort((a, b) => b.v - a.v || order.indexOf(a.k) - order.indexOf(b.k));
    const top = sorted[0];
    const second = sorted[1];
    const pTop = profiles[top.k as keyof typeof profiles];
    let label = pTop.label;
    let desc = pTop.desc;
    if (second.v === top.v && second.v > 0) {
      const pSecond = profiles[second.k as keyof typeof profiles];
      label = `${pTop.label} com sombra de ${pSecond.label}`;
      desc = `${pTop.desc} Também há sinais de ${pSecond.label.toLowerCase()} no teu mapa.`;
    }
    setResult({ key: top.k, label, desc });
    if (user) await saveQuizResult(user.id, top.k, label, desc);
  };

  const reset = () => { setAnswers(Array(questions.length).fill('')); setResult(null); };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 md:px-6 md:pt-28">
        <section className="mb-8 overflow-hidden rounded-3xl border border-border bg-card/70 p-6 shadow-2xl md:p-8">
          <Badge variant="secondary" className="mb-3 gap-2">
            <Sparkles className="h-4 w-4" />
            Quiz
          </Badge>
          <h1 className="font-display text-4xl font-bold tracking-[-0.05em] text-foreground md:text-5xl">Que tipo de espectador és?</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Responde sem pensar demasiado. O objetivo não é acertar: é dar ao Movings uma primeira forma do teu gosto.
          </p>
          {!result && (
            <div className="mt-5 max-w-xl">
              <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                <span>{answeredCount}/{questions.length} respostas</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-primary/15">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </section>

        {!result ? (
          <div className="space-y-5">
            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card/65 p-5 transition hover:border-primary/30">
                <p className="mb-3 font-semibold text-foreground">{i + 1}. {q.q}</p>
                <div className="flex flex-wrap gap-2">
                  {q.opts.map((o, j) => (
                    <button
                      key={j}
                      onClick={() => choose(i, o.k)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${answers[i] === o.k ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/15' : 'border-border bg-secondary/45 text-muted-foreground hover:border-primary/35 hover:text-foreground'}`}
                    >
                      {o.t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={compute} variant="gold" disabled={answeredCount === 0} className="mb-10">
              Ver resultado
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <section className="mb-10 rounded-3xl border border-border bg-card/75 p-6 shadow-2xl md:p-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/15 text-primary motion-save-feedback">
              <Star className="h-8 w-8 fill-current" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Resultado guardado no teu perfil</p>
            <h2 className="font-display text-4xl font-bold tracking-[-0.05em] text-foreground md:text-5xl">{result.label}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{result.desc}</p>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">No tema {copy.name}, o Movings vai continuar a falar contigo num tom mais {copy.mood}.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/profile')} variant="gold">Ver Cartão do Movings</Button>
              <Button onClick={reset} variant="outline">
                <RotateCcw className="h-4 w-4" />
                Refazer quiz
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Quiz;
