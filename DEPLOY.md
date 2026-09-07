# Deploy — code5solutions.com.br na VPS compartilhada

## O fluxo de trabalho

```
  dev  ──(pull request)──▶  main  ──(a VPS puxa em até 3 min)──▶  code5solutions.com.br
   │                         │
   └── workflow Validar      └── workflow Validar + Publicar
```

- **`dev`** é onde o trabalho acontece. Todo push roda o workflow **Validar**
  (estrutura do HTML, assets referenciados, sintaxe do JS). Nada vai ao ar.
- **`main`** é produção e é **protegida**: ninguém empurra commit direto nela.
  A única entrada é um pull request com o Validar verde.
- Assim que a `main` muda, a VPS publica sozinha.

### Publicar uma alteração

```bash
git checkout dev
# edite, teste local com: python3 -m http.server 8777
python3 scripts/validar.py          # mesma checagem que a pipeline faz
git commit -am "o que mudou" && git push

gh pr create --base main --head dev  # ou pelo site do GitHub
gh pr merge --merge                  # quando o check ficar verde
```

Em até 3 minutos o site está no ar. O workflow **Publicar** acompanha: ele
espera `https://code5solutions.com.br/version.txt` virar o SHA do commit e só
então fica verde — se não virar em 10 minutos, ele falha e te avisa.

## Como a publicação funciona por dentro

Quem envia os arquivos é a **própria VPS**, não o runner do GitHub: o firewall
de borda da Hostinger não deixa o GitHub chegar na porta 22 (é a mesma razão
documentada no `deploy-appmercado-poll.sh` da máquina). Então segue-se o padrão
já usado pelos outros apps daqui:

| Peça | Onde |
|---|---|
| Clone da `main` | `/opt/code5/app` (usuário `code5`) |
| Publicação | `/usr/local/bin/deploy-code5-landing.sh` — rsync para a raiz web |
| Verificação a cada 3 min | `deploy-code5-poll.timer` → `deploy-code5-poll.sh` |
| Marca de versão | `/version.txt` na raiz do site, com o SHA publicado |
| Fonte dos scripts | `deploy/vps/` neste repositório |

Um commit que falhar não é retentado a cada 3 minutos: fica registrado em
`.deploy-failed-sha` e o próximo commit destrava.

### Reinstalar ou atualizar os scripts da VPS

```bash
scp -r deploy/vps vps-mercado:/root/code5-vps
ssh vps-mercado 'bash /root/code5-vps/instalar.sh'
```

### Ver o que está acontecendo na VPS

```bash
ssh vps-mercado 'systemctl status deploy-code5-poll.service --no-pager -n 20'
ssh vps-mercado 'journalctl -u deploy-code5-poll.service --since "-1h" --no-pager'
```

### Publicar na marra (emergência)

`./deploy/deploy.sh` envia a sua cópia local direto para a VPS, sem passar pelo
Git. Serve para apagar incêndio; a fonte da verdade continua sendo a `main`, e
o próximo commit sobrescreve o que foi enviado assim.

## Infraestrutura

| | |
|---|---|
| VPS | `srv1657128.hstgr.cloud` — **179.199.133.118** (alias ssh `vps-mercado`) |
| Raiz do site | `/var/www/code5solutions.com.br` |
| Server block | `/etc/nginx/sites-available/code5solutions.com.br.conf` |
| Certificado | Let's Encrypt, webroot, apex + `www` (não é wildcard) |

## DNS (já configurado)

Na zona do domínio (Hostinger), apontando para a VPS — cuidado ao mexer: os
nameservers são os de parking da Hostinger, cujo IP padrão **não** é a VPS.

```
A    @      179.199.133.118
A    www    179.199.133.118
```

Confira antes de seguir: `dig +short A code5solutions.com.br` precisa devolver
`179.199.133.118`.

> Alternativa: mover a zona para a Cloudflare, como foi feito com os outros
> três domínios. Só vale a pena se quiser o mesmo método DNS-01 para todos —
> aqui não há subdomínio por cliente, então o webroot resolve.

## Primeira instalação (já feita em 05/09/2026)

```bash
./deploy/deploy.sh --setup   # pasta + bloco HTTP temporário, nginx -t, reload
./deploy/deploy.sh --cert    # certificado Let's Encrypt + bloco HTTPS final
scp -r deploy/vps vps-mercado:/root/code5-vps
ssh vps-mercado 'bash /root/code5-vps/instalar.sh'   # timer de publicação
```

O HTML é servido com `Cache-Control: no-cache`, então a mudança aparece no
primeiro F5; CSS/JS têm cache de 1h e as imagens, 30 dias.

## Segurança do que já está no ar

O bloco novo só responde por `code5solutions.com.br` e `www.` — nenhum
`server_name` existente muda. O script roda `nginx -t` antes de qualquer
`systemctl reload`, então uma configuração inválida não chega a ser aplicada.
