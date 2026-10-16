import { isEmail } from 'class-validator';

import { getPasswordPolicyViolation } from '../common/password-policy';

const BOOLEAN_VALUES = new Set(['true', 'false']);
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const PLACEHOLDER_PATTERN =
  /cambiar|cambia[_-]|change[_-]?this|placeholder|^dev[_-]|^admin\d*$/i;

function value(config: Record<string, unknown>, key: string) {
  return untrimmedValue(config, key).trim();
}

function untrimmedValue(config: Record<string, unknown>, key: string) {
  const raw = config[key];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  throw new Error(`${key} debe ser un valor simple.`);
}

function requireValue(config: Record<string, unknown>, key: string) {
  const current = value(config, key);
  if (!current) {
    throw new Error(`${key} es obligatorio.`);
  }
  return current;
}

function validatePositiveInteger(
  config: Record<string, unknown>,
  key: string,
  maximum?: number,
) {
  const raw = value(config, key);
  if (!raw) return;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} debe ser un numero entero mayor que cero.`);
  }

  if (maximum !== undefined && parsed > maximum) {
    throw new Error(`${key} debe estar entre 1 y ${maximum}.`);
  }
}

function validateBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  const raw = value(config, key).toLowerCase();
  if (!raw) return fallback;
  if (!BOOLEAN_VALUES.has(raw)) {
    throw new Error(`${key} debe ser true o false.`);
  }
  return raw === 'true';
}

export function booleanValue(
  raw: string | boolean | null | undefined,
  fallback: boolean,
) {
  if (raw === null || raw === undefined) {
    return fallback;
  }
  if (typeof raw === 'boolean') return raw;

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return fallback;
  if (!BOOLEAN_VALUES.has(normalized)) {
    throw new Error('El valor booleano debe ser true o false.');
  }
  return normalized === 'true';
}

export function normalizeApiBasePath(raw: string | null | undefined) {
  const current = raw?.trim() || '';
  if (!current || current === '/') return '';
  if (
    !current.startsWith('/') ||
    current.includes('?') ||
    current.includes('#')
  ) {
    throw new Error(
      'API_BASE_PATH debe estar vacio o ser una ruta que comience con /.',
    );
  }

  const segments = current.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('API_BASE_PATH no puede contener segmentos . o ..');
  }

  return `/${segments.join('/')}`;
}

function normalizePublicFrontendUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('PUBLIC_FRONTEND_URL debe ser una URL absoluta valida.');
  }

  if (!HTTP_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('PUBLIC_FRONTEND_URL debe usar http o https.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      'PUBLIC_FRONTEND_URL no puede incluir credenciales, query ni fragmento.',
    );
  }

  const path =
    parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${path}`;
}

export function parseCorsOrigins(raw: string | null | undefined) {
  const entries = (raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error('CORS_ORIGINS debe incluir al menos un origen.');
  }

  const origins = entries.map((entry) => {
    let parsed: URL;
    try {
      parsed = new URL(entry);
    } catch {
      throw new Error(`Origen CORS invalido: ${entry}.`);
    }

    if (
      !HTTP_PROTOCOLS.has(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      (parsed.pathname !== '/' && parsed.pathname !== '') ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(`Origen CORS invalido: ${entry}.`);
    }
    return parsed.origin;
  });

  return [...new Set(origins)];
}

function validateMail(config: Record<string, unknown>) {
  const host = value(config, 'MAIL_HOST');
  const port = value(config, 'MAIL_PORT');
  const from = value(config, 'MAIL_FROM');
  const user = value(config, 'MAIL_USER');
  const pass = value(config, 'MAIL_PASS');
  const required = validateBoolean(config, 'MAIL_REQUIRED', false);
  const hasAnyMailSetting = Boolean(host || port || from || user || pass);

  if (required && !hasAnyMailSetting) {
    throw new Error(
      'SMTP es obligatorio: define MAIL_HOST, MAIL_PORT y MAIL_FROM.',
    );
  }

  if (hasAnyMailSetting) {
    const missing = [
      ['MAIL_HOST', host],
      ['MAIL_PORT', port],
      ['MAIL_FROM', from],
    ]
      .filter(([, current]) => !current)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `Configuracion SMTP incompleta. Faltan: ${missing.join(', ')}.`,
      );
    }

    if (Boolean(user) !== Boolean(pass)) {
      throw new Error('MAIL_USER y MAIL_PASS deben definirse juntos.');
    }
  }

  validatePositiveInteger(config, 'MAIL_PORT', 65_535);
  validatePositiveInteger(config, 'MAIL_CONNECTION_TIMEOUT_MS');
  validatePositiveInteger(config, 'MAIL_GREETING_TIMEOUT_MS');
  validatePositiveInteger(config, 'MAIL_SOCKET_TIMEOUT_MS');
  validateBoolean(config, 'MAIL_SECURE', false);
}

function validateProductionSecret(
  key: string,
  current: string,
  minimumLength: number,
) {
  if (current.length < minimumLength) {
    throw new Error(
      `${key} debe tener al menos ${minimumLength} caracteres en produccion.`,
    );
  }
  if (PLACEHOLDER_PATTERN.test(current)) {
    throw new Error(
      `${key} contiene un placeholder no permitido en produccion.`,
    );
  }
}

