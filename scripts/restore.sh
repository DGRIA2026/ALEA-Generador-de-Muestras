#!/usr/bin/env bash

set -euo pipefail

umask 077

readonly DEFAULT_ALEA_ROOT="/docker/alea"
readonly CONFIRMATION_PHRASE="RESTORE_ALEA"
readonly OPERATION_LOCK_FD=9
readonly INTERNAL_BACKUP_LOCK_ARGUMENT="--internal-inherited-restore-lock"

ALEA_ROOT="${ALEA_ROOT:-${DEFAULT_ALEA_ROOT}}"
ALEA_APP_DIR="${ALEA_APP_DIR:-${ALEA_ROOT}/app}"
ALEA_ENV_FILE="${ALEA_ENV_FILE:-${ALEA_ROOT}/config/alea.env}"
ALEA_COMPOSE_FILE="${ALEA_COMPOSE_FILE:-${ALEA_APP_DIR}/docker-compose.yml}"
ALEA_BACKUP_DIR="${ALEA_BACKUP_DIR:-${ALEA_ROOT}/backups/postgres}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

COMPOSE=(
  docker compose
  --env-file "${ALEA_ENV_FILE}"
  -f "${ALEA_COMPOSE_FILE}"
)

backend_was_running=false
backend_was_stopped=false
preventive_backup=""

log() {
  printf '[restore] %s\n' "$*" >&2
}

fail() {
  printf '[restore] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<EOF
Uso:
  bash scripts/restore.sh \\
    --backup /docker/alea/backups/postgres/ARCHIVO.dump \\
    --confirm ${CONFIRMATION_PHRASE}

La frase de confirmacion es obligatoria. Solo se aceptan archives .dump
ubicados realmente dentro de /docker/alea/backups/postgres.
EOF
}

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
  # Se bloquea el propio directorio canonico de respaldos. El descriptor 9 se
  # hereda exclusivamente por el backup preventivo y se valida en backup.sh.
  exec 9<"${ALEA_BACKUP_DIR}" ||
    fail "No se pudo abrir el directorio para adquirir el bloqueo: ${ALEA_BACKUP_DIR}"
  flock --exclusive --nonblock "${OPERATION_LOCK_FD}" ||
    fail "Ya hay un respaldo o una restauracion en curso para ${ALEA_ROOT}."
}

wait_for_backend() {
  local container_id status
  local attempts=60

  container_id="$("${COMPOSE[@]}" ps -q backend)"
  [[ -n "${container_id}" ]] || return 1

  while (( attempts > 0 )); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}")"
    case "${status}" in
      healthy | running) return 0 ;;
      exited | dead) return 1 ;;
    esac
    sleep 2
    ((attempts -= 1))
  done

  return 1
}

resume_backend() {
  local original_status=$?
  local final_status="${original_status}"

  trap - EXIT
  set +e

  if [[ "${backend_was_running}" == true && "${backend_was_stopped}" == true ]]; then
    log "Reiniciando backend..."
    if ! "${COMPOSE[@]}" start backend; then
      log "ERROR: no fue posible reiniciar backend."
      final_status=1
    elif ! wait_for_backend; then
      log "ERROR: backend no alcanzo un estado saludable despues del reinicio."
      final_status=1
    else
      log "Backend reiniciado y saludable."
    fi
  fi

  if (( original_status != 0 )); then
    if [[ -n "${preventive_backup}" ]]; then
      log "La restauracion fallo. Respaldo preventivo disponible en: ${preventive_backup}"
    else
      log "La restauracion fallo antes de crear el respaldo preventivo."
    fi
  fi

  exit "${final_status}"
}

