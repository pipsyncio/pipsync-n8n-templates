#!/usr/bin/env bash
set -euo pipefail

readonly N8N_SMOKE_IMAGE="${N8N_SMOKE_IMAGE:-n8nio/n8n:2.36.7}"
readonly N8N_SMOKE_CONTAINER="pipsync-n8n-import-smoke-${RANDOM}-${RANDOM}"
readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  docker rm -f "${N8N_SMOKE_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

command -v docker >/dev/null 2>&1 || {
  echo "Docker is required for the optional n8n import smoke." >&2
  exit 1
}

docker create \
  --name "${N8N_SMOKE_CONTAINER}" \
  "${N8N_SMOKE_IMAGE}" \
  import:workflow --separate --input=/workflows >/dev/null

docker cp "${REPOSITORY_ROOT}/workflows" "${N8N_SMOKE_CONTAINER}:/workflows"
docker start --attach "${N8N_SMOKE_CONTAINER}"
