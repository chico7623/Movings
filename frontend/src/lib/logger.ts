/**
 * Small logging helper to keep debug output controlled.
 */
type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

const isDevelopment = import.meta.env.DEV;

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    if (!isDevelopment) return;
    writeLog({ level: "info", message, context });
  },

  warn(message: string, context?: Record<string, unknown>) {
    writeLog({ level: "warn", message, context });
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    writeLog({ level: "error", message, error, context });
  },
};

function writeLog(payload: LogPayload) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: payload.level,
    message: payload.message,
    context: payload.context,
    error: normalizeError(payload.error),
  };

  if (payload.level === "error") {
    console.error(entry);
    return;
  }

  if (payload.level === "warn") {
    console.warn(entry);
    return;
  }

  console.info(entry);
}

function normalizeError(error: unknown) {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
    };
  }

  return error;
}