[[ $# -eq 4 ]] || { usage; exit 2; }
[[ "$1" == "--backup" && "$3" == "--confirm" ]] || { usage; exit 2; }
backup_argument="$2"
confirmation="$4"
[[ "${confirmation}" == "${CONFIRMATION_PHRASE}" ]] ||
  fail "Confirmacion incorrecta. Debe ser exactamente: ${CONFIRMATION_PHRASE}"

require_command docker
require_command flock
require_command readlink
require_command sha256sum

validate_alea_root
[[ -d "${ALEA_APP_DIR}" ]] || fail "No existe ALEA_APP_DIR: ${ALEA_APP_DIR}"
[[ -r "${ALEA_ENV_FILE}" ]] || fail "No se puede leer el archivo de entorno: ${ALEA_ENV_FILE}"
[[ -f "${ALEA_COMPOSE_FILE}" ]] || fail "No existe el archivo Compose: ${ALEA_COMPOSE_FILE}"
[[ -d "${ALEA_BACKUP_DIR}" ]] || fail "No existe el directorio de respaldos: ${ALEA_BACKUP_DIR}"
[[ -f "${backup_argument}" ]] || fail "El respaldo no existe o no es un archivo regular: ${backup_argument}"
[[ ! -L "${backup_argument}" ]] || fail "No se permiten enlaces simbolicos como respaldo."
[[ -r "${backup_argument}" ]] || fail "El respaldo no es legible: ${backup_argument}"

assert_path_within_root "${ALEA_APP_DIR}"
assert_path_within_root "${ALEA_ENV_FILE}"
assert_path_within_root "${ALEA_COMPOSE_FILE}"
assert_path_within_root "${ALEA_BACKUP_DIR}"

backup_root_real="$(canonical_path "${ALEA_BACKUP_DIR}")" ||
  fail "No se pudo resolver el directorio de respaldos."
backup_real="$(canonical_path "${backup_argument}")" ||
  fail "No se pudo resolver la ruta del respaldo."

case "${backup_real}" in
  "${backup_root_real}"/*.dump) ;;
  *) fail "El respaldo debe ser .dump y permanecer dentro de ${backup_root_real}." ;;
esac

acquire_operation_lock

checksum_path="${backup_real}.sha256"
if [[ -e "${checksum_path}" ]]; then
  [[ -f "${checksum_path}" && ! -L "${checksum_path}" && -r "${checksum_path}" ]] ||
    fail "El checksum no es un archivo regular seguro: ${checksum_path}"
  log "Verificando checksum SHA-256..."

  checksum_lines=()
  mapfile -t checksum_lines <"${checksum_path}" ||
    fail "No se pudo leer el checksum: ${checksum_path}"
  [[ "${#checksum_lines[@]}" -eq 1 ]] ||
    fail "El checksum debe contener exactamente una linea."

  checksum_pattern='^([[:xdigit:]]{64}) ([ *])(.+)$'
  [[ "${checksum_lines[0]}" =~ ${checksum_pattern} ]] ||
    fail "La unica linea del checksum no tiene el formato SHA-256 esperado."
  expected_hash="${BASH_REMATCH[1],,}"
  checksum_filename="${BASH_REMATCH[3]}"
  backup_filename="${backup_real##*/}"
  [[ "${checksum_filename}" == "${backup_filename}" ]] ||
    fail "El checksum corresponde a '${checksum_filename}', no al respaldo seleccionado '${backup_filename}'."

  actual_hash_output="$(sha256sum -- "${backup_real}")"
  actual_hash="${actual_hash_output%% *}"
  actual_hash="${actual_hash,,}"
  [[ "${actual_hash}" =~ ^[[:xdigit:]]{64}$ ]] ||
    fail "sha256sum devolvio un hash inesperado."
  [[ "${actual_hash}" == "${expected_hash}" ]] ||
    fail "El checksum SHA-256 no coincide con el respaldo seleccionado."
else
  log "ADVERTENCIA: no existe ${checksum_path}; se validara solo el formato del archive."
fi

docker compose version >/dev/null
"${COMPOSE[@]}" config --quiet
service_is_running db || fail "El servicio db no esta en ejecucion."

log "Validando el archive con pg_restore --list..."
"${COMPOSE[@]}" exec -T db pg_restore --list \
  <"${backup_real}" >/dev/null || fail "El archivo no es un archive PostgreSQL valido."

if service_is_running backend; then
  backend_was_running=true
fi

trap resume_backend EXIT

if [[ "${backend_was_running}" == true ]]; then
  log "Deteniendo backend para impedir escrituras durante la restauracion..."
  # Se marca antes de detenerlo para que el trap intente arrancarlo incluso si
  # Docker devuelve un error despues de haber procesado la senal de parada.
  backend_was_stopped=true
  "${COMPOSE[@]}" stop --timeout 30 backend
fi

log "Creando respaldo preventivo antes de modificar la base de datos..."
preventive_backup="$(
  ALEA_ROOT="${ALEA_ROOT}" \
  ALEA_APP_DIR="${ALEA_APP_DIR}" \
  ALEA_ENV_FILE="${ALEA_ENV_FILE}" \
  ALEA_COMPOSE_FILE="${ALEA_COMPOSE_FILE}" \
  ALEA_BACKUP_DIR="${ALEA_BACKUP_DIR}" \
    bash "${SCRIPT_DIR}/backup.sh" "${INTERNAL_BACKUP_LOCK_ARGUMENT}"
)"
log "Respaldo preventivo creado: ${preventive_backup}"

log "Restaurando ${backup_real} en una sola transaccion..."
"${COMPOSE[@]}" exec -T db sh -eu -c '
  db_user="${POSTGRES_USER:-${DB_USER:-}}"
  db_name="${POSTGRES_DB:-${DB_NAME:-}}"
  db_password="${POSTGRES_PASSWORD:-${DB_PASSWORD:-}}"

  [ -n "${db_user}" ] || { echo "Usuario de base de datos no definido." >&2; exit 1; }
  [ -n "${db_name}" ] || { echo "Nombre de base de datos no definido." >&2; exit 1; }

  export PGPASSWORD="${db_password}"
  exec pg_restore \
    --username="${db_user}" \
    --dbname="${db_name}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --single-transaction
' <"${backup_real}"

log "Restauracion completada correctamente."
log "Respaldo preventivo conservado en: ${preventive_backup}"
