#!/usr/bin/env bash

set -euo pipefail

umask 027

readonly DEFAULT_ALEA_ROOT="/docker/alea"
ALEA_ROOT="${ALEA_ROOT:-${DEFAULT_ALEA_ROOT}}"
ALEA_OWNER="${ALEA_OWNER:-${SUDO_USER:-$(id -un)}}"
ALEA_GROUP="${ALEA_GROUP:-$(id -gn "${ALEA_OWNER}" 2>/dev/null || true)}"

log() {
  printf '[prepare-server] %s\n' "$*"
}

fail() {
  printf '[prepare-server] ERROR: %s\n' "$*" >&2
  exit 1
}

validate_root() {
  [[ "${ALEA_ROOT}" =~ ^/docker/[A-Za-z0-9][A-Za-z0-9._-]*$ ]] ||
    fail "ALEA_ROOT debe ser un unico directorio hijo directo y seguro de /docker (por ejemplo, ${DEFAULT_ALEA_ROOT}). Valor recibido: ${ALEA_ROOT}"
  [[ -d /docker && ! -L /docker ]] ||
    fail "/docker debe existir como directorio y no puede ser un enlace simbolico."
  [[ ! -L "${ALEA_ROOT}" ]] ||
    fail "ALEA_ROOT no puede ser un enlace simbolico: ${ALEA_ROOT}"
}

validate_identity() {
  id "${ALEA_OWNER}" >/dev/null 2>&1 ||
    fail "El usuario indicado por ALEA_OWNER no existe: ${ALEA_OWNER}"

  [[ -n "${ALEA_GROUP}" ]] ||
    fail "No fue posible determinar ALEA_GROUP para ${ALEA_OWNER}."

  if ! getent group "${ALEA_GROUP}" >/dev/null 2>&1 &&
    [[ ! "${ALEA_GROUP}" =~ ^[0-9]+$ ]]; then
    fail "El grupo indicado por ALEA_GROUP no existe: ${ALEA_GROUP}"
  fi
}

ensure_directory() {
  local path="$1"
  local mode="$2"

  if [[ -e "${path}" || -L "${path}" ]]; then
    [[ -d "${path}" && ! -L "${path}" ]] ||
      fail "La ruta existe pero no es un directorio regular: ${path}"
    log "Se conserva el directorio existente: ${path}"
    return
  fi

  install -d \
    -m "${mode}" \
    -o "${ALEA_OWNER}" \
    -g "${ALEA_GROUP}" \
    -- "${path}"
  log "Directorio creado (${mode}, ${ALEA_OWNER}:${ALEA_GROUP}): ${path}"
}

validate_root
validate_identity

# Se crean solamente rutas pertenecientes a este proyecto. Los directorios ya
# existentes se conservan sin cambiar contenido, permisos ni propietario.
ensure_directory "${ALEA_ROOT}" 0750
ensure_directory "${ALEA_ROOT}/app" 0750
ensure_directory "${ALEA_ROOT}/config" 0750
ensure_directory "${ALEA_ROOT}/database" 0750
ensure_directory "${ALEA_ROOT}/database/postgres" 0700
ensure_directory "${ALEA_ROOT}/backups" 0750
ensure_directory "${ALEA_ROOT}/backups/postgres" 0700

log "Estructura preparada sin eliminar ni sobrescribir contenido existente."
log "Siguiente paso: crear ${ALEA_ROOT}/config/alea.env con modo 0600."
