/**
 * Shared service helper utilities.
 */
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/http";
import { setStoredCsrfToken } from "@/lib/auth-storage";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function setCsrfToken(token: string | null) {
  setStoredCsrfToken(token);
}

function handleError(status: number, message?: string) {
  switch (status) {
    case 401:
      window.localStorage.removeItem("movings_user");
      window.location.href = "/auth?mode=login";
      toast({ title: "Sessão expirada", description: "Por favor, faz login novamente.", variant: "destructive" });
      break;
    case 403:
      toast({ title: "Acesso negado", description: "Não tens permissões para esta ação.", variant: "destructive" });
      break;
    case 429:
      toast({ title: "Muitas tentativas", description: "Por favor, tenta novamente mais tarde.", variant: "destructive" });
      break;
    case 500:
      toast({ title: "Erro do servidor", description: "Ocorreu um erro. Tenta novamente.", variant: "destructive" });
      break;
    default:
      if (message) {
        toast({ title: "Erro", description: message, variant: "destructive" });
      }
  }
}

export async function fetchData<T = unknown>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
): Promise<T | null> {
  const result = await apiRequest<T>(endpoint, {
    method: "GET",
    searchParams: params,
    auth: true,
  });

  if (!result.ok) {
    const errorPayload = result.data as { error?: string; message?: string } | null;
    handleError(result.status, errorPayload?.message || errorPayload?.error);
    return null;
  }

  return result.data;
}

export async function postData<T = ApiResponse>(
  endpoint: string,
  data?: Record<string, unknown>,
): Promise<T | null> {
  const result = await apiRequest<T>(endpoint, {
    method: "POST",
    body: data ?? null,
    auth: true,
    csrf: true,
  });

  if (!result.ok) {
    return (result.data ?? ({ error: `http_${result.status}` } as T));
  }

  return result.data;
}
