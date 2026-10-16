import assert from 'node:assert/strict';
import test from 'node:test';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('la sesion sobrevive a recargas pero no a una nueva sesion de pestana', async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage() });
  localStorage.setItem('accessToken', 'legacy-token');
  localStorage.setItem('user', JSON.stringify({ id: 'legacy' }));
  localStorage.setItem('unrelated', 'keep');

  const { session } = await import('../src/auth/session.ts');
  assert.equal(session.getToken(), null);
  assert.equal(localStorage.getItem('accessToken'), null);
  assert.equal(localStorage.getItem('user'), null);
  assert.equal(localStorage.getItem('unrelated'), 'keep');

  session.setToken('login-token');
  session.setUser({ id: 'user-1' });
  const { session: reloaded } = await import('../src/auth/session.ts?reload');
  assert.equal(reloaded.getToken(), 'login-token');
  assert.deepEqual(reloaded.getUser(), { id: 'user-1' });
  reloaded.setToken('renewed-token');
  assert.equal(localStorage.getItem('accessToken'), null);
  assert.equal(sessionStorage.getItem('accessToken'), 'renewed-token');

  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage() });
  const { session: reopened } = await import('../src/auth/session.ts?new-tab');
  assert.equal(reopened.getToken(), null);
  assert.equal(reopened.getUser(), null);
  reopened.setToken('another-login');
  reopened.setUser({ id: 'user-1' });
  reopened.clear();
  assert.equal(reopened.getToken(), null);
  assert.equal(reopened.getUser(), null);
});
