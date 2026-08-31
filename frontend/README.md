# Frontend - Muestreo Final

Aplicacion cliente para administracion de usuarios y ejecucion/verificacion de muestreos.

Stack principal:
- React 19
- TypeScript
- Vite 7
- MUI + Tailwind
- XLSX para exportacion

---

## 1) Responsabilidades del frontend

- Login y gestion de sesion
- Vista de administrador:
  - crear/invitar usuario
  - editar usuario
  - eliminar usuario
  - reenviar invitacion
- Vista de auditor:
  - cargar archivo de empleados
  - generar muestra
  - verificar muestra
  - consultar historial
  - exportar resultados a Excel

La persistencia de historial de muestreos se realiza en backend (base de datos), no en localStorage.

---

## 2) Estructura recomendada

```text
frontend/
|-- components/
|   |-- auditor/
|   |-- admin/
|   `-- ...
|-- src/
|   |-- auth/
|   |-- theme/
|   |-- api.ts
|   `-- App.tsx
|-- utils/
|-- types.ts
|-- Dockerfile
|-- Dockerfile.prod
`-- vite.config.ts
```

---

## 3) Variables de entorno

### Desarrollo
Archivo: `frontend/.env` (crear desde `frontend/.env.example`)

Comando (Windows):

```bash
copy .env.example .env
```

```env
VITE_API_URL=http://localhost:3001/api
# VITE_PROXY_TARGET=http://localhost:3001
```

La configuracion anterior usa acceso directo al backend. El prefijo `/api` es
obligatorio porque Nest lo conserva en todas sus rutas.

### Proxy opcional de Vite

Este flujo aplica solo al desarrollo manual con `pnpm run dev` o con
`frontend/Dockerfile`; no corresponde al Compose de servidor, que usa la
imagen productiva y configuracion runtime.

- `VITE_API_URL=/api` hace que el navegador llame al mismo origen de Vite.
- `VITE_PROXY_TARGET=http://localhost:3001` envia la solicitud al backend local
  conservando el prefijo; por ejemplo, `/api/auth/login` llega a Nest como
  `/api/auth/login`.

Para usar el proxy, configura ambas variables de esta forma:

```env
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:3001
```

Para acceso directo, no configures `VITE_PROXY_TARGET` y usa siempre la URL con
el prefijo completo:

```env
VITE_API_URL=http://localhost:3001/api
```

Si el contenedor de desarrollo comparte red Docker con el backend, cambia el
target manualmente a `http://backend:3001`.

### Produccion: configuracion en runtime

La imagen productiva es reutilizable: IP, dominio y prefijos se leen cuando
arranca el contenedor y se escriben en `runtime-config.js`. Cambiarlos requiere
recrear el contenedor, pero no reconstruir la imagen.

```env
BASE_PATH=/
API_BASE_PATH=/api
API_BASE_URL=/api
BACKEND_INTERNAL_URL=http://backend:3001
```

- `BASE_PATH`: ruta publica del frontend. Usa `/` o una ruta como
  `/RUTA_FRONTEND`; se normaliza sin slash final.
- `API_BASE_PATH`: prefijo que Nginx conserva al proxyear hacia Nest. Debe
  comenzar con `/`, no puede ser `/` ni coincidir con `BASE_PATH`.
- `API_BASE_URL`: base usada por el navegador. Puede ser una ruta como `/api`
  o una URL absoluta. Se admite `http://` para la IP provisional y debe usarse
  `https://` en produccion. Si se omite, toma `API_BASE_PATH`.
- `BACKEND_INTERNAL_URL`: origen interno del backend, sin path; por ejemplo,
  `http://backend:3001`.

Ejemplo posterior con subrutas:

```env
BASE_PATH=/RUTA_FRONTEND
API_BASE_PATH=/RUTA_BACKEND
API_BASE_URL=https://alea.sesna.gob.mx/RUTA_BACKEND
BACKEND_INTERNAL_URL=http://backend:3001
```

`VITE_API_URL` ya no configura el contenedor web productivo. Se conserva como
fallback integrado al build para desarrollo local, Electron o alojamiento
estatico sin configuración runtime. Para Electron debe ser una URL absoluta
`http://` o `https://`; una ruta como `/api` no es resoluble desde `file://`.

---

## 4) Comandos locales

```bash
corepack enable
pnpm install
pnpm run dev
pnpm run build
pnpm run preview
pnpm run lint
```

---

## 5) Docker

### Dockerfile (dev)
- Ejecuta `pnpm run dev`
- Puerto interno `5173`
- Ejecuta como usuario no privilegiado `node`

### Dockerfile.prod (prod)
- Build estatico con Vite
- Sirve HTTP con Nginx en puerto interno `8080`
- Ejecuta como usuario no privilegiado `nginx`
- Genera Nginx y `runtime-config.js` al arrancar
- Expone healthcheck en `/_alea_health`
- Sirve el frontend bajo `BASE_PATH` y redirige la forma sin slash final
- Proxyea `API_BASE_PATH` a `BACKEND_INTERNAL_URL` sin eliminar el prefijo
- No administra TLS; HTTPS corresponde al proxy inverso exterior

---

## 6) Flujo funcional principal

### 6.1 Generar muestra
1. Cargar archivo valido (`csv/xlsx/xls`).
2. El sistema calcula hash del archivo.
3. Se genera seed (o se usa una proporcionada en verificacion).
4. Se aplica algoritmo de mezcla + seleccion.
5. Se calcula hash del resultado.
6. Se guarda registro de auditoria en backend.

### 6.2 Verificar muestra
1. Cargar mismo archivo base.
2. Ingresar seed y (opcional) hash resultado.
3. Reproducir seleccion deterministica.
4. Comparar hash ingresado vs hash calculado.

### 6.3 Historial
- Se carga por `fileHash` y usuario autenticado.
- Boton `Ver` copia seed/hash/tamano a la pestaña `Verificar`.

---

## 7) Integracion API (resumen)

Archivo: `frontend/src/api.ts`

Funciones relevantes:
- `login`
- `usersMe`
- `listUsers`, `inviteUser`, `updateUser`, `deleteUser`, etc.
- `getSamplingUsage(fileHash)`
- `saveSamplingHistoryItem(item)`

Auth:
- Token JWT en `Authorization: Bearer ...`

---

## 8) Build y calidad

### Build
```bash
pnpm run build
```

### Lint
```bash
pnpm run lint
```

---

## 9) Troubleshooting

### `npm ci` falla en contenedor
Este proyecto usa `pnpm-lock.yaml` para Docker. Usa `pnpm`, no `npm ci`.

### No hay conexion al backend en Docker
- Consulta `BASE_PATH/runtime-config.js` y verifica `API_BASE_URL`.
- Verifica que `API_BASE_PATH` coincida con el prefijo configurado en Nest.
- Verifica `BACKEND_INTERNAL_URL` desde la red interna de Docker.
- Comprueba `http://HOST:PUERTO/_alea_health`.
- Revisa `docker compose logs -f frontend`

### Error en exportacion Excel
Verifica que exista `sample` y que no este vacio antes de exportar.

---

## 10) Referencias

- README raiz: `../README.md`
- Backend: `../backend/README.md`
- Despliegue: `../DEPLOYMENT.md`
