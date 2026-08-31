import {
  normalizeApiBasePath,
  parseCorsOrigins,
  validateEnvironment,
} from './env.validation';

function environment(overrides: Record<string, unknown> = {}) {
  return {
    PORT: '3001',
    DB_HOST: 'db',
    DB_PORT: '5432',
    DB_USER: 'app',
    DB_PASSWORD: 'database-password',
    DB_NAME: 'appdb',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    PUBLIC_FRONTEND_URL: 'http://localhost:5173',
    CORS_ORIGINS: 'http://localhost:5173',
    ...overrides,
  };
}

describe('validateEnvironment', () => {
  it('aplica valores seguros para escucha, rutas, proxy, cookies y DB', () => {
    const result = validateEnvironment(environment());

    expect(result).toMatchObject({
      LISTEN_HOST: '0.0.0.0',
      API_BASE_PATH: '/api',
      DB_RUN_MIGRATIONS: 'true',
      DB_SYNCHRONIZE: 'false',
      TRUST_PROXY: 'false',
      COOKIE_SECURE: 'false',
      COOKIE_DOMAIN: '',
      COOKIE_NAME: 'alea_refresh_token',
      PUBLIC_FRONTEND_URL: 'http://localhost:5173',
    });
  });

  it('normaliza el prefijo, la URL publica con subruta y los origenes CORS', () => {
    const result = validateEnvironment(
      environment({
        API_BASE_PATH: '//servicios//alea-api/',
        PUBLIC_FRONTEND_URL: 'https://alea.sesna.gob.mx/portal/',
        CORS_ORIGINS:
          'https://alea.sesna.gob.mx, http://192.0.2.10:8080, https://alea.sesna.gob.mx',
        TRUST_PROXY: 'true',
        COOKIE_SECURE: 'true',
        COOKIE_DOMAIN: 'alea.sesna.gob.mx',
        COOKIE_NAME: 'alea_refresh',
      }),
    );

    expect(result).toMatchObject({
      API_BASE_PATH: '/servicios/alea-api',
      PUBLIC_FRONTEND_URL: 'https://alea.sesna.gob.mx/portal',
      CORS_ORIGINS: 'https://alea.sesna.gob.mx,http://192.0.2.10:8080',
      TRUST_PROXY: 'true',
      COOKIE_SECURE: 'true',
      COOKIE_DOMAIN: 'alea.sesna.gob.mx',
      COOKIE_NAME: 'alea_refresh',
    });
  });

  it('permite SMTP deshabilitado cuando no es obligatorio', () => {
    expect(
      validateEnvironment(environment({ MAIL_REQUIRED: 'false' })),
    ).toMatchObject({
      MAIL_REQUIRED: 'false',
      MAIL_SECURE: 'false',
    });
  });

  it('rechaza una configuracion SMTP incompleta', () => {
    expect(() =>
      validateEnvironment(environment({ MAIL_HOST: 'smtp.example.com' })),
    ).toThrow('Configuracion SMTP incompleta. Faltan: MAIL_PORT, MAIL_FROM.');
  });

  it('rechaza el arranque cuando SMTP es obligatorio y no esta configurado', () => {
    expect(() =>
      validateEnvironment(environment({ MAIL_REQUIRED: 'true' })),
    ).toThrow('SMTP es obligatorio');
  });

  it('valida booleanos, puertos y tiempos de espera', () => {
    expect(() =>
      validateEnvironment(
        environment({
          MAIL_HOST: 'smtp.example.com',
          MAIL_PORT: '587',
          MAIL_FROM: 'no-reply@example.com',
          MAIL_SECURE: 'sometimes',
        }),
      ),
    ).toThrow('MAIL_SECURE debe ser true o false.');

    expect(() =>
      validateEnvironment(environment({ MAIL_CONNECTION_TIMEOUT_MS: '0' })),
    ).toThrow(
      'MAIL_CONNECTION_TIMEOUT_MS debe ser un numero entero mayor que cero.',
    );

    expect(() => validateEnvironment(environment({ PORT: '70000' }))).toThrow(
      'PORT debe estar entre 1 y 65535.',
    );
  });

  it('rechaza rutas, URLs y origenes invalidos', () => {
    expect(() => normalizeApiBasePath('api')).toThrow('API_BASE_PATH');
    expect(() =>
      validateEnvironment(
        environment({ PUBLIC_FRONTEND_URL: 'javascript:alert(1)' }),
      ),
    ).toThrow('PUBLIC_FRONTEND_URL debe usar http o https.');
    expect(() => parseCorsOrigins('https://example.com/ruta')).toThrow(
      'Origen CORS invalido',
    );
  });

  it('rechaza configuraciones de esquema y JWT inseguras', () => {
    expect(() =>
      validateEnvironment(
        environment({
          DB_RUN_MIGRATIONS: 'true',
          DB_SYNCHRONIZE: 'true',
        }),
      ),
    ).toThrow('no pueden estar activos al mismo tiempo');

    expect(() =>
      validateEnvironment(
        environment({
          JWT_REFRESH_SECRET: 'access-secret',
        }),
      ),
    ).toThrow('deben ser distintos');
  });

  it('rechaza secretos cortos y placeholders en produccion sin revelarlos', () => {
    expect(() =>
      validateEnvironment(
        environment({
          NODE_ENV: 'production',
          JWT_ACCESS_SECRET: 'demasiado-corto',
          JWT_REFRESH_SECRET:
            'refresh-real-con-mas-de-treinta-y-dos-caracteres',
        }),
      ),
    ).toThrow('JWT_ACCESS_SECRET debe tener al menos 32 caracteres');

    expect(() =>
      validateEnvironment(
        environment({
          NODE_ENV: 'production',
          JWT_ACCESS_SECRET: 'CAMBIAR_POR_UN_VALOR_ALEATORIO_SEGURO',
          JWT_REFRESH_SECRET:
            'refresh-real-con-mas-de-treinta-y-dos-caracteres',
        }),
      ),
    ).toThrow('JWT_ACCESS_SECRET contiene un placeholder');

    expect(() =>
      validateEnvironment(
        environment({
          NODE_ENV: 'production',
          JWT_ACCESS_SECRET: 'access-real-con-mas-de-treinta-y-dos-caracteres',
          JWT_REFRESH_SECRET:
            'refresh-real-con-mas-de-treinta-y-dos-caracteres',
          SEED_ADMIN_EMAIL: 'admin@example.com',
          SEED_ADMIN_PASSWORD: 'CAMBIAR_POR_UN_VALOR_SEGURO',
        }),
      ),
    ).toThrow('SEED_ADMIN_PASSWORD contiene un placeholder');
  });

  it('rechaza passwords de PostgreSQL debiles o con placeholder en produccion', () => {
    const productionSecrets = {
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'access-real-con-mas-de-treinta-y-dos-caracteres',
      JWT_REFRESH_SECRET: 'refresh-real-con-mas-de-treinta-y-dos-caracteres',
    };

    expect(() =>
      validateEnvironment(
        environment({ ...productionSecrets, DB_PASSWORD: 'corta' }),
      ),
    ).toThrow('DB_PASSWORD debe tener al menos 16 caracteres');

    expect(() =>
      validateEnvironment(
        environment({
          ...productionSecrets,
          DB_PASSWORD: 'CAMBIAR_POR_UN_VALOR_SEGURO',
        }),
      ),
    ).toThrow('DB_PASSWORD contiene un placeholder');
  });

  it.each([
    ['menos de 8 caracteres', 'corta', 'debe tener al menos 8 caracteres'],
    ['mas de 72 bytes', 'á'.repeat(40), 'no puede exceder 72 bytes'],
  ])(
    'rechaza SEED_ADMIN_PASSWORD con %s',
    (_caseName, seedPassword, expectedMessage) => {
      expect(() =>
        validateEnvironment(
          environment({
            SEED_ADMIN_EMAIL: 'admin@example.com',
            SEED_ADMIN_PASSWORD: seedPassword,
          }),
        ),
      ).toThrow(`SEED_ADMIN_PASSWORD ${expectedMessage}`);
    },
  );

  it.each([
    ['8 caracteres', '12345678'],
    ['exactamente 72 bytes', 'a'.repeat(72)],
  ])('acepta SEED_ADMIN_PASSWORD con %s', (_caseName, seedPassword) => {
    expect(
      validateEnvironment(
        environment({
          SEED_ADMIN_EMAIL: 'admin@example.com',
          SEED_ADMIN_PASSWORD: seedPassword,
        }),
      ),
    ).toMatchObject({ SEED_ADMIN_PASSWORD: seedPassword });
  });

  it.each([
    ['solo el correo', { SEED_ADMIN_EMAIL: 'admin@example.com' }],
    ['solo la contraseña', { SEED_ADMIN_PASSWORD: 'Segura123' }],
  ])('rechaza configurar %s del admin inicial', (_caseName, seedConfig) => {
    expect(() => validateEnvironment(environment(seedConfig))).toThrow(
      'SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD deben definirse juntos',
    );
  });

  it('rechaza un correo invalido para el admin inicial', () => {
    expect(() =>
      validateEnvironment(
        environment({
          SEED_ADMIN_EMAIL: 'correo-invalido',
          SEED_ADMIN_PASSWORD: 'Segura123',
        }),
      ),
    ).toThrow('SEED_ADMIN_EMAIL debe ser un correo electronico valido.');
  });

  it.each(['CAMBIAR@example.com', 'placeholder@example.com'])(
    'rechaza el placeholder de correo %s en produccion',
    (seedEmail) => {
      expect(() =>
        validateEnvironment(
          environment({
            NODE_ENV: 'production',
            DB_PASSWORD: 'database-password-segura',
            JWT_ACCESS_SECRET:
              'access-real-con-mas-de-treinta-y-dos-caracteres',
            JWT_REFRESH_SECRET:
              'refresh-real-con-mas-de-treinta-y-dos-caracteres',
            SEED_ADMIN_EMAIL: seedEmail,
            SEED_ADMIN_PASSWORD: 'PasswordInicial123',
          }),
        ),
      ).toThrow('SEED_ADMIN_EMAIL contiene un placeholder');
    },
  );
});
