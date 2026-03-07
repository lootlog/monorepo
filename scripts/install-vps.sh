#!/usr/bin/env bash
set -Eeuo pipefail

REPO="lootlog/lootlog"
INSTALL_ROOT="/opt/lootlog"
RELEASES_DIR="$INSTALL_ROOT/releases"
SHARED_DIR="$INSTALL_ROOT/shared"
CURRENT_LINK="$INSTALL_ROOT/current"
INSTALL_ENV="$SHARED_DIR/install.env"
DEPLOY_DIR="$CURRENT_LINK"
PREVIOUS_RELEASE="${PREVIOUS_RELEASE:-}"
ACTIVE_RELEASE="${ACTIVE_RELEASE:-}"

log() {
  printf '[lootlog] %s\n' "$*"
}

die() {
  printf '[lootlog] ERROR: %s\n' "$*" >&2
  exit 1
}

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    die "Run this installer as root. Example: curl -fsSL <script-url> | sudo bash"
  fi
}

require_supported_os() {
  if [[ ! -r /etc/os-release ]]; then
    die "Cannot detect operating system."
  fi

  # shellcheck disable=SC1091
  . /etc/os-release

  case "${ID:-}" in
    ubuntu|debian)
      ;;
    *)
      die "This installer supports Ubuntu and Debian only."
      ;;
  esac
}

ensure_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y \
    ca-certificates \
    coreutils \
    curl \
    dnsutils \
    gpg \
    jq \
    lsb-release \
    openssl \
    sed \
    tar
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi

  log "Installing Docker Engine and Docker Compose plugin"

  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/"$(. /etc/os-release && printf '%s' "$ID")"/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  local arch codename distro_id
  arch="$(dpkg --print-architecture)"
  codename="$(. /etc/os-release && printf '%s' "$VERSION_CODENAME")"
  distro_id="$(. /etc/os-release && printf '%s' "$ID")"

  cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${distro_id} ${codename} stable
EOF

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

load_existing_config() {
  if [[ -f "$INSTALL_ENV" ]]; then
    # shellcheck disable=SC1090
    . "$INSTALL_ENV"
  fi
}

get_active_release_name() {
  if [[ -L "$CURRENT_LINK" ]]; then
    basename "$(readlink -f "$CURRENT_LINK")"
    return
  fi

  if [[ -n "${LOOTLOG_RELEASE:-}" ]]; then
    printf '%s\n' "$LOOTLOG_RELEASE"
  fi
}

list_installed_releases() {
  [[ -d "$RELEASES_DIR" ]] || return 0
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
}

resolve_previous_release_name() {
  local current_release="${1:-}"

  if [[ -n "${PREVIOUS_RELEASE:-}" && "$PREVIOUS_RELEASE" != "$current_release" && -d "$RELEASES_DIR/$PREVIOUS_RELEASE" ]]; then
    printf '%s\n' "$PREVIOUS_RELEASE"
    return
  fi

  local candidate=""
  while IFS= read -r release_name; do
    [[ "$release_name" == "$current_release" ]] && continue
    candidate="$release_name"
  done < <(list_installed_releases)

  if [[ -n "$candidate" ]]; then
    printf '%s\n' "$candidate"
  fi
}

prompt_value() {
  local variable_name="$1"
  local prompt_text="$2"
  local default_value="$3"
  local secret="${4:-false}"
  local current_value="${!variable_name:-$default_value}"
  local input=""

  if [[ "$secret" == "true" ]]; then
    if [[ -n "$current_value" ]]; then
      read -r -s -p "$prompt_text [leave blank to keep current]: " input
      printf '\n'
      if [[ -z "$input" ]]; then
        printf -v "$variable_name" '%s' "$current_value"
      else
        printf -v "$variable_name" '%s' "$input"
      fi
      return
    fi

    while [[ -z "$input" ]]; do
      read -r -s -p "$prompt_text: " input
      printf '\n'
    done
    printf -v "$variable_name" '%s' "$input"
    return
  fi

  read -r -p "$prompt_text [$current_value]: " input
  if [[ -z "$input" ]]; then
    input="$current_value"
  fi
  printf -v "$variable_name" '%s' "$input"
}

generate_secret() {
  openssl rand -hex 32
}

default_if_empty() {
  local variable_name="$1"
  local fallback="$2"
  if [[ -z "${!variable_name:-}" ]]; then
    printf -v "$variable_name" '%s' "$fallback"
  fi
}

