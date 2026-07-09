/**
 * Local director metadata used by the Sobre/details experience.
 */
import { Movie } from '@/types/movie';

export const RECOMMENDED_DIRECTORS = [
  'Christopher Nolan',
  'James Cameron',
  'Quentin Tarantino',
  'Martin Scorsese',
  'Frank Darabont',
  'Denis Villeneuve',
  'Francis Ford Coppola',
  'Peter Jackson',
  'David Fincher',
  'Greta Gerwig',
] as const;

export const CATALOG_DIRECTORS_BY_KEY: Record<string, string[]> = {
  'movie:19995': ['James Cameron'],
  'movie:24428': ['Joss Whedon'],
  'movie:238': ['Francis Ford Coppola'],
  'movie:157336': ['Christopher Nolan'],
  'movie:278': ['Frank Darabont'],
  'movie:299536': ['Anthony Russo', 'Joe Russo'],
  'movie:76600': ['James Cameron'],
  'movie:597': ['James Cameron'],
  'movie:269149': ['Byron Howard', 'Rich Moore', 'Jared Bush'],
  'movie:122': ['Peter Jackson'],
  'movie:27205': ['Christopher Nolan'],
  'movie:1311031': ['Haruo Sotozaki'],
  'movie:425274': ['Louis Leterrier'],
  'movie:575265': ['Christopher McQuarrie'],
  'movie:911430': ['Joseph Kosinski'],
  'movie:1061474': ['James Gunn'],
  'movie:83533': ['James Cameron'],
  'movie:1233413': ['Ryan Coogler'],
  'movie:155': ['Christopher Nolan'],
  'movie:13': ['Robert Zemeckis'],
  'movie:800001': ['Lana Wachowski', 'Lilly Wachowski'],
  'movie:800002': ['David Fincher'],
  'movie:800003': ['Quentin Tarantino'],
  'movie:800004': ['Martin Scorsese'],
  'movie:800005': ['Jonathan Demme'],
  'movie:800006': ['David Fincher'],
  'movie:800007': ['Ridley Scott'],
  'movie:800008': ['George Miller'],
  'movie:800009': ['Damien Chazelle'],
  'movie:800010': ['Bong Joon-ho'],
  'movie:800011': ['Christopher Nolan'],
  'movie:800012': ['Quentin Tarantino'],
  'movie:800013': ['Damien Chazelle'],
  'movie:800014': ['Todd Phillips'],
  'movie:800015': ['Joaquim Dos Santos', 'Kemp Powers', 'Justin K. Thompson'],
  'movie:800016': ['Denis Villeneuve'],
  'movie:800017': ['Christopher Nolan'],
  'movie:800018': ['Greta Gerwig'],
  'movie:800019': ['Chad Stahelski'],
  'movie:800020': ['Joseph Kosinski'],

  'tv:1622': ['Eric Kripke'],
  'tv:456': ['Matt Groening'],
  'tv:66732': ['Matt Duffer', 'Ross Duffer'],
  'tv:1399': ['David Benioff', 'D. B. Weiss'],
  'tv:1408': ['David Shore'],
  'tv:1668': ['David Crane', 'Marta Kauffman'],
  'tv:1405': ['James Manos Jr.'],
  'tv:4607': ['J. J. Abrams', 'Damon Lindelof', 'Carlton Cuse'],
  'tv:2316': ['Greg Daniels'],
  'tv:1421': ['Christopher Lloyd', 'Steven Levitan'],
  'tv:1402': ['Frank Darabont'],
  'tv:60625': ['Dan Harmon', 'Justin Roiland'],
  'tv:60059': ['Vince Gilligan', 'Peter Gould'],
  'tv:106379': ['Geneva Robertson-Dworet', 'Graham Wagner'],
  'tv:124364': ['John Griffin'],
  'tv:2288': ['Paul Scheuring'],
  'tv:73586': ['Taylor Sheridan', 'John Linson'],
  'tv:76479': ['Eric Kripke'],
  'tv:1398': ['David Chase'],
  'tv:42009': ['Charlie Brooker'],
  'tv:810001': ['Jon Favreau'],
  'tv:810002': ['Ryan Condal', 'George R. R. Martin'],
  'tv:810003': ['Vince Gilligan'],
  'tv:810004': ['Steven Knight'],
  'tv:810005': ['Baran bo Odar', 'Jantje Friese'],
  'tv:810006': ['Nic Pizzolatto'],
  'tv:810008': ['David Crane', 'Marta Kauffman'],
  'tv:810009': ['Mark Gatiss', 'Steven Moffat'],
  'tv:810010': ['Sam Esmail'],
  'tv:810011': ['Craig Mazin', 'Neil Druckmann'],
  'tv:810012': ['Christian Linke', 'Alex Yee'],
  'tv:810013': ['Chris Brancato', 'Carlo Bernard', 'Doug Miro'],
  'tv:810014': ['Joe Penhall', 'David Fincher'],
  'tv:810015': ['Lauren Schmidt Hissrich'],
  'tv:810016': ['Craig Mazin'],
  'tv:810017': ['Michael Hirst'],
  'tv:810018': ['Aaron Korsh'],
  'tv:810019': ['James Manos Jr.'],
  'tv:810020': ['J. J. Abrams', 'Damon Lindelof', 'Carlton Cuse'],
};

type MovieWithDirectorMetadata = Movie & {
  director?: string | null;
  directors?: string[] | null;
  creator?: string | null;
  creators?: string[] | null;
};

export const normalizeDirectorText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const getDirectorNames = (movie: Movie): string[] => {
  const mediaType = movie.media_type || 'movie';
  const key = `${mediaType}:${Number(movie.id)}`;
  const knownDirectors = CATALOG_DIRECTORS_BY_KEY[key] || [];

  const metadata = movie as MovieWithDirectorMetadata;
  const dynamicNames = [
    ...(Array.isArray(metadata.directors) ? metadata.directors : []),
    ...(metadata.director ? [metadata.director] : []),
    ...(Array.isArray(metadata.creators) ? metadata.creators : []),
    ...(metadata.creator ? [metadata.creator] : []),
  ];

  return Array.from(new Set([...knownDirectors, ...dynamicNames].filter(Boolean)));
};

export const movieMatchesDirector = (movie: Movie, query: string) => {
  const normalizedQuery = normalizeDirectorText(query);
  if (!normalizedQuery) return true;

  return getDirectorNames(movie).some((name) => normalizeDirectorText(name).includes(normalizedQuery));
};
