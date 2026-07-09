/**
 * Environment variable helpers for API URLs and runtime configuration.
 */
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const envSchema = z.object({
  VITE_PHP_API_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url("VITE_PHP_API_URL tem de ser um URL válido.").default("http://localhost/movings-api"),
  ),
  VITE_NODE_API_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url("VITE_NODE_API_URL tem de ser um URL válido.").default("http://localhost:3001"),
  ),
  MODE: z.string().optional(),
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  console.error("Variáveis de ambiente inválidas:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Configuração inválida. Confirma o ficheiro .env.");
}

export const env = parsedEnv.data;

export const apiConfig = {
  phpDirectBaseUrl: env.VITE_PHP_API_URL.replace(/\/+$/, ""),
  phpProxyBaseUrl: "/api/php",
  nodeDirectBaseUrl: env.VITE_NODE_API_URL.replace(/\/+$/, ""),
};
