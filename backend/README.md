# Backend - Muestreo Final

API REST para autenticacion, gestion de usuarios y bitacora de muestreos.

Stack principal:
- NestJS 11
- TypeORM
- PostgreSQL
- JWT
- Nodemailer (SMTP)

---

## 1) Modulos principales

- `auth/`: login, JWT strategy, guards
- `users/`: CRUD de usuarios, invitaciones, activacion, recuperacion
- `sampling-history/`: persistencia de auditoria de muestreos por usuario y archivo

Archivo de composicion: `src/app.module.ts`

---

## 2) Entidades y datos

### `users`
Campos clave:
- `id`, `email`, `fullName`
- `role` (`admin` | `auditor`)
- `status` (`active` | `pending` | `inactive`)
- `passwordHash`
- tokens de activacion y reset

### `sampling_history`
Campos clave:
- `id`
- `userId`
- `timestamp`
- `sampleSize`
- `seed`
- `fileHash`
- `resultHash`
- `method`

---

## 3) Variables de entorno

### Desarrollo (`backend/.env`)
Crear desde `backend/.env.example`.

Comando (Windows):

```bash
copy .env.example .env
```

Variables usadas:
- `PORT`, `LISTEN_HOST` (`0.0.0.0` en Docker) y `API_BASE_PATH`
- `PUBLIC_FRONTEND_URL`: unica URL usada para enlaces de activacion y reset
- `CORS_ORIGINS`: lista CSV de origenes, sin rutas
- `TRUST_PROXY`
- `COOKIE_SECURE`, `COOKIE_DOMAIN` y `COOKIE_NAME`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_RUN_MIGRATIONS=true` y `DB_SYNCHRONIZE=false`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- `MAIL_REQUIRED` para impedir el arranque si SMTP no esta configurado
- `MAIL_CONNECTION_TIMEOUT_MS`, `MAIL_GREETING_TIMEOUT_MS`, `MAIL_SOCKET_TIMEOUT_MS`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (admin inicial si DB vacia; se
  definen juntos o ambos vacios)
- `SEED_ADMIN_FULLNAME`, `SEED_ADMIN_INSTITUTION`, `SEED_ADMIN_INSTITUTION_ACRONYM`, `SEED_ADMIN_POSITION` (opcionales)

### Produccion (archivo central del servidor)

Docker Compose recibe toda la configuracion desde:

```text
/docker/alea/config/alea.env
```

La plantilla principal para ese archivo es `.env.server.example` en la raiz del
proyecto. `backend/.env.production.example` documenta solamente las variables
que consume directamente la API. El archivo real debe tener permisos
restrictivos y nunca debe versionarse.

Configuracion provisional por IP:

```env
API_BASE_PATH=/api
PUBLIC_FRONTEND_URL=http://IP_DEL_SERVIDOR:8080
CORS_ORIGINS=http://IP_DEL_SERVIDOR:8080
TRUST_PROXY=false
COOKIE_SECURE=false
COOKIE_DOMAIN=
```

Configuracion posterior con Nginx y las subrutas definitivas:

```env
API_BASE_PATH=/RUTA_BACKEND
PUBLIC_FRONTEND_URL=https://alea.sesna.gob.mx/RUTA_FRONTEND
CORS_ORIGINS=https://alea.sesna.gob.mx
TRUST_PROXY=true
COOKIE_SECURE=true
COOKIE_DOMAIN=alea.sesna.gob.mx
```

`API_BASE_PATH` se aplica como prefijo global de Nest. La cookie de refresh usa
automaticamente el path `API_BASE_PATH + /auth`. `GET /health` se mantiene sin
prefijo para el healthcheck interno.

Comportamiento de `SEED_ADMIN_*`:
- Al arrancar la app, si `users` esta vacia, se crea automaticamente un usuario `admin` activo.
- El password se guarda hasheado con `bcrypt` (`salt rounds = 10`).
- `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` deben definirse juntos o dejarse
  ambos vacios. El correo debe tener un formato valido y la contraseña debe
  tener entre 8 caracteres y 72 bytes UTF-8.
- Si la tabla esta vacia y ambas variables estan vacias, la app falla al iniciar
  para evitar quedar sin acceso.
- En produccion se rechazan placeholders en el correo y la contraseña iniciales.
  Los dos
  secretos JWT deben ser distintos, tener al menos 32 caracteres y tampoco
  pueden conservar los placeholders de las plantillas.
- `DB_PASSWORD` debe tener al menos 16 caracteres en produccion y tampoco puede
  conservar un placeholder de la plantilla.

---

## 4) Comandos locales

```bash
corepack enable
pnpm install
pnpm run start:dev
pnpm run build
pnpm run start:prod
pnpm run test
pnpm run test:e2e
pnpm run lint
```

---

## 5) API - Endpoints

Base URL local predeterminada: `http://localhost:3001/api`

