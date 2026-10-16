import type { User } from '../../types';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

// false: sesion por pestana, conservada al recargar la pagina.
// true: restaura el comportamiento anterior, persistente entre ingresos.
// Cambiar esta opcion requiere recompilar el frontend.
const PERSIST_SESSION = false;
const storage = PERSIST_SESSION ? localStorage : sessionStorage;
const previousStorage = PERSIST_SESSION ? sessionStorage : localStorage;

// No reutilizar sesiones guardadas con la politica anterior.
previousStorage.removeItem(TOKEN_KEY);
previousStorage.removeItem(USER_KEY);

export const session = {
  getToken(): string | null {
    return storage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    storage.setItem(TOKEN_KEY, token);
  },
  getUser(): User | null {
    const raw = storage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  setUser(user: User) {
    storage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearToken() {
    storage.removeItem(TOKEN_KEY);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};