fetch_latest_release() {
  log "Resolving latest GitHub release"
  local release_json
  release_json="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
  LATEST_RELEASE_TAG="$(printf '%s' "$release_json" | jq -r '.tag_name')"
  LATEST_RELEASE_TARBALL="$(printf '%s' "$release_json" | jq -r '.tarball_url')"

  [[ -n "$LATEST_RELEASE_TAG" && "$LATEST_RELEASE_TAG" != "null" ]] || die "Could not determine latest release tag."
  [[ -n "$LATEST_RELEASE_TARBALL" && "$LATEST_RELEASE_TARBALL" != "null" ]] || die "Could not determine latest release tarball."
}

download_release() {
  local release_tag="$1"
  local tarball_url="$2"
  local release_dir="$RELEASES_DIR/$release_tag"

  mkdir -p "$RELEASES_DIR"

  if [[ ! -d "$release_dir" ]]; then
    log "Downloading release $release_tag"
    local archive
    archive="$(mktemp /tmp/lootlog-release.XXXXXX.tar.gz)"
    curl -fsSL "$tarball_url" -o "$archive"
    mkdir -p "$release_dir"
    tar -xzf "$archive" --strip-components=1 -C "$release_dir"
    rm -f "$archive"
  else
    log "Release $release_tag already downloaded"
  fi

  RELEASE_DIR="$release_dir"
}

escape_domain_regex() {
  printf '%s' "$1" | sed 's/\./\\\\./g'
}

resolve_public_ip() {
  curl -4fsSL https://api.ipify.org 2>/dev/null || true
}

assert_domain_points_to_server() {
  local domain="$1"
  local public_ip resolved_ips

  public_ip="$(resolve_public_ip)"
  if [[ -z "$public_ip" ]]; then
    log "Skipping DNS/IP verification because public IP lookup failed"
    return
  fi

  resolved_ips="$(getent ahostsv4 "$domain" | awk '{print $1}' | sort -u || true)"
  if ! printf '%s\n' "$resolved_ips" | grep -qx "$public_ip"; then
    die "DNS for $domain does not point to this server yet. Expected $public_ip, got: ${resolved_ips:-none}"
  fi
}

assert_ports_available() {
  if [[ -f "$INSTALL_ENV" ]]; then
    return
  fi

  local in_use
  in_use="$(ss -ltn '( sport = :80 or sport = :443 )' | awk 'NR > 1 {print}')"
  if [[ -n "$in_use" ]]; then
    die "Ports 80 and/or 443 are already in use. Free them before installing Lootlog."
  fi
}

ensure_layout() {
  mkdir -p "$SHARED_DIR/env" "$SHARED_DIR/traefik/acme"
  touch "$SHARED_DIR/traefik/acme/acme.json"
  chmod 600 "$SHARED_DIR/traefik/acme/acme.json"

  ln -sfn "$SHARED_DIR" "$RELEASE_DIR/.deploy"
  ln -sfn "$SHARED_DIR/.env.production" "$RELEASE_DIR/.env.production"
  DEPLOY_DIR="$RELEASE_DIR"
}

activate_release() {
  local previous_active
  previous_active="$(get_active_release_name || true)"

  ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
  DEPLOY_DIR="$CURRENT_LINK"
  ACTIVE_RELEASE="$LOOTLOG_RELEASE"

  if [[ -n "$previous_active" && "$previous_active" != "$LOOTLOG_RELEASE" ]]; then
    PREVIOUS_RELEASE="$previous_active"
  elif [[ -z "${PREVIOUS_RELEASE:-}" ]]; then
    PREVIOUS_RELEASE="$(resolve_previous_release_name "$LOOTLOG_RELEASE" || true)"
  fi
}

require_existing_installation() {
  [[ -f "$INSTALL_ENV" ]] || die "Lootlog is not installed yet. Run scripts/install-vps.sh first."
}

