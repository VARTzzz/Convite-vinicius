# Luau da Casa Nova do Vinícius

Convite digital do chá de casa nova do Vinícius: sábado, 24/10/2026, às 15h.

O site tem o convite, a contagem regressiva, a lista de presentes com reserva (sem presente repetido) e a confirmação de presença. O nome do local, o mapa e o botão de agenda só aparecem para quem confirma presença.

- **Site:** página estática publicada pelo GitHub Pages.
- **Dados:** uma planilha do Google, ligada ao site por um Apps Script ([como publicar](apps-script/COMO-PUBLICAR.md)).

## Estrutura

```
index.html                  página única do convite
assets/css/style.css        visual (cores e fontes ficam nas variáveis do :root)
assets/js/config.js         endereço da planilha (API_URL) e data padrão
assets/js/api.js            conversa com a planilha e modo demonstração
assets/js/lista-demo.js     cópia da lista usada só no modo demonstração
assets/js/app.js            interface e animações
assets/img/                 figurinhas do Vinícius, prévia do WhatsApp e ícones
assets/vendor/              GSAP, ScrollTrigger, SplitText, Lenis e canvas-confetti
assets/fonts/               Bricolage Grotesque e Shrikhand (hospedadas aqui)
apps-script/Codigo.gs       backend que roda dentro da planilha
ferramentas/                página usada para gerar a imagem de prévia do WhatsApp
```

## Modo demonstração

Enquanto `API_URL` estiver vazio em `assets/js/config.js`, o site funciona com dados de exemplo e nada é salvo (aparece um aviso amarelo no topo). Também dá para forçar com `?demo=1` no endereço.

Para testar os estados especiais no modo demonstração:

- `?conflito=1`: toda reserva dá "alguém foi mais rápido".
- `?falha=1`: a lista não carrega e aparece a tela de erro.

## Publicar no GitHub Pages

Em **Settings → Pages**, em "Build and deployment", escolha **Deploy from a branch**, o branch **convite** e a pasta **/ (root)**, e salve. Em cerca de um minuto o site fica em:

https://vartzzz.github.io/Convite-vinicius/
