#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/install-vps.sh"

KEEP_COUNT=2
DRY_RUN=false

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --keep)
        [[ $# -ge 2 ]] || die "Missing value for --keep"
        KEEP_COUNT="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage: cleanup-vps.sh [--keep <count>] [--dry-run]

Removes old downloaded Lootlog releases from /opt/lootlog/releases.

Defaults:
  - always keeps the active release
  - always keeps the previous release if present
  - keeps at least 2 releases in total unless a higher --keep value is given

Options:
  --keep <count>  Minimum number of newest releases to keep in addition to protected active/previous releases
  --dry-run       Print what would be removed without deleting anything
  -h, --help      Show this help
EOF
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done

  [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]] || die "--keep must be a non-negative integer"
  (( KEEP_COUNT >= 2 )) || KEEP_COUNT=2
}

cleanup_releases() {
  local active_release previous_release
  active_release="$(get_active_release_name || true)"
  previous_release="$(resolve_previous_release_name "$active_release" || true)"

  [[ -n "$active_release" ]] || die "Could not determine the active release."

  mapfile -t all_releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' | sort -nr | awk '{print $2}')

  if [[ "${#all_releases[@]}" -le "$KEEP_COUNT" ]]; then
    log "Nothing to clean. Installed releases: ${#all_releases[@]}"
    return
  fi

  declare -A keep_map=()
  keep_map["$active_release"]=1
  if [[ -n "$previous_release" ]]; then
    keep_map["$previous_release"]=1
  fi

  local kept_count=0
  local release_name
  for release_name in "${all_releases[@]}"; do
    if [[ -n "${keep_map[$release_name]:-}" ]]; then
      continue
    fi

    if (( kept_count < KEEP_COUNT - ${#keep_map[@]} )); then
      keep_map["$release_name"]=1
      kept_count=$((kept_count + 1))
    fi
  done

  local removed_any=false
  for release_name in "${all_releases[@]}"; do
    if [[ -n "${keep_map[$release_name]:-}" ]]; then
      continue
    fi

    removed_any=true
    if [[ "$DRY_RUN" == true ]]; then
      printf 'Would remove %s\n' "$RELEASES_DIR/$release_name"
    else
      rm -rf "$RELEASES_DIR/$release_name"
      printf 'Removed %s\n' "$RELEASES_DIR/$release_name"
    fi
  done

  if [[ "$removed_any" == false ]]; then
    log "Nothing to clean."
  fi
}

main_cleanup() {
  parse_args "$@"

  require_root
  require_existing_installation
  load_existing_config
  cleanup_releases
}

main_cleanup "$@"
