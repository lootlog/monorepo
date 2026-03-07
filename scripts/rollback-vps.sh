#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/install-vps.sh"

parse_args() {
  TARGET_RELEASE=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --release)
        [[ $# -ge 2 ]] || die "Missing value for --release"
        TARGET_RELEASE="$2"
        shift 2
        ;;
      -h|--help)
        cat <<'EOF'
Usage: rollback-vps.sh [--release <tag>]

Rolls back an existing self-hosted Lootlog installation to an already-downloaded release.

Options:
  --release <tag>  Roll back to a specific installed release tag
  -h, --help       Show this help
EOF
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

select_rollback_release() {
  local current_release
  current_release="$(get_active_release_name || true)"
  [[ -n "$current_release" ]] || die "Could not determine the active release."

  if [[ -n "$TARGET_RELEASE" ]]; then
    [[ "$TARGET_RELEASE" != "$current_release" ]] || die "Target rollback release is already active."
    [[ -d "$RELEASES_DIR/$TARGET_RELEASE" ]] || die "Release $TARGET_RELEASE is not installed on this server."
    LOOTLOG_RELEASE="$TARGET_RELEASE"
    return
  fi

  TARGET_RELEASE="$(resolve_previous_release_name "$current_release" || true)"
  [[ -n "$TARGET_RELEASE" ]] || die "No previous installed release available for rollback."
  LOOTLOG_RELEASE="$TARGET_RELEASE"
}

print_rollback_summary() {
  cat <<EOF

Lootlog rollback completed.

Active release:    $LOOTLOG_RELEASE
Previous release:  ${PREVIOUS_RELEASE:-none}
Current release:   $CURRENT_LINK

Useful commands:
  cd $CURRENT_LINK
  docker compose --env-file .env.production -f docker-compose.prod.yml ps
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
EOF
}

main_rollback() {
  parse_args "$@"

  require_root
  require_supported_os
  ensure_packages
  install_docker
  require_existing_installation
  load_existing_config
  select_rollback_release

  RELEASE_DIR="$RELEASES_DIR/$LOOTLOG_RELEASE"
  ensure_layout
  assert_domain_points_to_server "$APP_DOMAIN"
  write_env_files
  write_traefik_files
  run_deploy
  smoke_test
  activate_release
  save_install_env
  print_rollback_summary
}

main_rollback "$@"
