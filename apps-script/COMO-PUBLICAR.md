# Como ligar a planilha ao site

O site lê e grava tudo na planilha **Chá de Casa Nova - Vinícius (lista e confirmações)**, que está no seu Google Drive, na pasta *Luau da Casa Nova - Vinícius*. Para isso funcionar, a planilha precisa de um pequeno código publicado como "App da Web". São uns 5 minutos, e é melhor fazer pelo computador.

## 1. Colar o código

1. Abra a planilha no Google Planilhas.
2. No menu, clique em **Extensões → Apps Script**. Vai abrir uma aba nova com um arquivo chamado `Código.gs`.
3. Apague tudo o que estiver nesse arquivo.
4. Copie todo o conteúdo do arquivo [`Codigo.gs`](Codigo.gs) (no GitHub, botão **Copy raw file**) e cole no lugar.
5. Clique no ícone de disquete (**Salvar**). Se pedir um nome para o projeto, pode ser "Convite".

## 2. Publicar como App da Web

1. No canto superior direito, clique em **Implantar → Nova implantação**.
2. Clique na engrenagem ao lado de "Selecionar tipo" e escolha **App da Web**.
3. Preencha assim:
   - **Descrição:** Convite
   - **Executar como:** Eu (o seu e-mail)
   - **Quem pode acessar:** Qualquer pessoa
4. Clique em **Implantar**.
5. O Google vai pedir autorização. Clique em **Autorizar acesso** e escolha sua conta.
6. Vai aparecer o aviso **"O Google não verificou este app"**. É normal: o app é seu e só mexe nesta planilha. Clique em **Avançado** e depois em **Acessar Convite (não seguro)**, e por fim em **Permitir**.
7. Copie o **URL do App da Web** (começa com `https://script.google.com/macros/s/` e termina com `/exec`).

## 3. Mandar o link

Mande esse URL para o Claude na conversa. Ele coloca o endereço no arquivo `assets/js/config.js`, e o site sai do modo demonstração e passa a usar a planilha de verdade.

## Se o código mudar depois

Para atualizar sem trocar o link:

1. Cole o código novo em `Código.gs` e salve.
2. **Implantar → Gerenciar implantações**.
3. Clique no lápis (**Editar**), em **Versão** escolha **Nova versão** e clique em **Implantar**.

O URL continua o mesmo.

## O que cada aba faz

| Aba | Quem mexe | Para quê |
|---|---|---|
| Resumo | Ninguém (é automática) | Totais de presença e de presentes |
| Itens | Você | A lista, por setor (cada setor vira uma aba no site). Pode adicionar, apagar e mudar itens, quantidades e piadas. A coluna ID se preenche sozinha para itens novos |
| Reservas | O site | Quem reservou o quê e quantas unidades. Para liberar uma reserva, apague a linha ou troque a Situação para "cancelada" |
| Confirmações | O site | Quem vai, quem não vai, acompanhantes e recados |
| Configuração | Você | Endereço, bairro, cidade, data e nome do local (este só aparece para quem confirma presença) |

## Relatório do anfitrião

A página `relatorio.html` mostra presença, recados e a porcentagem de presentes garantidos, sem dizer o que cada um vai dar. Ela só abre com a chave que fica na linha "Chave do relatório" da aba Configuração, no formato:

`https://vartzzz.github.io/Convite-vinicius/relatorio.html#k=SUA_CHAVE`

Se o link vazar, troque a chave na planilha (letras e números, no mínimo 20) e o link antigo para de funcionar.