function validateSeedAdmin(
  config: Record<string, unknown>,
  isProduction: boolean,
) {
  const email = value(config, 'SEED_ADMIN_EMAIL');
  const password = untrimmedValue(config, 'SEED_ADMIN_PASSWORD');

  if (Boolean(email) !== Boolean(password)) {
    throw new Error(
      'SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD deben definirse juntos o dejarse ambos vacios.',
    );
  }

  if (!email) return { email, password };

  if (!isEmail(email)) {
    throw new Error('SEED_ADMIN_EMAIL debe ser un correo electronico valido.');
  }

  const policyViolation = getPasswordPolicyViolation(
    password,
    'SEED_ADMIN_PASSWORD',
  );
  if (policyViolation) {
    throw new Error(policyViolation);
  }

  if (isProduction && PLACEHOLDER_PATTERN.test(email)) {
    throw new Error(
      'SEED_ADMIN_EMAIL contiene un placeholder no permitido en produccion.',
    );
  }
  if (isProduction && PLACEHOLDER_PATTERN.test(password)) {
    throw new Error(
      'SEED_ADMIN_PASSWORD contiene un placeholder no permitido en produccion.',
    );
  }

  return { email, password };
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validated = { ...config };
  const nodeEnvironment = value(config, 'NODE_ENV') || 'development';
  const isProduction = nodeEnvironment.toLowerCase() === 'production';

  validated.NODE_ENV = nodeEnvironment;

  validated.PORT = value(config, 'PORT') || '3001';
  validated.LISTEN_HOST = value(config, 'LISTEN_HOST') || '0.0.0.0';
  validated.API_BASE_PATH = normalizeApiBasePath(
    value(config, 'API_BASE_PATH') || '/api',
  );

  validatePositiveInteger(validated, 'PORT', 65_535);
  if (
    String(validated.LISTEN_HOST).includes('://') ||
    String(validated.LISTEN_HOST).includes('/')
  ) {
    throw new Error('LISTEN_HOST debe ser un host de escucha, no una URL.');
  }

  validated.DB_HOST = requireValue(config, 'DB_HOST');
  validated.DB_PORT = requireValue(config, 'DB_PORT');
  validated.DB_USER = requireValue(config, 'DB_USER');
  validated.DB_PASSWORD = requireValue(config, 'DB_PASSWORD');
  validated.DB_NAME = requireValue(config, 'DB_NAME');
  validatePositiveInteger(validated, 'DB_PORT', 65_535);
  if (isProduction) {
    validateProductionSecret('DB_PASSWORD', String(validated.DB_PASSWORD), 16);
  }

  const runMigrations = validateBoolean(config, 'DB_RUN_MIGRATIONS', true);
  const synchronize = validateBoolean(config, 'DB_SYNCHRONIZE', false);
  if (runMigrations && synchronize) {
    throw new Error(
      'DB_RUN_MIGRATIONS y DB_SYNCHRONIZE no pueden estar activos al mismo tiempo.',
    );
  }
  validated.DB_RUN_MIGRATIONS = String(runMigrations);
  validated.DB_SYNCHRONIZE = String(synchronize);

  validated.JWT_ACCESS_SECRET = requireValue(config, 'JWT_ACCESS_SECRET');
  validated.JWT_REFRESH_SECRET = requireValue(config, 'JWT_REFRESH_SECRET');
  if (validated.JWT_ACCESS_SECRET === validated.JWT_REFRESH_SECRET) {
    throw new Error(
      'Los secretos JWT de acceso y refresh deben ser distintos.',
    );
  }
  const seedAdmin = validateSeedAdmin(config, isProduction);
  validated.SEED_ADMIN_EMAIL = seedAdmin.email;
  validated.SEED_ADMIN_PASSWORD = seedAdmin.password;

  if (isProduction) {
    validateProductionSecret(
      'JWT_ACCESS_SECRET',
      String(validated.JWT_ACCESS_SECRET),
      32,
    );
    validateProductionSecret(
      'JWT_REFRESH_SECRET',
      String(validated.JWT_REFRESH_SECRET),
      32,
    );
  }

  validated.JWT_ACCESS_EXPIRES = value(config, 'JWT_ACCESS_EXPIRES') || '15m';
  validated.JWT_REFRESH_EXPIRES = value(config, 'JWT_REFRESH_EXPIRES') || '7d';
  for (const key of ['JWT_ACCESS_EXPIRES', 'JWT_REFRESH_EXPIRES']) {
    if (!/^\d+[smhd]$/i.test(String(validated[key]))) {
      throw new Error(`${key} debe usar el formato 15m, 12h o 7d.`);
    }
  }

  validated.PUBLIC_FRONTEND_URL = normalizePublicFrontendUrl(
    requireValue(config, 'PUBLIC_FRONTEND_URL'),
  );
  validated.CORS_ORIGINS = parseCorsOrigins(
    requireValue(config, 'CORS_ORIGINS'),
  ).join(',');
  validated.TRUST_PROXY = String(validateBoolean(config, 'TRUST_PROXY', false));
  validated.COOKIE_SECURE = String(
    validateBoolean(config, 'COOKIE_SECURE', false),
  );

  const cookieDomain = value(config, 'COOKIE_DOMAIN');
  if (
    cookieDomain &&
    !/^(\.?[A-Za-z0-9-]+)(\.[A-Za-z0-9-]+)*$/.test(cookieDomain)
  ) {
    throw new Error('COOKIE_DOMAIN no es un dominio valido.');
  }
  validated.COOKIE_DOMAIN = cookieDomain;

  const cookieName = value(config, 'COOKIE_NAME') || 'alea_refresh_token';
  if (!/^[A-Za-z0-9_-]+$/.test(cookieName)) {
    throw new Error(
      'COOKIE_NAME solo admite letras, numeros, guion y guion bajo.',
    );
  }
  validated.COOKIE_NAME = cookieName;

  validateMail(config);
  validated.MAIL_REQUIRED = String(
    validateBoolean(config, 'MAIL_REQUIRED', false),
  );
  validated.MAIL_SECURE = String(validateBoolean(config, 'MAIL_SECURE', false));

  return validated;
}
