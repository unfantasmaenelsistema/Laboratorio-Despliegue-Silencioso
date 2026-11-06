import { DIAGNOSTIC_CHALLENGES } from '../data/catalog';

/** Conserva solo respuestas a casos y opciones que existen (protege frente a un localStorage antiguo o manipulado). */
export function sanitizeAnswers(raw: unknown): Record<string, string> {
  const clean: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const ch of DIAGNOSTIC_CHALLENGES) {
    const value = (raw as Record<string, unknown>)[ch.id];
    if (typeof value === 'string' && ch.options.some((o) => o.id === value)) {
      clean[ch.id] = value;
    }
  }
  return clean;
}

/** Número de casos cuya primera (y única) respuesta es la correcta. */
export function countSolved(answers: Record<string, string>): number {
  return DIAGNOSTIC_CHALLENGES.filter((ch) => ch.options.find((o) => o.id === answers[ch.id])?.isCorrect).length;
}

/** Registra una respuesta solo si el caso aún no tenía ninguna: la primera elección queda fijada. */
export function recordAnswer(
  answers: Record<string, string>,
  challengeId: string,
  optionId: string
): Record<string, string> {
  return answers[challengeId] ? answers : { ...answers, [challengeId]: optionId };
}
