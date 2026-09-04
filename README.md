# Code5 Solutions — Landing page

Landing page comercial estática (HTML + CSS + JS puro, sem build).
Linguagem visual inspirada em https://hyperframes.heygen.com/ — fundo escuro cinematográfico,
acento menta, tipografia display bem apertada e movimento discreto.

## Estrutura

```
index.html                  página inteira (nav, hero, serviços, multiplataforma, portfólio,
                            planos, processo, FAQ, contato, rodapé)
assets/css/styles.css       design system + responsivo + prefers-reduced-motion
assets/js/main.js           canvas dos estilhaços, reveal on scroll, contadores, menu, FAQ, formulário
assets/portfolio/*.jpeg     capturas reais dos 6 projetos (1440x900) + versões mobile usadas
                            na seção multiplataforma (mobile-*.jpeg)
```

## Rodar localmente

```bash
python3 -m http.server 8777
# abra http://localhost:8777
```

## Publicar

É site estático: serve em GitHub Pages, Netlify, Vercel, Cloudflare Pages ou qualquer hospedagem.
No GitHub Pages basta subir a pasta na branch `main` e apontar Pages para a raiz.

## O que trocar antes de ir ao ar

| Onde | O quê |
|---|---|
| `index.html` (hero, contato, rodapé) | `contato@code5solutions.com.br` pelo e-mail real |
| `index.html` (`wa.me/5500000000000`) | número real do WhatsApp comercial, formato `55DDDNÚMERO` |
| `index.html` (bloco `.stats`) | métricas do hero (`6 produtos`, `5 setores`, `24h`) se quiser outros números |
| `assets/js/main.js` (handler do `#form`) | hoje o formulário abre o cliente de e-mail; troque por Formspree/API própria |
| `index.html` (`og:` meta tags) | adicionar uma imagem `og:image` quando houver arte social |

## Atualizar as capturas do portfólio

As imagens são screenshots de 1440x900 dos sites em produção. Para atualizar, tire uma nova
captura na mesma proporção e substitua o arquivo correspondente em `assets/portfolio/`
mantendo o nome — o card não precisa de nenhuma alteração.

## Acessibilidade e performance

- Respeita `prefers-reduced-motion` (canvas desligado, reveals e animações neutralizadas).
- Canvas do hero pausa quando sai da viewport.
- Imagens com `loading="lazy"` e dimensões declaradas.

## Seção multiplataforma

A seção `#dispositivos` vende app/PWA usando capturas reais: notebook com o AppFightClub em
desktop e dois celulares com Meu Salão e MeuMercadoOn no layout mobile. As molduras dos aparelhos
são CSS puro (`.dev--laptop`, `.dev--phone`), então trocar o produto exibido é só trocar o `src`
das imagens em `index.html`.

## Cache do navegador

Ao editar o CSS, force o recarregamento com **Ctrl+Shift+R** — o navegador costuma manter
`styles.css` em cache e mostrar o layout antigo.
