#!/bin/bash
# Aplica na VPS o conteúdo da branch main deste repositório.
#
# Instalado em /usr/local/bin/deploy-code5-landing.sh e chamado pelo
# deploy-code5-poll.sh. Site estático: não há build nem container — o deploy
# é um rsync do clone para a raiz servida pelo nginx.
set -euo pipefail

REPO="/opt/code5/app"
RAIZ="/var/www/code5solutions.com.br"

git -C "$REPO" fetch --quiet origin main
git -C "$REPO" reset --hard --quiet origin/main
sha=$(git -C "$REPO" rev-parse HEAD)

rsync -a --delete \
  --exclude '.git*' --exclude 'deploy' --exclude 'scripts' \
  --exclude 'README.md' --exclude 'DEPLOY.md' \
  "$REPO/" "$RAIZ/"

# Marca de versão: é o que a pipeline do GitHub consulta para saber que o
# commit dela chegou no ar. Precisa vir DEPOIS do rsync (que tem --delete).
printf '%s\n' "$sha" > "$RAIZ/version.txt"

chmod -R a+rX "$RAIZ"
echo "publicado $sha em $RAIZ"
