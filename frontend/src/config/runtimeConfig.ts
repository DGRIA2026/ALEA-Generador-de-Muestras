export type AleaRuntimeConfig = Readonly<{
  API_BASE_URL?: string;
  BASE_PATH?: string;
  API_BASE_PATH?: string;
}>;

declare global {
  interface Window {
    __ALEA_RUNTIME_CONFIG__?: AleaRuntimeConfig;
  }
}

function normalizedCandidate(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  if (candidate === '/') return '';
  return candidate.replace(/\/+$/, '');
}

/**
 * Runtime configuration wins in the web container. The Vite value remains a
 * fallback for local development and packaged Electron builds.
 */
export function resolveApiBaseUrl(
  runtimeConfig: AleaRuntimeConfig | undefined,
  buildTimeApiUrl: string | undefined,
): string {
  const candidates = [
    runtimeConfig?.API_BASE_URL,
    buildTimeApiUrl,
    runtimeConfig?.API_BASE_PATH,
  ];

  for (const candidate of candidates) {
    const normalized = normalizedCandidate(candidate);
    if (normalized !== undefined) return normalized;
  }

  return '/api';
}

