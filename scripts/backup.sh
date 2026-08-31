#!/usr/bin/env bash

set -euo pipefail

umask 077

readonly DEFAULT_ALEA_ROOT="/docker/alea"
readonly OPERATION_LOCK_FD=9
readonly INTERNAL_LOCK_ARGUMENT="--internal-inherited-restore-lock"
ALEA_ROOT="${ALEA_ROOT:-${DEFAULT_ALEA_ROOT}}"
ALEA_APP_DIR="${ALEA_APP_DIR:-${ALEA_ROOT}/app}"
ALEA_ENV_FILE="${ALEA_ENV_FILE:-${ALEA_ROOT}/config/alea.env}"
ALEA_COMPOSE_FILE="${ALEA_COMPOSE_FILE:-${ALEA_APP_DIR}/docker-compose.yml}"
ALEA_BACKUP_DIR="${ALEA_BACKUP_DIR:-${ALEA_ROOT}/backups/postgres}"

COMPOSE=(
  docker compose
  --env-file "${ALEA_ENV_FILE}"
  -f "${ALEA_COMPOSE_FILE}"
)

temporary_dump=""
temporary_checksum=""
published_dump=""
published_checksum=""
publication_complete=false
inherited_restore_lock=false

log() {
  printf '[backup] %s\n' "$*" >&2
}

fail() {
  printf '[backup] ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [[ -n "${temporary_dump}" && -e "${temporary_dump}" ]]; then
    rm -f -- "${temporary_dump}"
  fi
  if [[ -n "${temporary_checksum}" && -e "${temporary_checksum}" ]]; then
    rm -f -- "${temporary_checksum}"
  fi

  # El checksum se publica primero y el dump funciona como marca de commit. Si
  # falla el segundo enlace, se retira solamente el checksum creado por esta
  # ejecucion; nunca se toca un archivo preexistente.
  if [[ -n "${published_checksum}" && -e "${published_checksum}" &&
        "${publication_complete}" != true ]]; then
    if [[ -z "${published_dump}" || -z "${temporary_dump}" ||
          ! -e "${published_dump}" || ! -e "${temporary_dump}" ||
          ! "${published_dump}" -ef "${temporary_dump}" ]]; then
      rm -f -- "${published_checksum}"
    fi
  fi
}

trap cleanup EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "No se encontro el comando requerido: $1"
}

canonical_path() {
  readlink -f -- "$1" 2>/dev/null || return 1
}

validate_alea_root() {
  [[ "${ALEA_ROOT}" =~ ^/docker/[A-Za-z0-9][A-Za-z0-9._-]*$ ]] ||
    fail "ALEA_ROOT debe ser un unico directorio hijo directo y seguro de /docker (por ejemplo, ${DEFAULT_ALEA_ROOT})."
  [[ -d /docker && ! -L /docker ]] ||
    fail "/docker debe existir como directorio y no puede ser un enlace simbolico."
  [[ -d "${ALEA_ROOT}" && ! -L "${ALEA_ROOT}" ]] ||
    fail "ALEA_ROOT debe existir como directorio y no puede ser un enlace simbolico: ${ALEA_ROOT}"
}

