#!/usr/bin/env bash
set -euo pipefail
VERSION="${OPENFGA_VERSION:-1.22.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/bin" /tmp/openfga-dl
curl -fsSL -o /tmp/openfga-dl/openfga.tgz \
  "https://github.com/openfga/openfga/releases/download/v${VERSION}/openfga_${VERSION}_linux_amd64.tar.gz"
tar -xzf /tmp/openfga-dl/openfga.tgz -C /tmp/openfga-dl openfga
cp /tmp/openfga-dl/openfga "$ROOT/bin/openfga"
chmod +x "$ROOT/bin/openfga"
"$ROOT/bin/openfga" version
