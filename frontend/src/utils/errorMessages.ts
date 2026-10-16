type ErrorResponse = {
  message?: unknown;
};

export function getErrorMessages(
  errorData: unknown,
  fallback = 'No fue posible crear el usuario',
): string[] {
  if (errorData instanceof Error && errorData.message) {
    return [errorData.message];
  }

  const message =
    errorData && typeof errorData === 'object'
      ? (errorData as ErrorResponse).message
      : undefined;

  if (Array.isArray(message)) {
    const messages = message
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter(Boolean);
    return messages.length > 0 ? messages : [fallback];
  }

  if (message !== null && message !== undefined) {
    const normalized = String(message).trim();
    if (normalized) return [normalized];
  }

  return [fallback];
}
