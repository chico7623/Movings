/**
 * About page for project/context and directors.
 */
import { BookOpenText, MonitorPlay, Target, UsersRound } from 'lucide-react';
import Header from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const Sobre = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-14 md:px-6 md:pt-28">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card/80 p-6 shadow-2xl md:p-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative max-w-4xl">
            <Badge variant="secondary" className="mb-4 gap-2">
              <MonitorPlay className="h-4 w-4" />
              Sobre o projeto
            </Badge>

            <h1 className="font-display text-4xl font-bold tracking-[-0.055em] text-foreground md:text-6xl">
              Um espaço online para organizar, acompanhar e classificar filmes e séries.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              O Movings é um website criado com o intuito de desenvolver um sistema online para classificar filmes e séries.
              A plataforma funciona como um espaço virtual onde os utilizadores conseguem avaliar os seus filmes e séries,
              consultar dados completos sobre cada produção, como sinopse, imagens, trailers e outras informações relevantes,
              e expressar a sua opinião através de comentários e notas.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              O objetivo é simplificar e otimizar a forma como cada pessoa organiza, acompanha e avalia os conteúdos que gosta
              de assistir, proporcionando uma experiência descomplicada, acessível e fácil de utilizar.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Card className="overflow-hidden border-border bg-card/75">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <BookOpenText className="h-6 w-6" />
              </div>
              <h2 className="mb-3 text-xl font-semibold text-foreground">Fundamentação</h2>
              <p className="leading-7 text-muted-foreground">
                Com o aumento das plataformas de streaming e da grande quantidade de conteúdos disponíveis, torna-se cada vez
                mais importante ter ferramentas que ajudem as pessoas a organizar e catalogar os filmes e séries que acompanham.
                Muitas vezes, o utilizador perde a noção do que já viu, do que pretende ver ou da opinião que teve sobre
                determinado título.
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                Este projeto surge como uma forma prática e intuitiva de gerir conteúdos multimédia, permitindo guardar
                preferências, consultar informações e acompanhar filmes e séries de maneira eficiente e agradável.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border bg-card/75">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="mb-3 text-xl font-semibold text-foreground">Objetivos</h2>
              <p className="leading-7 text-muted-foreground">
                O objetivo central do Movings é desenvolver um site que ajude as pessoas a organizar e dar notas a filmes e
                séries de uma maneira simples, bem estruturada e apelativa.
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                A proposta é permitir que os utilizadores adicionem filmes e séries a listas personalizadas, consultem
                informações detalhadas sobre cada título, pesquisem rapidamente o que procuram e partilhem a sua opinião
                através de avaliações e comentários.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border bg-card/75">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <UsersRound className="h-6 w-6" />
              </div>
              <h2 className="mb-3 text-xl font-semibold text-foreground">População-alvo</h2>
              <p className="leading-7 text-muted-foreground">
                O Movings foi criado a pensar em pessoas que gostam de filmes e séries e que procuram uma forma simples de
                organizar, acompanhar e avaliar aquilo que assistem.
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                A plataforma destina-se a utilizadores de várias idades, desde jovens a adultos, e foi pensada para ser fácil
                de usar mesmo por quem não tenha muitos conhecimentos de tecnologia.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Sobre;
