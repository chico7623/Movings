/**
 * Low-level HTTP wrapper with JSON handling, auth token and CSRF header support.
 */
import { apiConfig } from "@/lib/env";
import { getAuthToken, getCsrfToken } from "@/lib/auth-storage";
import { AppError, mapStatusToErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";

type PrimitiveQueryValue = string | number | boolean | null | undefined;

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  searchParams?: Record<string, PrimitiveQueryValue>;
  auth?: boolean;
  csrf?: boolean;
};

export type ApiRequestResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  url: string;
};

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<ApiRequestResult<T>> {
  const urls = buildPhpApiUrls(endpoint, options.searchParams);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, buildFetchOptions(options));
      const data = await parseResponseBody<T>(response);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          data,
          url,
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
        url,
      };
    } catch (error) {
      lastError = error;
      logger.warn("Falha numa tentativa de API; a tentar fallback.", {
        url,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new AppError({
    message: "Não foi possível ligar ao backend.",
    code: "NETWORK_ERROR",
    statusCode: 0,
    details: lastError,
  });
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T | null> {
  try {
    const result = await apiRequest<T>(endpoint, options);
    return result.data;
  } catch (error) {
    logger.error("Pedido à API falhou sem resposta útil.", error, { endpoint });
    return null;
  }
}

function buildPhpApiUrls(endpoint: string, searchParams?: Record<string, PrimitiveQueryValue>) {
  const cleanEndpoint = endpoint.replace(/^\/+/, "");

  // WAMP costuma alternar entre localhost e 127.0.0.1 conforme a instalação.
  // Mantemos vários fallbacks para impedir falso "backend offline".
  const baseUrls = Array.from(new Set([
    apiConfig.phpDirectBaseUrl,
    "http://localhost/movings-api",
    "http://127.0.0.1/movings-api",
    "/api/php",
    "/movings-api",
  ]));

  return baseUrls.map((baseUrl) => {
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/${cleanEndpoint}`, window.location.origin);

    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      url.searchParams.set(key, String(value));
    });

    return url.toString();
  });
}

function buildFetchOptions(options: ApiRequestOptions): RequestInit {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && shouldSendJson(options.body)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.csrf) {
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const { searchParams: _searchParams, auth: _auth, csrf: _csrf, body, ...rest } = options;

  return {
    ...rest,
    headers,
    body: serializeBody(body),
  };
}

function shouldSendJson(body: ApiRequestOptions["body"]) {
  return Boolean(body) && !(body instanceof FormData) && !(body instanceof Blob) && !(typeof body === "string");
}

function serializeBody(body: ApiRequestOptions["body"]): BodyInit | undefined {
  if (!body) return undefined;

  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

async function parseResponseBody<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new AppError({
      message: "A API devolveu uma resposta inválida.",
      code: mapStatusToErrorCode(response.status) === "INTERNAL_ERROR" ? "INVALID_JSON" : mapStatusToErrorCode(response.status),
      statusCode: response.status,
      details: { text, error },
    });
  }
}