save_install_env() {
  cat >"$INSTALL_ENV" <<EOF
APP_DOMAIN=$APP_DOMAIN
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
LOOTLOG_RELEASE=$LOOTLOG_RELEASE
ACTIVE_RELEASE=${ACTIVE_RELEASE:-$LOOTLOG_RELEASE}
PREVIOUS_RELEASE=${PREVIOUS_RELEASE:-}
STORAGE_MODE=$STORAGE_MODE
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
DISCORD_BOT_PERMISSIONS=$DISCORD_BOT_PERMISSIONS
ADMIN_ACCOUNT_IDS=$ADMIN_ACCOUNT_IDS
RESERVATIONS_CARDS_URL=$RESERVATIONS_CARDS_URL
MAPS_API_URL=$MAPS_API_URL
AUTH_SECRET=$AUTH_SECRET
INTERNAL_SERVICE_AUTH_SECRET=$INTERNAL_SERVICE_AUTH_SECRET
FORWARDED_AUTH_SIGNATURE_SECRET=$FORWARDED_AUTH_SIGNATURE_SECRET
USERS_DB_USER=$USERS_DB_USER
USERS_DB_PASSWORD=$USERS_DB_PASSWORD
USERS_DB_NAME=$USERS_DB_NAME
LOOTLOG_DB_USER=$LOOTLOG_DB_USER
LOOTLOG_DB_PASSWORD=$LOOTLOG_DB_PASSWORD
LOOTLOG_DB_NAME=$LOOTLOG_DB_NAME
BATTLE_LOG_DB_USER=$BATTLE_LOG_DB_USER
BATTLE_LOG_DB_PASSWORD=$BATTLE_LOG_DB_PASSWORD
BATTLE_LOG_DB_NAME=$BATTLE_LOG_DB_NAME
ACTIVITY_LOG_DB_USER=$ACTIVITY_LOG_DB_USER
ACTIVITY_LOG_DB_PASSWORD=$ACTIVITY_LOG_DB_PASSWORD
ACTIVITY_LOG_DB_NAME=$ACTIVITY_LOG_DB_NAME
RABBITMQ_DEFAULT_USER=$RABBITMQ_DEFAULT_USER
RABBITMQ_DEFAULT_PASS=$RABBITMQ_DEFAULT_PASS
REDIS_PASSWORD=$REDIS_PASSWORD
MEILISEARCH_MASTER_KEY=$MEILISEARCH_MASTER_KEY
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
R2_ENDPOINT=$R2_ENDPOINT
R2_REGION=$R2_REGION
R2_BUCKET_NAME=$R2_BUCKET_NAME
EOF
}

