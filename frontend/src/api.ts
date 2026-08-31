import type {
  InviteUserInput,
  MailStatus,
  SamplingColumn,
  SamplingHistoryItem,
  SupportContact,
  User,
} from '../types';
import { getErrorMessages } from './utils/errorMessages';
import { buildInviteUserPayload } from './users/inviteUserPayload';
import { resolveApiBaseUrl } from './config/runtimeConfig';

const API_URL = resolveApiBaseUrl(
  window.__ALEA_RUNTIME_CONFIG__,
  import.meta.env.VITE_API_URL,
);
const ACCESS_TOKEN_KEY = 'accessToken';
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiUnavailableError extends Error {
  constructor(message = 'El servicio todavia esta iniciando o no esta disponible.') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new ApiUnavailableError(
        'El servicio tardo demasiado en responder. Espera unos segundos e intenta nuevamente.',
      );
    }
    if (error instanceof TypeError) {
      throw new ApiUnavailableError();
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export type LoginResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'auditor';
    status: 'active' | 'pending' | 'inactive';
    institution: string;
    institutionAcronym: string;
    position: string;
    lastLogin?: string;
    lastUploadedFileHash?: string | null;
    uploadWindowStartedAt?: string | null;
    uploadWindowEndsAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  accessToken: string;
};

export type SamplingUsageResponse = {
  count: number;
  history: SamplingHistoryItem[];
};

export type SamplingColumnsResponse = {
  columns: SamplingColumn[];
};

export type SupportContactResponse = {
  contact: SupportContact;
};

export type FileUploadEligibilityResponse = {
  canUpload: boolean;
  message: string;
  activeFileHash: string | null;
  uploadWindowStartedAt: string | null;
  uploadWindowEndsAt: string | null;
};

function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      clearToken();
      return null;
    }

    const data = await res.json().catch(() => null as { accessToken?: string } | null);
    const nextToken = data?.accessToken;

    if (!nextToken || typeof nextToken !== 'string') {
      clearToken();
      return null;
    }

    setToken(nextToken);
    return nextToken;
  })()
    .catch(() => {
      clearToken();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function parseErrorMessage(res: Response, fallback: string) {
  try {
    const data: unknown = await res.json();
    return getErrorMessages(data, fallback).join(' ');
  } catch {
    return fallback;
  }
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('No hay sesion');

  const sendRequest = async (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetchWithTimeout(`${API_URL}${path}`, { ...init, headers });
  };

  let res = await sendRequest(token);

  if (res.status === 401) {
    const nextToken = await refreshAccessToken();

    if (!nextToken) {
      throw new Error('Sesion expirada');
    }

    res = await sendRequest(nextToken);
  }

  if (res.status === 401) throw new Error('Sesion expirada');
  if (res.status === 403) throw new Error('No autorizado');
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Error HTTP ${res.status}`));

  return res.json();
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    if (res.status >= 500) {
      throw new ApiUnavailableError();
    }
    let msg = 'Credenciales invalidas';
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {}
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }

  return res.json();
}

export async function logout() {
  await fetchWithTimeout(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function usersMe() {
  return authFetch<any>('/users/me');
}

export function listUsers() {
  return authFetch<any[]>('/users');
}

export function getMailStatus() {
  return authFetch<MailStatus>('/users/mail-status');
}

export function inviteUser(payload: InviteUserInput) {
  const body = buildInviteUserPayload(payload);
  return authFetch<{
    message: string;
    user: User;
    activationLink: string;
    emailSent: boolean;
    mailStatus: MailStatus;
  }>('/users/invite', {
    method: 'POST',
    body: JSON.stringify({
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      institution: body.institution,
      institutionAcronym: body.institutionAcronym,
      position: body.position,
    }),
  });
}

export function resendInvite(email: string) {
  return authFetch<{ message: string; activationLink: string; mailStatus: MailStatus }>('/users/resend-invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function updateUser(id: string, payload: {
  fullName: string;
  email: string;
  role: 'admin' | 'auditor';
  institution: string;
  institutionAcronym: string;
  position: string;
}) {
  return authFetch<{ message: string; user: any }>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string) {
  return authFetch<{ message: string }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export function reactivateUserUpload(id: string) {
  return authFetch<{ message: string; user: any }>(`/users/${id}/reactivate-upload`, {
    method: 'PATCH',
  });
}

export function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return authFetch<{ message: string; emailSent: boolean }>(
    '/users/me/password',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function getSamplingUsage(fileHash: string) {
  return authFetch<SamplingUsageResponse>(`/sampling-history/${encodeURIComponent(fileHash)}`);
}

export function getFileUploadEligibility(fileHash: string) {
  return authFetch<FileUploadEligibilityResponse>('/sampling-history/upload-eligibility', {
    method: 'POST',
    body: JSON.stringify({ fileHash }),
  });
}

export function saveSamplingHistoryItem(item: SamplingHistoryItem) {
  return authFetch<SamplingUsageResponse>('/sampling-history', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export function getSamplingColumns() {
  return authFetch<SamplingColumnsResponse>('/app-config/sampling-columns');
}

export function updateSamplingColumns(columns: Array<{ label: string; aliases?: string[] }>) {
  return authFetch<SamplingColumnsResponse>('/app-config/sampling-columns', {
    method: 'PUT',
    body: JSON.stringify({ columns }),
  });
}

export function getSupportContact() {
  return authFetch<SupportContactResponse>('/app-config/support-contact');
}

export function updateSupportContact(contact: SupportContact) {
  return authFetch<SupportContactResponse>('/app-config/support-contact', {
    method: 'PUT',
    body: JSON.stringify(contact),
  });
}

export async function requestPasswordReset(email: string) {
  const res = await fetchWithTimeout(`${API_URL}/users/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'No se pudo solicitar la recuperacion de contrasena.'));
  }

  return res.json();
}

export async function resetPassword(token: string, password: string) {
  const res = await fetchWithTimeout(`${API_URL}/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'No se pudo restablecer la contrasena.'));
  }

  return res.json();
}

export async function activateAccount(token: string, password: string) {
  const res = await fetchWithTimeout(`${API_URL}/users/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'No se pudo activar la cuenta.'));
  }

  return res.json();
}
