/*
 * Relatório do anfitrião: presença, recados e porcentagem de presentes.
 * A chave vem do próprio link (#k=...) e é conferida pela planilha.
 */
(function () {
  'use strict';

  const CFG = window.CONVITE || {};
  const DEMO = !CFG.API_URL;
  const $ = (s, el) => (el || document).querySelector(s);
  const conteudo = $('#rel-conteudo');

  function lerChave() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const busca = new URLSearchParams(location.search);
    return (hash.get('k') || busca.get('k') || '').trim();
  }

  function escapar(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function plural(n, um, varios) {
    return `${n} ${n === 1 ? um : varios}`;
  }

  /** "11/10/2026 19:30" -> número para ordenar (mais recente primeiro). */
  function ordemData(texto) {
    const m = String(texto || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
    if (!m) return 0;
    return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  }

  function diasAte(texto) {
    const m = String(texto || CFG.DATA_PADRAO || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2})(?:[:h](\d{2}))?)?/);
    if (!m) return null;
    const alvo = Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0) + 3, +(m[5] || 0));
    return Math.floor((alvo - Date.now()) / 86400000);
  }

  function corNome(nome) {
    let h = 0;
    for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % 360;
    return h;
  }

  // ------------------------------------------------------------------------

  const DEMO_DADOS = {
    ok: true,
    evento: { data: CFG.DATA_PADRAO },
    presenca: { vao: 4, acompanhantes: 3, totalPessoas: 7, naoVao: 2 },
    presentes: { total: 299, reservados: 42 },
    respostas: [
      { data: '12/10/2026 20:14', nome: 'Bruna', vai: true, acompanhantes: 1, recado: 'Parabéns pela casa nova! Já quero conhecer cada cantinho.' },
      { data: '12/10/2026 18:02', nome: 'Rafa', vai: true, acompanhantes: 0, recado: '' },
      { data: '12/10/2026 09:40', nome: 'Tia Cida', vai: true, acompanhantes: 2, recado: 'Que orgulho, meu filho! Vou levar aquele bolo.' },
      { data: '11/10/2026 22:31', nome: 'Léo', vai: true, acompanhantes: 0, recado: 'Bora fazer esse luau acontecer!' },
      { data: '11/10/2026 21:10', nome: 'Carla', vai: false, acompanhantes: 0, recado: 'Vou estar viajando, mas mando um abraço e passo aí depois!' },
      { data: '11/10/2026 19:55', nome: 'Diego', vai: false, acompanhantes: 0, recado: '' },
    ],
  };

  async function buscar(chave) {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 700));
      return DEMO_DADOS;
    }
    const url = CFG.API_URL + '?acao=relatorio&chave=' + encodeURIComponent(chave) + '&t=' + Date.now();
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 25000);
    try {
      const r = await fetch(url, { signal: controle.signal, redirect: 'follow' });
      if (!r.ok) throw Object.assign(new Error('rede'), { codigo: 'rede' });
      const json = await r.json();
      if (!json.ok) throw Object.assign(new Error(json.mensagem || 'erro'), { codigo: json.erro || 'erro' });
      return json;
    } catch (e) {
      if (e && e.codigo) throw e;
      throw Object.assign(new Error('rede'), { codigo: 'rede' });
    } finally {
      clearTimeout(limite);
    }
  }

  // ------------------------------------------------------------------------

  function mostrarEstado(figurinha, titulo, texto, comBotao) {
    conteudo.innerHTML = `
      <div class="rel-estado">
        ${figurinha ? `<img src="${figurinha}" alt="" width="200" height="300">` : ''}
        <h2>${escapar(titulo)}</h2>
        <p>${escapar(texto)}</p>
        ${comBotao ? '<button class="btn btn-coral" type="button" id="rel-tentar">Tentar de novo</button>' : ''}
      </div>`;
    const b = $('#rel-tentar');
    if (b) b.addEventListener('click', carregar);
  }

  function cartaoNumero(rotulo, valor, classe) {
    return `<div class="rel-num ${classe || ''}"><span class="rel-num-valor" data-alvo="${valor}">0</span><span class="rel-num-rotulo">${rotulo}</span></div>`;
  }

  function renderizar(d) {
    const p = d.presenca;
    const pr = d.presentes;
    const pct = pr.total ? Math.round((pr.reservados / pr.total) * 100) : 0;
    const respostas = d.respostas.slice().sort((a, b) => ordemData(b.data) - ordemData(a.data) || (b.linha || 0) - (a.linha || 0));
    const comRecado = respostas.filter((r) => r.recado);
    const vao = respostas.filter((r) => r.vai);
    const naoVao = respostas.filter((r) => !r.vai);

    const dias = diasAte(d.evento && d.evento.data);
    if (dias !== null) {
      $('#rel-sub').textContent =
        dias > 1
          ? `Oi, Vinícius! Faltam ${dias} dias para o luau. Olha só como está.`
          : dias === 1
          ? 'Oi, Vinícius! Falta 1 dia para o luau. Olha só como está.'
          : dias === 0
          ? 'Oi, Vinícius! É hoje! Olha só como está.'
          : 'Oi, Vinícius! O luau já foi. Aqui está o resumo da festa.';
    }

    const chip = (r) =>
      `<li class="nome"><span class="avatar" style="--h:${corNome(r.nome)}">${escapar(r.nome.charAt(0).toUpperCase())}</span>${escapar(r.nome)}${
        r.vai && r.acompanhantes ? `<span class="mais">+${r.acompanhantes}</span>` : ''
      }</li>`;

    conteudo.innerHTML = `
      <section class="rel-bloco">
        <h2 class="rel-h2">Presença</h2>
        <div class="rel-numeros">
          ${cartaoNumero(p.vao === 1 ? 'confirmou que vai' : 'confirmaram que vão', p.vao)}
          ${cartaoNumero(p.acompanhantes === 1 ? 'acompanhante' : 'acompanhantes', p.acompanhantes)}
          ${cartaoNumero('pessoas no total', p.totalPessoas, 'rel-num-destaque')}
          ${cartaoNumero(p.naoVao === 1 ? 'não vai poder ir' : 'não vão poder ir', p.naoVao, 'rel-num-nao')}
        </div>
      </section>

      <section class="rel-bloco">
        <h2 class="rel-h2">Presentes</h2>
        <div class="rel-presentes">
          <div class="rel-pct"><span data-alvo="${pct}">0</span>%</div>
          <div class="rel-pct-info">
            <p><strong>${pr.reservados} de ${pr.total}</strong> presentes da lista já foram garantidos.</p>
            <div class="progresso-barra"><span id="rel-barra"></span></div>
            <p class="rel-segredo"><svg class="ic"><use href="#i-presente"/></svg>O que cada um vai dar continua surpresa.</p>
          </div>
        </div>
      </section>

      <section class="rel-bloco">
        <h2 class="rel-h2">Recados <span class="rel-conta">${comRecado.length}</span></h2>
        ${
          comRecado.length
            ? `<ul class="rel-recados">${comRecado
                .map(
                  (r) => `
            <li class="rel-recado">
              <div class="rel-recado-topo">
                <span class="avatar" style="--h:${corNome(r.nome)}">${escapar(r.nome.charAt(0).toUpperCase())}</span>
                <div>
                  <p class="rel-recado-nome">${escapar(r.nome)}</p>
                  <p class="rel-recado-data">${escapar(r.data)}</p>
                </div>
                <span class="rel-selo ${r.vai ? 'vai' : 'nao'}">${r.vai ? (r.acompanhantes ? `Vai +${r.acompanhantes}` : 'Vai') : 'Não vai'}</span>
              </div>
              <p class="rel-recado-texto">${escapar(r.recado)}</p>
            </li>`
                )
                .join('')}</ul>`
            : '<p class="rel-vazio">Nenhum recado ainda.</p>'
        }
      </section>

      <section class="rel-bloco">
        <h2 class="rel-h2">Quem vai <span class="rel-conta">${vao.length}</span></h2>
        ${vao.length ? `<ul class="nomes rel-nomes">${vao.map(chip).join('')}</ul>` : '<p class="rel-vazio">Ninguém confirmou ainda.</p>'}
      </section>

      <section class="rel-bloco">
        <h2 class="rel-h2">Não vão poder ir <span class="rel-conta">${naoVao.length}</span></h2>
        ${naoVao.length ? `<ul class="nomes rel-nomes">${naoVao.map(chip).join('')}</ul>` : '<p class="rel-vazio">Por enquanto, ninguém.</p>'}
      </section>`;

    animarNumeros();
    requestAnimationFrame(() => {
      const barra = $('#rel-barra');
      if (barra) barra.style.width = pct + '%';
    });
    const agora = new Date();
    $('#rel-hora').textContent = `Atualizado às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  }

  function animarNumeros() {
    const alvos = Array.from(document.querySelectorAll('[data-alvo]'));
    const inicio = performance.now();
    const duracao = 900;
    function passo(t) {
      const x = Math.min(1, (t - inicio) / duracao);
      const suave = 1 - Math.pow(1 - x, 3);
      alvos.forEach((el) => (el.textContent = Math.round(Number(el.dataset.alvo) * suave)));
      if (x < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  let carregando = false;
  async function carregar() {
    if (carregando) return;
    const chave = lerChave();
    if (!DEMO && chave.length < 20) {
      mostrarEstado('assets/img/ombros-sm.webp', 'Esse link não abre nada', 'Confere se você copiou o link inteiro, com tudo o que vem depois do #.');
      return;
    }
    carregando = true;
    const botao = $('#rel-atualizar');
    botao.classList.add('carregando');
    try {
      renderizar(await buscar(chave));
    } catch (e) {
      if (e.codigo === 'chave_invalida') {
        mostrarEstado('assets/img/ombros-sm.webp', 'Esse link não abre nada', 'A chave do link não confere. Ela pode ter sido trocada na planilha.');
      } else {
        mostrarEstado('assets/img/erro-sm.webp', 'A planilha tropeçou numa caixa da mudança', 'Confere sua internet e tenta de novo.', true);
      }
    } finally {
      carregando = false;
      botao.classList.remove('carregando');
    }
  }

  if (DEMO) $('#demo-aviso').hidden = false;
  $('#rel-atualizar').addEventListener('click', carregar);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) carregar();
  });
  setInterval(() => {
    if (!document.hidden) carregar();
  }, 60000);
  carregar();
})();