write_env_files() {
  local app_domain_regex public_origin rabbitmq_uri
  app_domain_regex="$(escape_domain_regex "$APP_DOMAIN")"
  public_origin="https://$APP_DOMAIN"
  rabbitmq_uri="amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}@rabbitmq:5672"

  cat >"$SHARED_DIR/.env.production" <<EOF
APP_DOMAIN=$APP_DOMAIN
APP_DOMAIN_REGEX=$app_domain_regex
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
COMPOSE_PROFILES=$([[ "$STORAGE_MODE" == "minio" ]] && printf 'minio')
RELEASE_VERSION=$LOOTLOG_RELEASE
VITE_API_URL=${public_origin}/api/lootlog
VITE_SEARCH_API_URL=${public_origin}/api/search
VITE_AUTH_SERVICE_URL=${public_origin}/api/auth
VITE_GATEWAY_URL=${public_origin}
VITE_GATEWAY_SOCKET_PATH=
VITE_BATTLELOG_API_URL=${public_origin}/api/battlelog
VITE_ACTIVITY_API_URL=${public_origin}/api/activity
VITE_ADDON_INSTALL_URL=${public_origin}/addon/@lootlog/entrypoint.user.js
VITE_BATTLELOG_PUBLIC_URL=${public_origin}
VITE_DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
VITE_DISCORD_BOT_PERMISSIONS=$DISCORD_BOT_PERMISSIONS
VITE_LOOTLOG_APP_URL=${public_origin}
NEXT_PUBLIC_AUTH_SERVICE_URL=${public_origin}/api/auth
NEXT_PUBLIC_ADDON_URL=${public_origin}/addon/@lootlog/entrypoint.user.js
GAME_CLIENT_URL=${public_origin}/addon/@lootlog/game-client.user.js
EOF

  cat >"$SHARED_DIR/env/rabbitmq.env" <<EOF
RABBITMQ_DEFAULT_USER=$RABBITMQ_DEFAULT_USER
RABBITMQ_DEFAULT_PASS=$RABBITMQ_DEFAULT_PASS
EOF

  cat >"$SHARED_DIR/env/redis.env" <<EOF
REDIS_PASSWORD=$REDIS_PASSWORD
EOF

  cat >"$SHARED_DIR/env/meilisearch.env" <<EOF
MEILI_MASTER_KEY=$MEILISEARCH_MASTER_KEY
EOF

  cat >"$SHARED_DIR/env/auth-db.env" <<EOF
POSTGRES_DB=$USERS_DB_NAME
POSTGRES_USER=$USERS_DB_USER
POSTGRES_PASSWORD=$USERS_DB_PASSWORD
EOF

  cat >"$SHARED_DIR/env/api-db.env" <<EOF
POSTGRES_DB=$LOOTLOG_DB_NAME
POSTGRES_USER=$LOOTLOG_DB_USER
POSTGRES_PASSWORD=$LOOTLOG_DB_PASSWORD
EOF

  cat >"$SHARED_DIR/env/battlelog-db.env" <<EOF
POSTGRES_DB=$BATTLE_LOG_DB_NAME
POSTGRES_USER=$BATTLE_LOG_DB_USER
POSTGRES_PASSWORD=$BATTLE_LOG_DB_PASSWORD
EOF

  cat >"$SHARED_DIR/env/activity-db.env" <<EOF
POSTGRES_DB=$ACTIVITY_LOG_DB_NAME
POSTGRES_USER=$ACTIVITY_LOG_DB_USER
POSTGRES_PASSWORD=$ACTIVITY_LOG_DB_PASSWORD
EOF

  cat >"$SHARED_DIR/env/auth.env" <<EOF
PORT=4001
ENV=prod
SERVICE_NAME=auth
TRUSTED_ORIGINS=${public_origin},https://*.margonem.pl,https://*.margonem.com
COOKIE_DOMAIN=$APP_DOMAIN
COOKIE_PREFIX=prod
ADMIN_ACCOUNT_IDS=$ADMIN_ACCOUNT_IDS
AUTH_SECRET=$AUTH_SECRET
INTERNAL_SERVICE_AUTH_SECRET=$INTERNAL_SERVICE_AUTH_SECRET
FORWARDED_AUTH_SIGNATURE_SECRET=$FORWARDED_AUTH_SIGNATURE_SECRET
APP_URL=${public_origin}/api/auth
POSTGRESQL_PORT=5432
POSTGRESQL_HOST=auth-db
POSTGRESQL_USER=$USERS_DB_USER
POSTGRESQL_PASSWORD=$USERS_DB_PASSWORD
POSTGRESQL_DATABASE=$USERS_DB_NAME
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_NODE_RESOURCE_DETECTORS=env,host,os,process
OTEL_TRACES_EXPORTER=otlp
SERVICE_NAMESPACE=selfhosted
EOF

  cat >"$SHARED_DIR/env/search.env" <<EOF
PORT=4002
ENV=prod
SERVICE_NAME=search
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=$MEILISEARCH_MASTER_KEY
RABBITMQ_URI=$rabbitmq_uri
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_NODE_RESOURCE_DETECTORS=env,host,os,process
OTEL_TRACES_EXPORTER=otlp
SERVICE_NAMESPACE=selfhosted
EOF

  cat >"$SHARED_DIR/env/api.env" <<EOF
PORT=4003
ENV=prod
SERVICE_NAME=api
POSTGRESQL_CONNECTION_URI=postgresql://${LOOTLOG_DB_USER}:${LOOTLOG_DB_PASSWORD}@api-db:5432/${LOOTLOG_DB_NAME}
AXIOM_TOKEN=
AXIOM_DATASET=
OPTIMIZE_API_KEY=
RABBITMQ_URI=$rabbitmq_uri
REDIS_USERNAME=default
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379
AUTH_SERVICE_URL=${public_origin}/api/auth
AUTH_INTERNAL_URL=http://auth:4001
AUTH_JWKS_URI=http://auth:4001/idp/jwks
INTERNAL_SERVICE_AUTH_SECRET=$INTERNAL_SERVICE_AUTH_SECRET
FORWARDED_AUTH_SIGNATURE_SECRET=$FORWARDED_AUTH_SIGNATURE_SECRET
RESERVATIONS_CARDS_URL=$RESERVATIONS_CARDS_URL
MAPS_API_URL=$MAPS_API_URL
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_NODE_RESOURCE_DETECTORS=env,host,os,process
OTEL_TRACES_EXPORTER=otlp
SERVICE_NAMESPACE=selfhosted
EOF

  cat >"$SHARED_DIR/env/gateway.env" <<EOF
PORT=4004
ENV=prod
SERVICE_NAME=gateway
API_URL=http://api:4003
AUTH_SERVICE_URL=${public_origin}/api/auth
AUTH_JWKS_URI=http://auth:4001/idp/jwks
RABBITMQ_URI=$rabbitmq_uri
REDIS_USERNAME=default
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379
FORWARDED_AUTH_SIGNATURE_SECRET=$FORWARDED_AUTH_SIGNATURE_SECRET
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_NODE_RESOURCE_DETECTORS=env,host,os,process
OTEL_TRACES_EXPORTER=otlp
SERVICE_NAMESPACE=selfhosted
EOF

  cat >"$SHARED_DIR/env/battlelog.env" <<EOF
PORT=4005
ENV=prod
SERVICE_NAME=battlelog-service
POSTGRESQL_CONNECTION_URI=postgresql://${BATTLE_LOG_DB_USER}:${BATTLE_LOG_DB_PASSWORD}@battlelog-db:5432/${BATTLE_LOG_DB_NAME}
AXIOM_TOKEN=
AXIOM_DATASET=
REDIS_USERNAME=default
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379
AUTH_SERVICE_URL=${public_origin}/api/auth
AUTH_JWKS_URI=http://auth:4001/idp/jwks
FORWARDED_AUTH_SIGNATURE_SECRET=$FORWARDED_AUTH_SIGNATURE_SECRET
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
R2_ENDPOINT=$R2_ENDPOINT
R2_REGION=$R2_REGION
R2_BUCKET_NAME=$R2_BUCKET_NAME
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_NODE_RESOURCE_DETECTORS=env,host,os,process
OTEL_TRACES_EXPORTER=otlp
SERVICE_NAMESPACE=selfhosted
EOF

  cat >"$SHARED_DIR/env/activity.env" <<EOF
PORT=4027
ENV=prod
SERVICE_NAME=activity-service
APP_VERSION=$LOOTLOG_RELEASE
POSTGRESQL_CONNECTION_URI=postgresql://${ACTIVITY_LOG_DB_USER}:${ACTIVITY_LOG_DB_PASSWORD}@activity-db:5432/${ACTIVITY_LOG_DB_NAME}
AXIOM_TOKEN=
AXIOM_DATASET=
RABBITMQ_URI=$rabbitmq_uri
REDIS_USERNAME=default
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379
AUTH_SERVICE_URL=${public_origin}/api/auth
AUTH_JWKS_URI=http://auth:4001/idp/jwks
FORWARDED_AUTH_SIGNATURE_SECRET=$FORWARDED_AUTH_SIGNATURE_SECRET
API_SERVICE_URL=http://api:4003
EOF

  cat >"$SHARED_DIR/env/discord-bot.env" <<EOF
PORT=4008
ENV=prod
SERVICE_NAME=discord-bot
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
DISCORD_DEVELOPMENT_GUILD_ID=
RABBITMQ_URI=$rabbitmq_uri
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_NODE_RESOURCE_DETECTORS=env,host,os,process
OTEL_TRACES_EXPORTER=otlp
SERVICE_NAMESPACE=selfhosted
EOF

  cat >"$SHARED_DIR/env/storage.env" <<EOF
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
R2_BUCKET_NAME=$R2_BUCKET_NAME
EOF
}

