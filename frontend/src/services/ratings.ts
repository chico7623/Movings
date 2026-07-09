/**
 * Rating-specific service helpers.
 */
import { logger } from "@/lib/logger";
import { upsertRating } from "./api";

export async function submitRating(userId: string, movieId: number, rating: number) {
  try {
    const success = await upsertRating(userId, movieId, rating);

    if (!success) {
      throw new Error("Falha ao enviar avaliação.");
    }

    return { ok: true };
  } catch (error) {
    logger.error("Erro ao enviar rating.", error, { userId, movieId, rating });
    throw error;
  }
}
