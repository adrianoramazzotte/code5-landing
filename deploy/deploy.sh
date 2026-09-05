#!/usr/bin/env bash
# Deploy da landing page da Code5 Solutions na VPS Hostinger compartilhada.
#
#   ./deploy/deploy.sh            # envia os arquivos do site (uso do dia a dia)
#   ./deploy/deploy.sh --setup    # primeira vez: cria a pasta e instala o nginx
#   ./deploy/deploy.sh --cert     # emite o certificado (exige DNS já apontado)
#
# Pré-requisito: alias `vps-mercado` no ~/.ssh/config (já existe).
set -euo pipefail

HOST="vps-mercado"
DOMINIO="code5solutions.com.br"
RAIZ="/var/www/${DOMINIO}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

setup() {
  echo "==> criando ${RAIZ} e instalando o bloco temporário (HTTP)"
  ssh "$HOST" "mkdir -p '${RAIZ}' && chown -R www-data:www-data '${RAIZ}'"
  scp "${AQUI}/deploy/nginx/${DOMINIO}.http.conf" "${HOST}:/etc/nginx/sites-available/${DOMINIO}.conf"
  ssh "$HOST" "ln -sfn /etc/nginx/sites-available/${DOMINIO}.conf /etc/nginx/sites-enabled/${DOMINIO}.conf && nginx -t && systemctl reload nginx"
  echo "==> ok. Agora rode: $0            (envia os arquivos)"
  echo "                   $0 --cert     (depois que o DNS apontar para a VPS)"
}

cert() {
  echo "==> conferindo o DNS antes de chamar o certbot"
  ip_dns="$(dig +short A "${DOMINIO}" | tail -1)"
  ip_vps="$(ssh "$HOST" "curl -s --max-time 10 https://api.ipify.org")"
  echo "    ${DOMINIO} -> ${ip_dns:-<vazio>} | VPS -> ${ip_vps}"
  if [ "${ip_dns:-}" != "${ip_vps}" ]; then
    echo "!! O domínio ainda não aponta para a VPS. Corrija o DNS e tente de novo."
    echo "   (cuidado com o IP de parking da Hostinger — ver vps/README.md do xadrez)"
    exit 1
  fi
  ssh "$HOST" "certbot certonly --webroot -w '${RAIZ}' -d '${DOMINIO}' -d 'www.${DOMINIO}' --non-interactive --agree-tos -m adriano.ramazzotte@gmail.com"
  echo "==> instalando o bloco definitivo (HTTPS)"
  scp "${AQUI}/deploy/nginx/${DOMINIO}.conf" "${HOST}:/etc/nginx/sites-available/${DOMINIO}.conf"
  ssh "$HOST" "nginx -t && systemctl reload nginx"
  echo "==> pronto: https://${DOMINIO}"
}

publicar() {
  echo "==> enviando arquivos para ${HOST}:${RAIZ}"
  rsync -az --delete \
    --exclude '.git' --exclude 'deploy' --exclude 'README.md' --exclude '.gitignore' \
    "${AQUI}/" "${HOST}:${RAIZ}/"
  ssh "$HOST" "chown -R www-data:www-data '${RAIZ}'"
  echo "==> publicado."
}

case "${1:-}" in
  --setup) setup ;;
  --cert)  cert ;;
  "")      publicar ;;
  *) echo "uso: $0 [--setup|--cert]"; exit 1 ;;
esac
