/*
 * Comunicação com a planilha (Apps Script) e modo demonstração.
 * Expõe window.LUAU_API com: dados(), reservar(), cancelar(), confirmar().
 */
(function () {
  'use strict';

  const cfg = window.CONVITE || {};
  const params = new URLSearchParams(location.search);
  const DEMO = params.get('demo') === '1' || !cfg.API_URL;

  const guardar = {
    ler(chave) {
      try { return localStorage.getItem(chave); } catch (_) { return null; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, valor); } catch (_) { /* navegação privada */ }
    },
    apagar(chave) {
      try { localStorage.removeItem(chave); } catch (_) { /* navegação privada */ }
    },
  };

  function novoCodigo() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
  }

  let codigo = guardar.ler('luau.codigo');
  if (!codigo || !/^[A-Za-z0-9-]{8,64}$/.test(codigo)) {
    codigo = novoCodigo();
    guardar.gravar('luau.codigo', codigo);
  }

  function falha(tipo, mensagem) {
    const e = new Error(mensagem || 'Algo deu errado.');
    e.codigo = tipo;
    return e;
  }

  // -------------------------------------------------------------------------
  // Planilha de verdade

  async function requisitar(url, opcoes) {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 25000);
    try {
      const resposta = await fetch(url, Object.assign({ signal: controle.signal, redirect: 'follow' }, opcoes));
      if (!resposta.ok) throw falha('rede', 'Sem conexão com a planilha.');
      const json = await resposta.json();
      if (!json.ok) throw falha(json.erro || 'erro', json.mensagem);
      return json;
    } catch (e) {
      if (e && e.codigo) throw e;
      throw falha('rede', 'Sem conexão com a planilha.');
    } finally {
      clearTimeout(limite);
    }
  }

  function enviar(corpo) {
    return requisitar(cfg.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({}, corpo, { codigo: codigo })),
    });
  }

  const real = {
    dados() {
      const url = cfg.API_URL + '?acao=dados&codigo=' + encodeURIComponent(codigo) + '&t=' + Date.now();
      return requisitar(url, { method: 'GET' });
    },
    reservar(item, nome) {
      return enviar({ acao: 'reservar', item: item, nome: nome });
    },
    cancelar(item) {
      return enviar({ acao: 'cancelar', item: item });
    },
    confirmar(dados) {
      return enviar(Object.assign({ acao: 'confirmar' }, dados));
    },
  };

  // -------------------------------------------------------------------------
  // Modo demonstração (sem planilha): guarda tudo só neste navegador

  const ITENS_DEMO = [
    ['i01', 'Cozinha', 'Jogo de panelas', 1, 'Para provar que miojo não é a única receita.'],
    ['i02', 'Cozinha', 'Frigideira antiaderente', 1, 'Para o ovo sair inteiro. Pelo menos uma vez.'],
    ['i03', 'Cozinha', 'Facas e tábua de corte', 1, 'Cortar tomate com faca de pão nunca mais.'],
    ['i04', 'Cozinha', 'Utensílios (concha, espátula e escumadeira)', 1, 'Mexer a panela com garfo já deu.'],
    ['i05', 'Cozinha', 'Potes herméticos', 2, 'Para a marmita que ele jura que vai levar para o trabalho.'],
    ['i06', 'Cozinha', 'Assadeiras', 1, 'Bolo, lasanha ou só um pão de alho. O importante é sonhar.'],
    ['i07', 'Cozinha', 'Escorredor de macarrão', 1, 'Escorrer macarrão segurando a tampa é esporte radical.'],
    ['i08', 'Cozinha', 'Panos de prato', 3, 'Item simples, impacto gigante. Igual a você.'],
    ['i09', 'Cozinha', 'Abridor de garrafas e saca-rolhas', 1, 'Item essencial para qualquer luau. Prioridade máxima.'],
    ['i10', 'Cozinha', 'Garrafa térmica', 1, 'Café quente o dia inteiro. Disposição, aí já é com ele.'],
    ['i11', 'Cozinha', 'Liquidificador', 1, 'Vitamina de manhã, caipirinha à noite. Ninguém julga.'],
    ['i12', 'Cozinha', 'Sanduicheira', 1, 'Misto-quente às 2h da manhã: o verdadeiro símbolo da vida adulta.'],
    ['i13', 'Cozinha', 'Air fryer', 1, 'Ele vai chamar de “meu bebê”. Já aviso.'],
    ['i14', 'Mesa', 'Jogo de pratos', 1, 'Para parar de comer direto da panela. Ou pelo menos ter a opção.'],
    ['i15', 'Mesa', 'Jogo de talheres', 1, 'Garfo de plástico do delivery não é coleção.'],
    ['i16', 'Mesa', 'Copos', 2, 'Porque visita não vai beber no gargalo. Né?'],
    ['i17', 'Mesa', 'Taças', 2, 'Para brindar a casa nova com classe. Pelo menos no primeiro brinde.'],
    ['i18', 'Mesa', 'Canecas', 2, 'Uma para o café, outra para a visita. Ou as duas para o café.'],
    ['i19', 'Mesa', 'Jogo americano', 1, 'Para a mesa parecer de revista. Até a primeira refeição.'],
    ['i20', 'Mesa', 'Travessas e saladeira', 1, 'A salada é opcional. A travessa, não.'],
    ['i21', 'Banheiro', 'Jogo de toalhas', 2, 'Secar com camiseta nunca mais.'],
    ['i22', 'Banheiro', 'Tapete de banheiro', 1, 'Para sair do banho sem patinar.'],
    ['i23', 'Banheiro', 'Kit de acessórios (porta-sabonete e porta-escova)', 1, 'Escova de dente em copo de requeijão: hora de evoluir.'],
    ['i24', 'Banheiro', 'Lixeira', 1, 'Glamour zero, utilidade infinita.'],
    ['i25', 'Quarto', 'Jogo de cama', 2, 'Um na cama, outro na máquina. O ciclo da vida.'],
    ['i26', 'Quarto', 'Travesseiros', 2, 'Para dormir tranquilo depois do primeiro boleto da casa nova.'],
    ['i27', 'Quarto', 'Edredom ou manta', 1, 'Para o friozinho e para maratonar série enrolado.'],
    ['i28', 'Sala', 'Manta para sofá', 1, 'Sofá sem manta é só um banco caro.'],
    ['i29', 'Sala', 'Almofadas', 2, 'Para o sofá parecer de catálogo.'],
    ['i30', 'Sala', 'Planta com vaso', 1, 'De preferência uma que sobreviva a uns esquecimentos.'],
    ['i31', 'Sala', 'Porta-retratos', 1, 'Sugestão: coloque uma foto sua dentro antes de entregar.'],
    ['i32', 'Sala', 'Luminária', 1, 'Luz baixinha e clima de luau o ano inteiro.'],
    ['i33', 'Limpeza e lavanderia', 'Varal', 1, 'Cadeira com roupa pendurada não é varal. A gente sabe.'],
    ['i34', 'Limpeza e lavanderia', 'Cesto de roupa', 1, 'Para a montanha de roupa ter endereço fixo.'],
    ['i35', 'Limpeza e lavanderia', 'Kit vassoura, rodo e pá', 1, 'Pouca gente escolhe, mas é o que mais faz falta. Seja a pessoa madura do grupo.'],
    ['i36', 'Limpeza e lavanderia', 'Balde e prendedores', 1, 'Kit básico de sobrevivência doméstica.'],
    ['i37', 'Limpeza e lavanderia', 'Ferro de passar', 1, 'Otimismo em forma de eletrodoméstico.'],
    ['i38', 'Utilidades', 'Kit de ferramentas', 1, 'Para pendurar quadro torto com muita confiança.'],
    ['i39', 'Utilidades', 'Extensão e filtro de linha', 1, 'Porque a tomada está sempre do lado errado do cômodo.'],
  ];

  const CHAVE_DEMO = 'luau.demo.v1';

  function estadoDemo() {
    let s = null;
    try { s = JSON.parse(guardar.ler(CHAVE_DEMO) || 'null'); } catch (_) { s = null; }
    if (!s) {
      s = {
        outros: { i01: 1, i08: 1, i13: 1, i21: 1, i35: 0 },
        minhas: {},
        eu: null,
        confirmados: [
          { nome: 'Bruna', acompanhantes: 1 },
          { nome: 'Rafa', acompanhantes: 0 },
          { nome: 'Tia Cida', acompanhantes: 2 },
          { nome: 'Léo', acompanhantes: 0 },
        ],
      };
    }
    return s;
  }

  function salvarDemo(s) {
    guardar.gravar(CHAVE_DEMO, JSON.stringify(s));
  }

  function respostaDemo(s) {
    const itens = ITENS_DEMO.map(([id, categoria, nome, quantidade, piada]) => {
      const meu = !!s.minhas[id];
      const reservados = Math.min(quantidade, (s.outros[id] || 0) + (meu ? 1 : 0));
      return { id, categoria, nome, piada, quantidade, reservados, meu };
    });
    const confirmados = s.confirmados.slice();
    if (s.eu && s.eu.vai) confirmados.push({ nome: s.eu.nome, acompanhantes: s.eu.acompanhantes });
    return {
      ok: true,
      evento: { data: cfg.DATA_PADRAO, endereco: 'Rua do Exemplo, 123', bairro: 'Bairro Exemplo', cidade: 'Sua Cidade' },
      itens,
      confirmados,
      totalPessoas: confirmados.reduce((t, c) => t + 1 + c.acompanhantes, 0),
      eu: { confirmacao: s.eu },
      local: s.eu && s.eu.vai
        ? {
          nome: 'Bar de Exemplo',
          maps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Rua do Exemplo, 123'),
          waze: 'https://waze.com/ul?q=' + encodeURIComponent('Rua do Exemplo, 123') + '&navigate=yes',
        }
        : null,
    };
  }

  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

  const demo = {
    async dados() {
      await pausa(900);
      if (params.get('falha') === '1') throw falha('rede', 'Sem conexão com a planilha.');
      return respostaDemo(estadoDemo());
    },
    async reservar(id, nome) {
      await pausa(1100);
      const s = estadoDemo();
      const item = ITENS_DEMO.find((i) => i[0] === id);
      if (!item) throw falha('item_inexistente', 'Esse item saiu da lista.');
      if (params.get('conflito') === '1') {
        s.outros[id] = item[3];
        salvarDemo(s);
        throw falha('esgotado', 'Alguém foi mais rápido e reservou esse item.');
      }
      const livres = item[3] - (s.outros[id] || 0) - (s.minhas[id] ? 1 : 0);
      if (!s.minhas[id] && livres <= 0) throw falha('esgotado', 'Alguém foi mais rápido e reservou esse item.');
      s.minhas[id] = nome;
      salvarDemo(s);
      return respostaDemo(s);
    },
    async cancelar(id) {
      await pausa(800);
      const s = estadoDemo();
      delete s.minhas[id];
      salvarDemo(s);
      return respostaDemo(s);
    },
    async confirmar(d) {
      await pausa(1100);
      const s = estadoDemo();
      const nome = String(d.nome || '').trim();
      if (!nome) throw falha('dados_invalidos', 'Diga seu nome para confirmar.');
      s.eu = { nome, vai: !!d.vai, acompanhantes: d.vai ? Math.max(0, Math.min(10, d.acompanhantes | 0)) : 0 };
      salvarDemo(s);
      return respostaDemo(s);
    },
  };

  window.LUAU_API = Object.assign({ demo: DEMO, guardar: guardar }, DEMO ? demo : real);
})();
