/**
 * Shared error helpers for consistent UI/API error handling.
 */
export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "INVALID_JSON"
  | "INTERNAL_ERROR";

const STATUS_TO_CODE: Record<number, AppErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(params: {
    message: string;
    code?: AppErrorCode;
    statusCode?: number;
    details?: unknown;
  }) {
    super(params.message);

    this.name = "AppError";
    this.code = params.code ?? mapStatusToErrorCode(params.statusCode);
    this.statusCode = params.statusCode ?? 500;
    this.details = params.details;
  }
}

export function mapStatusToErrorCode(statusCode?: number): AppErrorCode {
  if (!statusCode) return "INTERNAL_ERROR";
  return STATUS_TO_CODE[statusCode] ?? "INTERNAL_ERROR";
}

export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
