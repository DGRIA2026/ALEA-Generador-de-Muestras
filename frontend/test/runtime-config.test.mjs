import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApiBaseUrl } from '../src/config/runtimeConfig.ts';

test('la configuracion runtime prevalece y elimina slash final', () => {
  assert.equal(
    resolveApiBaseUrl(
      { API_BASE_URL: 'https://alea.example.com/ruta-api/' },
      'http://localhost:3001',
    ),
    'https://alea.example.com/ruta-api',
  );
});

test('VITE_API_URL sigue disponible como fallback para Electron', () => {
  assert.equal(
    resolveApiBaseUrl(
      { API_BASE_URL: '', API_BASE_PATH: '/api-runtime' },
      'https://alea.example.com/api-electron/',
    ),
    'https://alea.example.com/api-electron',
  );
});

test('usa API_BASE_PATH runtime y finalmente /api', () => {
  assert.equal(
    resolveApiBaseUrl({ API_BASE_PATH: '/ruta-api/' }, undefined),
    '/ruta-api',
  );
  assert.equal(resolveApiBaseUrl(undefined, undefined), '/api');
});

test('permite que el fallback Electron apunte a la raiz del backend', () => {
  assert.equal(resolveApiBaseUrl(undefined, '/'), '');
});
