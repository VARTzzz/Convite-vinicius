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
    reservar(item, nome, quantidade) {
      return enviar({ acao: 'reservar', item: item, nome: nome, quantidade: quantidade || 1 });
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

  const ITENS_DEMO = window.LUAU_LISTA_DEMO || [];

  const CHAVE_DEMO = 'luau.demo.v2';

  function estadoDemo() {
    let s = null;
    try { s = JSON.parse(guardar.ler(CHAVE_DEMO) || 'null'); } catch (_) { s = null; }
    if (!s) {
      s = {
        // unidades já reservadas por outras pessoas, para o teste ter de tudo
        outros: { p001: 1, p036: 2, p068: 2, p071: 6, p126: 1, p169: 1 },
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
      const minhaQuantidade = s.minhas[id] || 0;
      const reservados = Math.min(quantidade, (s.outros[id] || 0) + minhaQuantidade);
      return { id, categoria, nome, piada, quantidade, reservados, meu: minhaQuantidade > 0, minhaQuantidade };
    });
    return {
      ok: true,
      evento: { data: cfg.DATA_PADRAO, endereco: 'Rua do Exemplo, 123', bairro: 'Bairro Exemplo', cidade: 'Sua Cidade' },
      itens,
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
    async reservar(id, nome, quantidade) {
      await pausa(1100);
      const s = estadoDemo();
      const item = ITENS_DEMO.find((i) => i[0] === id);
      if (!item) throw falha('item_inexistente', 'Esse item saiu da lista.');
      if (s.minhas[id]) return respostaDemo(s);
      const pedido = Math.max(1, quantidade | 0);
      if (params.get('conflito') === '1') {
        s.outros[id] = item[3];
        salvarDemo(s);
        throw falha('esgotado', 'Alguém foi mais rápido e reservou esse item.');
      }
      const restantes = item[3] - (s.outros[id] || 0);
      if (restantes <= 0) throw falha('esgotado', 'Alguém foi mais rápido e reservou esse item.');
      if (pedido > restantes) {
        throw falha('quantidade_indisponivel', restantes === 1 ? 'Agora só falta 1 unidade desse item.' : `Agora só faltam ${restantes} unidades desse item.`);
      }
      s.minhas[id] = pedido;
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
