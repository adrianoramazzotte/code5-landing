# Deploy — code5solutions.com.br na VPS compartilhada

A landing é **estática**: o nginx nativo da VPS serve os arquivos direto de
`/var/www/code5solutions.com.br`. Não sobe container, não usa `proxy_pass` e
**não consome porta nenhuma** da faixa reservada em
`appSaaSClubeXadrez/DEFINICOES-DOCS/PORTAS-VPS.md` — por isso não há linha nova
a criar na tabela de portas, só a rota nova de domínio.

| | |
|---|---|
| VPS | `srv1657128.hstgr.cloud` — **179.199.133.118** (alias ssh `vps-mercado`) |
| Raiz do site | `/var/www/code5solutions.com.br` |
| Server block | `/etc/nginx/sites-available/code5solutions.com.br.conf` |
| Certificado | Let's Encrypt, webroot, apex + `www` (não é wildcard) |

## Passo 0 — DNS (você, no painel da Hostinger)

Hoje `code5solutions.com.br` está nos nameservers de **parking**
(`atlas/hyperion.dns-parking.com`), que respondem por um IP que **não** é a VPS
— é a armadilha descrita no runbook do xadrez. Crie/corrija na zona:

```
A    @      179.199.133.118
A    www    179.199.133.118
```

Confira antes de seguir: `dig +short A code5solutions.com.br` precisa devolver
`179.199.133.118`.

> Alternativa: mover a zona para a Cloudflare, como foi feito com os outros
> três domínios. Só vale a pena se quiser o mesmo método DNS-01 para todos —
> aqui não há subdomínio por cliente, então o webroot resolve.

## Passo 1 — primeira instalação

```bash
./deploy/deploy.sh --setup   # cria a pasta + bloco HTTP temporário, nginx -t, reload
./deploy/deploy.sh           # envia os arquivos
./deploy/deploy.sh --cert    # emite o certificado e troca pelo bloco HTTPS final
```

O `--cert` só chama o certbot depois de conferir que o domínio já resolve para
o IP da VPS — contra o IP de parking a emissão falharia.

## Passo 2 — deploys seguintes

```bash
./deploy/deploy.sh
```

`rsync --delete` espelha `index.html` + `assets/` na VPS (ignora `.git`,
`deploy/`, `README.md`). O HTML vai com `Cache-Control: no-cache`, então a
mudança aparece no primeiro F5; CSS/JS têm cache de 1h e as imagens, 30 dias.

## Segurança do que já está no ar

O bloco novo só responde por `code5solutions.com.br` e `www.` — nenhum
`server_name` existente muda. O script roda `nginx -t` antes de qualquer
`systemctl reload`, então uma configuração inválida não chega a ser aplicada.
