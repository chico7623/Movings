/**
 * Environment variable helpers for API URLs and runtime configuration.
 *
 * In production the safest default is the same-origin Caddy proxy (/api/php).
 * This avoids CORS failures and avoids coupling the browser bundle to a build-time
 * VITE_PHP_API_URL value.
 */
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const relativeOrAbsoluteUrl = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "URL tem de ser absoluto http(s) ou relativo a começar por /.",
  );

const envSchema = z.object({
  VITE_PHP_API_URL: z.preprocess(
    emptyStringToUndefined,
    relativeOrAbsoluteUrl.default("/api/php"),
  ),
  VITE_NODE_API_URL: z.preprocess(
    emptyStringToUndefined,
    relativeOrAbsoluteUrl.default("/api"),
  ),
  MODE: z.string().optional(),
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  console.error("Variáveis de ambiente inválidas:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Configuração inválida. Confirma as variáveis do frontend.");
}

export const env = parsedEnv.data;

export const apiConfig = {
  phpDirectBaseUrl: env.VITE_PHP_API_URL.replace(/\/+$/, ""),
  phpProxyBaseUrl: "/api/php",
  nodeDirectBaseUrl: env.VITE_NODE_API_URL.replace(/\/+$/, ""),
};
