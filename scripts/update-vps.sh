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
Usage: update-vps.sh [--release <tag>]

Updates an existing self-hosted Lootlog installation.

Options:
  --release <tag>  Deploy a specific GitHub release tag instead of the latest release
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

print_update_summary() {
  cat <<EOF

Lootlog is updated.

Active release:    $LOOTLOG_RELEASE
Install root:      $INSTALL_ROOT
Current release:   $CURRENT_LINK

Useful commands:
  cd $CURRENT_LINK
  docker compose --env-file .env.production -f docker-compose.prod.yml ps
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
EOF
}

main_update() {
  parse_args "$@"

  require_root
  require_supported_os
  ensure_packages
  install_docker
  require_existing_installation
  load_existing_config
  fetch_latest_release

  if [[ -n "$TARGET_RELEASE" ]]; then
    LOOTLOG_RELEASE="$TARGET_RELEASE"
  else
    LOOTLOG_RELEASE="$LATEST_RELEASE_TAG"
  fi

  set_release_tarball
  download_release "$LOOTLOG_RELEASE" "$RELEASE_TARBALL"
  ensure_layout
  assert_domain_points_to_server "$APP_DOMAIN"
  save_install_env
  write_env_files
  write_traefik_files
  run_deploy
  smoke_test
  activate_release
  print_update_summary
}

main_update "$@"