Los ejemplos siguientes usan el valor predeterminado `/api`. Al cambiar
`API_BASE_PATH`, cambia el mismo prefijo para todos los endpoints salvo
`GET /health`.

### Salud minima
- `GET /health` (sin `API_BASE_PATH`)
- `GET /api` (con el prefijo predeterminado)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Users
- `GET /api/users` (admin)
- `POST /api/users/invite` (admin)
- `POST /api/users/resend-invite` (admin)
- `POST /api/users/activate` (publico)
- `POST /api/users/request-password-reset` (publico)
- `POST /api/users/reset-password` (publico)
- `PATCH /api/users/me/password` (autenticado)
- `PATCH /api/users/:id` (admin)
- `DELETE /api/users/:id` (admin)
- `GET /api/users/me` (autenticado)

### Sampling history
- `GET /api/sampling-history/:fileHash` (autenticado)
- `POST /api/sampling-history` (autenticado)

Seguridad de acceso:
- JWT Bearer por `Authorization`
- Los cambios y restablecimientos de contraseña revocan las sesiones anteriores
- Historial se filtra por `req.user.id` (cada usuario solo ve su propio historial)

---

## 6) Ejemplos de payload

### Login
```json
{
  "email": "auditor@correo.com",
  "password": "******"
}
```

### Guardar muestreo
```json
{
  "timestamp": "2026-02-17T19:00:00.000Z",
  "sampleSize": 50,
  "seed": "seed-xyz",
  "fileHash": "...",
  "resultHash": "...",
  "method": "FisherYates+PRNG(SHA256)"
}
```

Respuesta esperada:
```json
{
  "count": 1,
  "history": [
    {
      "timestamp": "...",
      "sampleSize": 50,
      "seed": "...",
      "fileHash": "...",
      "resultHash": "...",
      "method": "..."
    }
  ]
}
```

---

## 7) Docker

### Imagen
Se construye con `backend/Dockerfile` desde la raiz. Compose requiere el
archivo central de servidor:

```bash
docker compose --env-file /docker/alea/config/alea.env build backend
```

### Produccion
El procedimiento completo y la preparacion de `/docker/alea` estan en
`README-DEPLOY.md`. El arranque desde la raiz es:

```bash
docker compose --env-file /docker/alea/config/alea.env up -d --build
```

### Migraciones

El backend ejecuta automaticamente las migraciones pendientes antes de quedar
disponible cuando `DB_RUN_MIGRATIONS=true`. `DB_SYNCHRONIZE` debe permanecer en
`false`; la aplicacion ya incluye una migracion inicial para bases vacias y las
migraciones incrementales posteriores.

Los comandos manuales se reservan para mantenimiento o diagnostico:

```bash
# Desarrollo/local, con DB_* cargadas en la terminal
pnpm run migration:run

# Produccion desde la raiz y con el archivo central
docker compose --env-file /docker/alea/config/alea.env build backend
docker compose --env-file /docker/alea/config/alea.env run --rm backend pnpm run migration:run:prod
```

---

## 8) Consideraciones de seguridad

- Cambiar secretos JWT en produccion.
- No versionar `.env` reales.
- Restringir `CORS_ORIGINS` a los origenes reales; una subruta no forma parte
  de un origen CORS.
- Activar `TRUST_PROXY` solo cuando el backend este detras del proxy previsto.
- Usar `COOKIE_SECURE=true` solo con HTTPS y omitir `COOKIE_DOMAIN` durante el
  acceso provisional por IP.
- Usar credenciales SMTP dedicadas.
- Mantener `DB_SYNCHRONIZE=false` y `DB_RUN_MIGRATIONS=true`.

---

## 9) Troubleshooting

### DB no conecta
- Verificar host/puerto/credenciales
- Verificar red de Docker y servicio `db`

### 401/403 en endpoints protegidos
- Verificar token y expiracion
- Verificar rol (`admin`) cuando aplique

### Correo no enviado
- Verificar SMTP en `/docker/alea/config/alea.env`
- Revisar logs del backend

---

## 10) Referencias

- README raiz: `../README.md`
- Frontend: `../frontend/README.md`
- Despliegue: `../DEPLOYMENT.md`