render_template() {
  local source_file="$1"
  local destination_file="$2"
  local app_domain_regex escaped_domain escaped_email

  escaped_domain="$(printf '%s' "$APP_DOMAIN" | sed 's/[&|]/\\&/g')"
  escaped_email="$(printf '%s' "$LETSENCRYPT_EMAIL" | sed 's/[&|]/\\&/g')"
  app_domain_regex="$(escape_domain_regex "$APP_DOMAIN" | sed 's/[&|]/\\&/g')"

  sed \
    -e "s|{{APP_DOMAIN}}|$escaped_domain|g" \
    -e "s|{{LETSENCRYPT_EMAIL}}|$escaped_email|g" \
    -e "s|{{APP_DOMAIN_REGEX}}|$app_domain_regex|g" \
    "$source_file" >"$destination_file"
}

write_traefik_files() {
  render_template "$RELEASE_DIR/traefik/prod/traefik.static.template.yml" "$SHARED_DIR/traefik/static.yml"
  render_template "$RELEASE_DIR/traefik/prod/traefik.dynamic.template.yml" "$SHARED_DIR/traefik/dynamic.yml"
}

compose_cmd() {
  local deploy_dir="${DEPLOY_DIR:-$CURRENT_LINK}"
  local args=(
    docker compose
    --project-name lootlog
    --env-file "$deploy_dir/.env.production"
    -f "$deploy_dir/docker-compose.prod.yml"
  )

  if [[ "$STORAGE_MODE" == "minio" ]]; then
    args+=(--profile minio)
  fi

  "${args[@]}" "$@"
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"
  local delay="${3:-5}"
  local host_header

  host_header="$(printf '%s' "$APP_DOMAIN:443:127.0.0.1")"

  for ((i = 1; i <= attempts; i++)); do
    if curl --silent --show-error --fail --resolve "$host_header" "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

collect_inputs() {
  prompt_value APP_DOMAIN "Domain for Lootlog" "${APP_DOMAIN:-}"
  prompt_value LETSENCRYPT_EMAIL "Let's Encrypt email" "${LETSENCRYPT_EMAIL:-}"
  prompt_value DISCORD_CLIENT_ID "Discord OAuth client ID" "${DISCORD_CLIENT_ID:-}"
  prompt_value DISCORD_CLIENT_SECRET "Discord OAuth client secret" "${DISCORD_CLIENT_SECRET:-}" true
  prompt_value DISCORD_BOT_TOKEN "Discord bot token" "${DISCORD_BOT_TOKEN:-}" true
  prompt_value DISCORD_BOT_PERMISSIONS "Discord bot permissions" "${DISCORD_BOT_PERMISSIONS:-268435456}"
  prompt_value ADMIN_ACCOUNT_IDS "Admin account IDs (comma separated, optional)" "${ADMIN_ACCOUNT_IDS:-}"
  prompt_value RESERVATIONS_CARDS_URL "Reservations cards URL (optional)" "${RESERVATIONS_CARDS_URL:-}"
  prompt_value MAPS_API_URL "Maps API URL (optional)" "${MAPS_API_URL:-}"
  prompt_value STORAGE_MODE "Storage mode (minio or external)" "${STORAGE_MODE:-minio}"

  STORAGE_MODE="$(printf '%s' "$STORAGE_MODE" | tr '[:upper:]' '[:lower:]')"
  [[ "$STORAGE_MODE" == "minio" || "$STORAGE_MODE" == "external" ]] || die "Storage mode must be 'minio' or 'external'."

  default_if_empty AUTH_SECRET "$(generate_secret)"
  default_if_empty INTERNAL_SERVICE_AUTH_SECRET "$(generate_secret)"
  default_if_empty FORWARDED_AUTH_SIGNATURE_SECRET "$(generate_secret)"
  default_if_empty USERS_DB_USER "lootlog_auth"
  default_if_empty USERS_DB_PASSWORD "$(generate_secret)"
  default_if_empty USERS_DB_NAME "lootlog_users"
  default_if_empty LOOTLOG_DB_USER "lootlog_api"
  default_if_empty LOOTLOG_DB_PASSWORD "$(generate_secret)"
  default_if_empty LOOTLOG_DB_NAME "lootlog"
  default_if_empty BATTLE_LOG_DB_USER "lootlog_battlelog"
  default_if_empty BATTLE_LOG_DB_PASSWORD "$(generate_secret)"
  default_if_empty BATTLE_LOG_DB_NAME "battlelog"
  default_if_empty ACTIVITY_LOG_DB_USER "lootlog_activity"
  default_if_empty ACTIVITY_LOG_DB_PASSWORD "$(generate_secret)"
  default_if_empty ACTIVITY_LOG_DB_NAME "activity"
  default_if_empty RABBITMQ_DEFAULT_USER "lootlog"
  default_if_empty RABBITMQ_DEFAULT_PASS "$(generate_secret)"
  default_if_empty REDIS_PASSWORD "$(generate_secret)"
  default_if_empty MEILISEARCH_MASTER_KEY "$(generate_secret)"
  default_if_empty MINIO_ROOT_USER "lootlog"
  default_if_empty MINIO_ROOT_PASSWORD "$(generate_secret)"
  default_if_empty R2_BUCKET_NAME "battlelog"

  if [[ "$STORAGE_MODE" == "minio" ]]; then
    R2_ACCESS_KEY_ID="$MINIO_ROOT_USER"
    R2_SECRET_ACCESS_KEY="$MINIO_ROOT_PASSWORD"
    R2_ENDPOINT="http://minio:9000"
    R2_REGION="us-east-1"
  else
    prompt_value R2_ENDPOINT "External S3-compatible endpoint" "${R2_ENDPOINT:-}"
    prompt_value R2_REGION "External storage region" "${R2_REGION:-auto}"
    prompt_value R2_BUCKET_NAME "External storage bucket" "${R2_BUCKET_NAME:-battlelog}"
    prompt_value R2_ACCESS_KEY_ID "External storage access key" "${R2_ACCESS_KEY_ID:-}" true
    prompt_value R2_SECRET_ACCESS_KEY "External storage secret key" "${R2_SECRET_ACCESS_KEY:-}" true
  fi
}

select_release() {
  prompt_value LOOTLOG_RELEASE "Release version to deploy" "${LOOTLOG_RELEASE:-$LATEST_RELEASE_TAG}"
  set_release_tarball
}

set_release_tarball() {
  if [[ "$LOOTLOG_RELEASE" == "$LATEST_RELEASE_TAG" ]]; then
    RELEASE_TARBALL="$LATEST_RELEASE_TARBALL"
  else
    RELEASE_TARBALL="https://api.github.com/repos/${REPO}/tarball/${LOOTLOG_RELEASE}"
  fi
}

run_deploy() {
  log "Starting infrastructure"
  compose_cmd up -d rabbitmq redis meilisearch auth-db api-db battlelog-db activity-db
  if [[ "$STORAGE_MODE" == "minio" ]]; then
    compose_cmd up -d minio
    compose_cmd run --rm minio-init
  fi

  log "Building application images"
  DOCKER_BUILDKIT=1 compose_cmd build \
    auth-migrate api-migrate battlelog-migrate activity-migrate \
    web landing game-client auth search api gateway battlelog-service activity discord-bot

  log "Running database migrations"
  compose_cmd run --rm auth-migrate
  compose_cmd run --rm api-migrate
  compose_cmd run --rm battlelog-migrate
  compose_cmd run --rm activity-migrate

  log "Starting application services"
  compose_cmd up -d traefik web landing game-client auth search api gateway battlelog-service activity discord-bot
}

smoke_test() {
  log "Waiting for TLS and public routes"
  wait_for_url "https://$APP_DOMAIN/api/auth/healthz" 60 5 || die "Auth service did not become reachable over HTTPS."
  wait_for_url "https://$APP_DOMAIN/" 30 5 || die "Landing page did not become reachable over HTTPS."
  wait_for_url "https://$APP_DOMAIN/addon/@lootlog/entrypoint.user.js" 30 5 || die "Game client entrypoint is not reachable."
}

print_summary() {
  cat <<EOF

Lootlog is installed.

URLs:
  App:              https://$APP_DOMAIN
  Auth:             https://$APP_DOMAIN/api/auth
  API:              https://$APP_DOMAIN/api/lootlog
  Search:           https://$APP_DOMAIN/api/search
  Battlelog:        https://$APP_DOMAIN/api/battlelog
  Activity:         https://$APP_DOMAIN/api/activity
  Addon installer:  https://$APP_DOMAIN/addon/@lootlog/entrypoint.user.js

Deployment files:
  Release:          $CURRENT_LINK
  Shared config:    $SHARED_DIR
  Compose env:      $CURRENT_LINK/.env.production

Useful commands:
  cd $CURRENT_LINK
  docker compose --env-file .env.production -f docker-compose.prod.yml ps
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f traefik
EOF
}

main() {
  require_root
  require_supported_os
  ensure_packages
  install_docker

  mkdir -p "$SHARED_DIR"
  load_existing_config
  fetch_latest_release
  select_release
  download_release "$LOOTLOG_RELEASE" "$RELEASE_TARBALL"
  ensure_layout
  collect_inputs
  assert_domain_points_to_server "$APP_DOMAIN"
  assert_ports_available
  save_install_env
  write_env_files
  write_traefik_files
  run_deploy
  smoke_test
  activate_release
  save_install_env
  print_summary
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
