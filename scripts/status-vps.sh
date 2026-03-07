#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/install-vps.sh"

print_release_list() {
  local release_name
  while IFS= read -r release_name; do
    [[ -n "$release_name" ]] || continue
    if [[ "$release_name" == "${ACTIVE_RELEASE:-}" ]]; then
      printf '  - %s (active)\n' "$release_name"
    elif [[ "$release_name" == "${PREVIOUS_RELEASE:-}" ]]; then
      printf '  - %s (previous)\n' "$release_name"
    else
      printf '  - %s\n' "$release_name"
    fi
  done < <(list_installed_releases)
}

main_status() {
  require_root
  require_existing_installation
  load_existing_config

  ACTIVE_RELEASE="${ACTIVE_RELEASE:-$(get_active_release_name || true)}"
  PREVIOUS_RELEASE="${PREVIOUS_RELEASE:-$(resolve_previous_release_name "$ACTIVE_RELEASE" || true)}"

  cat <<EOF
Lootlog VPS status

Install root:      $INSTALL_ROOT
Current symlink:   $CURRENT_LINK
Active release:    ${ACTIVE_RELEASE:-unknown}
Previous release:  ${PREVIOUS_RELEASE:-none}
Domain:            ${APP_DOMAIN:-unknown}
Storage mode:      ${STORAGE_MODE:-unknown}

Installed releases:
EOF

  print_release_list

  printf '\nDocker Compose services:\n'
  compose_cmd ps
}

main_status "$@"
