#!/bin/bash
# Instala na VPS o deploy por polling da landing. Idempotente: pode rodar de
# novo depois de alterar qualquer script desta pasta.
#
# Uso, a partir da máquina do Adriano:
#   scp -r deploy/vps vps-mercado:/root/code5-vps && ssh vps-mercado 'bash /root/code5-vps/instalar.sh'
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL="https://github.com/adrianoramazzotte/code5-landing.git"
RAIZ="/var/www/code5solutions.com.br"

id code5 >/dev/null 2>&1 || useradd --system --home-dir /opt/code5 --shell /usr/sbin/nologin code5
mkdir -p /opt/code5

if [ ! -d /opt/code5/app/.git ]; then
  git clone --branch main "$REPO_URL" /opt/code5/app
fi
git config --global --add safe.directory /opt/code5/app
chown -R code5:code5 /opt/code5

mkdir -p "$RAIZ"
chown -R code5:www-data "$RAIZ"
chmod -R a+rX "$RAIZ"

install -m 755 "$AQUI/deploy-code5-landing.sh" /usr/local/bin/deploy-code5-landing.sh
install -m 755 "$AQUI/deploy-code5-poll.sh"    /usr/local/bin/deploy-code5-poll.sh
install -m 644 "$AQUI/deploy-code5-poll.service" /etc/systemd/system/deploy-code5-poll.service
install -m 644 "$AQUI/deploy-code5-poll.timer"   /etc/systemd/system/deploy-code5-poll.timer

systemctl daemon-reload
systemctl enable --now deploy-code5-poll.timer
echo "--- primeira execução ---"
systemctl start deploy-code5-poll.service
systemctl status deploy-code5-poll.service --no-pager -n 12 || true
