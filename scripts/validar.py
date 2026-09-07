#!/usr/bin/env python3
"""Confere a landing antes de qualquer publicação.

Roda no CI (branches dev e main) e também dá para rodar na mão:

    python3 scripts/validar.py

Erro faz o processo sair com código 1 — na pipeline, isso barra o deploy.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HTML = RAIZ / "index.html"

erros: list[str] = []
avisos: list[str] = []


def erro(msg: str) -> None:
    erros.append(msg)


def aviso(msg: str) -> None:
    avisos.append(msg)


if not HTML.exists():
    print("ERRO: index.html não existe.")
    sys.exit(1)

html = HTML.read_text(encoding="utf-8")

# 1. Estrutura mínima da página
if "<title>" not in html:
    erro("index.html sem <title>.")
if 'lang="pt-BR"' not in html:
    aviso("A tag <html> não declara lang=\"pt-BR\".")
if 'name="description"' not in html:
    aviso("Falta a meta description (o Google usa esse texto no resultado).")

# 2. Todo arquivo local referenciado precisa existir
referencias = set(re.findall(r'(?:src|href)="((?!https?:|mailto:|#|data:)[^"]+)"', html))
for ref in sorted(referencias):
    if not (RAIZ / ref).exists():
        erro(f"Arquivo referenciado no HTML não existe: {ref}")

# 3. CSS e JS não podem estar vazios
for caminho in ("assets/css/styles.css", "assets/js/main.js"):
    arquivo = RAIZ / caminho
    if not arquivo.exists():
        erro(f"Arquivo obrigatório ausente: {caminho}")
    elif arquivo.stat().st_size < 500:
        erro(f"{caminho} está suspeito de vazio ({arquivo.stat().st_size} bytes).")

# 4. Nada de contato de exemplo indo para produção
for marcador, descricao in {
    "5500000000000": "número de WhatsApp de exemplo",
    "seu@email": "e-mail de exemplo",
    "lorem ipsum": "texto de preenchimento",
}.items():
    if marcador.lower() in html.lower():
        erro(f"O HTML ainda tem {descricao} ({marcador!r}).")

# "todo" aparece legitimamente em "Xadrez para Todos": só marcação em caixa alta conta.
for marcacao in ("TODO", "FIXME", "XXX"):
    if re.search(rf"\b{marcacao}\b", html):
        erro(f"O HTML ainda tem uma marcação de pendência ({marcacao}).")

# 4b. O contato oficial é o único que pode aparecer — nada de e-mail pessoal no ar
CONTATO = "contato@code5solutions.com.br"
PLACEHOLDERS = {"voce@empresa.com.br"}  # texto de exemplo do campo do formulário
PADRAO_EMAIL = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"

no_html = set(re.findall(PADRAO_EMAIL, html)) - PLACEHOLDERS
if CONTATO not in no_html:
    erro(f"O HTML não mostra o contato oficial ({CONTATO}).")
for outro in sorted(no_html - {CONTATO}):
    erro(f"E-mail que não é o contato oficial aparece no HTML: {outro}")

js = RAIZ / "assets" / "js" / "main.js"
if js.exists():
    for destino in sorted(set(re.findall(rf"mailto:({PADRAO_EMAIL})", js.read_text(encoding="utf-8")))):
        if destino != CONTATO:
            erro(f"O main.js envia para um e-mail que não é o contato oficial: {destino}")

# 5. Os links do portfólio precisam abrir em aba nova, sem vazar referrer
for m in re.finditer(r'<a class="work[^"]*"[^>]*>', html):
    tag = m.group(0)
    if 'target="_blank"' in tag and "noopener" not in tag:
        erro("Card do portfólio com target=_blank sem rel=noopener.")

# 6. As imagens do portfólio existem e têm tamanho plausível
portfolio = sorted((RAIZ / "assets" / "portfolio").glob("*.jpeg"))
if len(portfolio) < 6:
    erro(f"Esperava ao menos 6 capturas em assets/portfolio/, encontrei {len(portfolio)}.")
for img in portfolio:
    if img.stat().st_size < 10_000:
        erro(f"Captura possivelmente corrompida: {img.name} ({img.stat().st_size} bytes)")

for msg in avisos:
    print(f"aviso: {msg}")
for msg in erros:
    print(f"ERRO: {msg}")

total_kb = sum(f.stat().st_size for f in RAIZ.rglob("*") if f.is_file() and ".git" not in f.parts) // 1024
print(f"\n{len(referencias)} referências locais conferidas · {len(portfolio)} capturas · {total_kb} KB no total")
print("FALHOU" if erros else "OK — pode publicar")
sys.exit(1 if erros else 0)
