#!/bin/bash
# Instalado em /usr/local/bin/deploy-code5-poll.sh, executado pelo
# deploy-code5-poll.timer: se a main remota tem commit ainda não publicado,
# publica. Mesmo padrão do appmercado e do appsalaodebeleza nesta VPS —
# existe porque os runners do GitHub não alcançam a porta 22 daqui (bloqueio
# de borda da Hostinger). Puxando de dentro, essa falha não acontece.
set -e

REPO="/opt/code5/app"
SHA_FILE="$REPO/.deployed-sha"
FAIL_FILE="$REPO/.deploy-failed-sha"

remote=$(git -C "$REPO" ls-remote origin refs/heads/main | cut -f1)
[ -z "$remote" ] && exit 0

atual=$(cat "$SHA_FILE" 2>/dev/null || echo "")
[ "$remote" = "$atual" ] && exit 0

# Commit que já falhou não é retentado a cada disparo; o próximo commit
# destrava. Sem isso, um erro vira uma tentativa a cada 3 minutos para sempre.
[ "$remote" = "$(cat "$FAIL_FILE" 2>/dev/null)" ] && exit 0

echo "main em $remote (publicado: ${atual:-nenhum}) — publicando"
set +e
/usr/local/bin/deploy-code5-landing.sh
codigo=$?
set -e

if [ "$codigo" -ne 0 ]; then
  printf '%s\n' "$remote" > "$FAIL_FILE"
  echo "falhou (código $codigo); este commit não será retentado"
  exit "$codigo"
fi

printf '%s\n' "$remote" > "$SHA_FILE"
rm -f "$FAIL_FILE"
echo "ok"
