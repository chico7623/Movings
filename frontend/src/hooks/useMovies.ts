/**
 * Data hook for movie lists and catalogue loading.
 */
import { useEffect, useState } from "react";
import { fetchMovies } from "@/services/api";

export type Movie = {
    id: number;
    title: string;
    poster_url: string;
    rating_avg?: number;
    rating_count?: number;
};

export function useMovies() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetchMovies()
            .then((data) => {
                if (!cancelled) setMovies(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar filmes");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { movies, loading, error };
}