assert_path_within_root() {
  local candidate="$1"
  local root_real candidate_real

  root_real="$(canonical_path "${ALEA_ROOT}")" ||
    fail "No se pudo resolver ALEA_ROOT: ${ALEA_ROOT}"
  candidate_real="$(canonical_path "${candidate}")" ||
    fail "No se pudo resolver la ruta: ${candidate}"

  case "${candidate_real}" in
    "${root_real}" | "${root_real}"/*) ;;
    *) fail "La ruta sale de ALEA_ROOT: ${candidate_real}" ;;
  esac
}

service_is_running() {
  local service="$1"
  local container_id

  container_id="$("${COMPOSE[@]}" ps -q "${service}")"
  [[ -n "${container_id}" ]] || return 1
  [[ "$(docker inspect --format '{{.State.Running}}' "${container_id}")" == "true" ]]
}

acquire_operation_lock() {
  # Se bloquea el propio directorio canonico de respaldos: no hay una ruta de
  # lock configurable que pueda redirigirse fuera de ALEA_ROOT.
  exec 9<"${ALEA_BACKUP_DIR}" ||
    fail "No se pudo abrir el directorio para adquirir el bloqueo: ${ALEA_BACKUP_DIR}"
  flock --exclusive --nonblock "${OPERATION_LOCK_FD}" ||
    fail "Ya hay un respaldo o una restauracion en curso para ${ALEA_ROOT}."
}

validate_inherited_restore_lock() {
  local lock_target backup_dir_real

  [[ -e "/proc/self/fd/${OPERATION_LOCK_FD}" ]] ||
    fail "El descriptor interno de bloqueo no fue heredado."
  lock_target="$(canonical_path "/proc/self/fd/${OPERATION_LOCK_FD}")" ||
    fail "No se pudo resolver el descriptor interno de bloqueo."
  backup_dir_real="$(canonical_path "${ALEA_BACKUP_DIR}")" ||
    fail "No se pudo resolver el directorio de respaldos."
  [[ "${lock_target}" == "${backup_dir_real}" ]] ||
    fail "El descriptor interno no corresponde al directorio de respaldos."

  # En Linux, el lock pertenece a la descripcion de archivo abierta heredada.
  # Repetir flock sobre ella confirma que no se proporciono un descriptor ajeno
  # y conserva el mismo lock exclusivo que mantiene restore.sh.
  flock --exclusive --nonblock "${OPERATION_LOCK_FD}" ||
    fail "El descriptor interno no conserva el bloqueo exclusivo esperado."
}

case "$#" in
  0) ;;
  1)
    [[ "$1" == "${INTERNAL_LOCK_ARGUMENT}" ]] ||
      fail "backup.sh no acepta argumentos."
    inherited_restore_lock=true
    ;;
  *) fail "backup.sh no acepta argumentos." ;;
esac

require_command docker
require_command flock
require_command ln
require_command readlink
require_command mktemp
require_command sha256sum

validate_alea_root
[[ -d "${ALEA_APP_DIR}" ]] || fail "No existe ALEA_APP_DIR: ${ALEA_APP_DIR}"
[[ -r "${ALEA_ENV_FILE}" ]] || fail "No se puede leer el archivo de entorno: ${ALEA_ENV_FILE}"
[[ -f "${ALEA_COMPOSE_FILE}" ]] || fail "No existe el archivo Compose: ${ALEA_COMPOSE_FILE}"
[[ -d "${ALEA_BACKUP_DIR}" ]] || fail "No existe el directorio de respaldos: ${ALEA_BACKUP_DIR}"
[[ -w "${ALEA_BACKUP_DIR}" ]] || fail "No se puede escribir en: ${ALEA_BACKUP_DIR}"

assert_path_within_root "${ALEA_APP_DIR}"
assert_path_within_root "${ALEA_ENV_FILE}"
assert_path_within_root "${ALEA_COMPOSE_FILE}"
assert_path_within_root "${ALEA_BACKUP_DIR}"

if [[ "${inherited_restore_lock}" == true ]]; then
  validate_inherited_restore_lock
else
  acquire_operation_lock
fi

docker compose version >/dev/null
"${COMPOSE[@]}" config --quiet
service_is_running db || fail "El servicio db no esta en ejecucion."

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
candidate_index=0
while :; do
  backup_name="alea-postgres-${timestamp}.dump"
  if (( candidate_index > 0 )); then
    backup_name="alea-postgres-${timestamp}-${candidate_index}.dump"
  fi
  backup_path="${ALEA_BACKUP_DIR}/${backup_name}"
  checksum_path="${backup_path}.sha256"
  if [[ ! -e "${backup_path}" && ! -L "${backup_path}" &&
        ! -e "${checksum_path}" && ! -L "${checksum_path}" ]]; then
    break
  fi
  ((candidate_index += 1))
done

temporary_dump="$(mktemp "${ALEA_BACKUP_DIR}/.${backup_name}.partial.XXXXXX")"
temporary_checksum="$(mktemp "${ALEA_BACKUP_DIR}/.${backup_name}.sha256.partial.XXXXXX")"
chmod 0600 -- "${temporary_dump}" "${temporary_checksum}"

log "Creando respaldo consistente de PostgreSQL..."
if ! "${COMPOSE[@]}" exec -T db sh -eu -c '
  db_user="${POSTGRES_USER:-${DB_USER:-}}"
  db_name="${POSTGRES_DB:-${DB_NAME:-}}"
  db_password="${POSTGRES_PASSWORD:-${DB_PASSWORD:-}}"

  [ -n "${db_user}" ] || { echo "Usuario de base de datos no definido." >&2; exit 1; }
  [ -n "${db_name}" ] || { echo "Nombre de base de datos no definido." >&2; exit 1; }

  export PGPASSWORD="${db_password}"
  exec pg_dump \
    --username="${db_user}" \
    --dbname="${db_name}" \
    --format=custom \
    --compress=6 \
    --no-owner \
    --no-privileges
' >"${temporary_dump}"; then
  fail "pg_dump termino con error; no se publico ningun respaldo."
fi

[[ -s "${temporary_dump}" ]] || fail "pg_dump produjo un archivo vacio."

# pg_restore --list valida que el archivo sea un archive legible antes de
# publicarlo con su nombre definitivo.
"${COMPOSE[@]}" exec -T db pg_restore --list \
  <"${temporary_dump}" >/dev/null

checksum_output="$(sha256sum -- "${temporary_dump}")"
checksum_hash="${checksum_output%% *}"
[[ "${checksum_hash}" =~ ^[[:xdigit:]]{64}$ ]] ||
  fail "sha256sum devolvio un hash inesperado."
printf '%s  %s\n' "${checksum_hash}" "${backup_name}" >"${temporary_checksum}"

# Los hard links se crean en el mismo filesystem, son atomicos y fallan si el
# destino ya existe. El dump se hace visible al final, cuando su checksum ya
# esta completamente escrito.
if ! ln -- "${temporary_checksum}" "${checksum_path}"; then
  fail "El checksum definitivo ya existe o no pudo publicarse; no se sobrescribio: ${checksum_path}"
fi
published_checksum="${checksum_path}"

published_dump="${backup_path}"
if ! ln -- "${temporary_dump}" "${backup_path}"; then
  published_dump=""
  fail "El respaldo definitivo ya existe o no pudo publicarse; no se sobrescribio: ${backup_path}"
fi
publication_complete=true

rm -f -- "${temporary_dump}" "${temporary_checksum}"
temporary_dump=""
temporary_checksum=""

log "Respaldo completado: ${backup_path}"
log "Checksum SHA-256: ${checksum_path}"

# La ruta es la unica salida por stdout para que restore.sh pueda capturarla.
printf '%s\n' "${backup_path}"
