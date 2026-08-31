#!/bin/sh
set -eu

fail() {
  echo "Error de configuracion del frontend: $*" >&2
  exit 1
}

normalize_path() {
  raw_path=$1
  default_path=$2

  if [ -z "$raw_path" ]; then
    raw_path=$default_path
  fi

  case "$raw_path" in
    /*) normalized_path=$raw_path ;;
    *) normalized_path=/$raw_path ;;
  esac

  normalized_path=$(printf '%s' "$normalized_path" | sed 's#//*#/#g')

  while [ "$normalized_path" != "/" ] && [ "${normalized_path%/}" != "$normalized_path" ]; do
    normalized_path=${normalized_path%/}
  done

  printf '%s' "$normalized_path"
}

validate_path() {
  path_name=$1
  path_value=$2

  if [ "$path_value" = "/" ]; then
    return
  fi

  if ! printf '%s\n' "$path_value" | grep -Eq '^(/[A-Za-z0-9._~-]+)+$'; then
    fail "$path_name debe ser una ruta URL sin query ni fragmento (ejemplo: /ruta-app)."
  fi

  if printf '%s\n' "$path_value" | grep -Eq '(^|/)\.{1,2}(/|$)'; then
    fail "$path_name no admite segmentos punto (.) o punto doble (..)."
  fi
}

normalize_api_base_url() {
  raw_url=$1

  if [ -z "$raw_url" ]; then
    printf '%s' "$API_BASE_PATH"
    return
  fi

  case "$raw_url" in
    http://*|https://*)
      if ! printf '%s\n' "$raw_url" | grep -Eq '^https?://([A-Za-z0-9-]+\.)*[A-Za-z0-9-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~-]+)*/?$'; then
        fail "API_BASE_URL absoluta debe ser una URL http(s) sin query, fragmento ni credenciales."
      fi
      while [ "${raw_url%/}" != "$raw_url" ]; do
        raw_url=${raw_url%/}
      done
      printf '%s' "$raw_url"
      ;;
    /*)
      normalized_url=$(normalize_path "$raw_url" "$API_BASE_PATH")
      validate_path API_BASE_URL "$normalized_url"
      printf '%s' "$normalized_url"
      ;;
    *)
      fail "API_BASE_URL debe ser una ruta relativa que empiece con / o una URL http(s) absoluta."
      ;;
  esac
}

if [ "${API_BASE_PATH+x}" = x ] && [ -z "$API_BASE_PATH" ]; then
  fail "API_BASE_PATH no puede estar vacio."
fi

BASE_PATH=$(normalize_path "${BASE_PATH:-}" /)
API_BASE_PATH=$(normalize_path "${API_BASE_PATH:-/api}" /api)

validate_path BASE_PATH "$BASE_PATH"
validate_path API_BASE_PATH "$API_BASE_PATH"

if [ "$API_BASE_PATH" = "/" ]; then
  fail "API_BASE_PATH no puede ser la raiz /."
fi

if [ "$API_BASE_PATH" = "$BASE_PATH" ]; then
  fail "API_BASE_PATH no puede ser igual a BASE_PATH."
fi

if [ "$BASE_PATH" = "/_alea_health" ] || [ "$API_BASE_PATH" = "/_alea_health" ]; then
  fail "BASE_PATH y API_BASE_PATH no pueden usar la ruta reservada /_alea_health."
fi

if [ "$BASE_PATH" = "/" ]; then
  RUNTIME_CONFIG_URI=/runtime-config.js
  FRONTEND_ASSETS_PATH=/assets
  nginx_template=/opt/alea/nginx.root.conf.template
else
  RUNTIME_CONFIG_URI=$BASE_PATH/runtime-config.js
  FRONTEND_ASSETS_PATH=$BASE_PATH/assets
  nginx_template=/opt/alea/nginx.subpath.conf.template
fi

if [ "$API_BASE_PATH" = "$RUNTIME_CONFIG_URI" ] || [ "$API_BASE_PATH" = "$FRONTEND_ASSETS_PATH" ]; then
  fail "API_BASE_PATH entra en conflicto con una ruta reservada del frontend."
fi

BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL:-http://backend:3001}
while [ "${BACKEND_INTERNAL_URL%/}" != "$BACKEND_INTERNAL_URL" ]; do
  BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL%/}
done

if ! printf '%s\n' "$BACKEND_INTERNAL_URL" | grep -Eq '^https?://[A-Za-z0-9._-]+(:[0-9]{1,5})?$'; then
  fail "BACKEND_INTERNAL_URL debe ser un origen http(s) interno sin path, query ni fragmento."
fi

API_BASE_URL=$(normalize_api_base_url "${API_BASE_URL:-}")

export BASE_PATH API_BASE_PATH API_BASE_URL BACKEND_INTERNAL_URL RUNTIME_CONFIG_URI

nginx_runtime_dir=/tmp/alea-nginx
frontend_runtime_dir=/tmp/alea-runtime
mkdir -p \
  "$nginx_runtime_dir/conf.d" \
  "$nginx_runtime_dir/client_temp" \
  "$nginx_runtime_dir/proxy_temp" \
  "$nginx_runtime_dir/fastcgi_temp" \
  "$nginx_runtime_dir/uwsgi_temp" \
  "$nginx_runtime_dir/scgi_temp" \
  "$frontend_runtime_dir"

envsubst '${BASE_PATH} ${API_BASE_PATH} ${BACKEND_INTERNAL_URL} ${RUNTIME_CONFIG_URI}' \
  < "$nginx_template" \
  > "$nginx_runtime_dir/conf.d/default.conf"

envsubst '${BASE_PATH} ${API_BASE_PATH} ${API_BASE_URL}' \
  < /opt/alea/runtime-config.js.template \
  > "$frontend_runtime_dir/runtime-config.js"

nginx -t
exec "$@"
