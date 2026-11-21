#!/bin/sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo 'Install Node.js 22 or later, then run this launcher again.'; exit 1; }
(sleep 1 && open http://localhost:4173) &
exec node server.js
