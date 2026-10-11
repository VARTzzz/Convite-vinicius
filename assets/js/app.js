/*
 * Luau da Casa Nova do Vinícius: interface e animações.
 */
(function () {
  'use strict';

  const CFG = window.CONVITE || {};
  const API = window.LUAU_API;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;
  const temGsap = !!gsap;

  if (temGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
  } else {
    document.documentElement.classList.add('sem-animacao');
  }
  document.documentElement.classList.add('js');

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const telaGrande = () => window.matchMedia('(min-width: 900px)').matches;

  const estado = {
    dados: null,
    soLivres: false,
    ocupados: new Set(),
    editandoRsvp: false,
    acompanhantes: 0,
    folhaAberta: false,
    revelacaoAnimada: false,
    primeiraLista: true,
  };

  // ------------------------------------------------------------------------
  // Textos

  const FRASES_ABERTURA = [
    'Procurando a chave…',
    'Montando o móvel sem ler o manual…',
    'Sobrou um parafuso. Normal.',
    'Pendurando as lampadinhas…',
    'Regando as costelas-de-adão…',
    'Abrindo a caixa escrita “diversos”…',
  ];

  const EMOJI_CATEGORIA = {
    cozinha: '🍳',
    mesa: '🍽️',
    banheiro: '🛁',
    quarto: '🛏️',
    sala: '🛋️',
    'limpeza e lavanderia': '🧺',
    limpeza: '🧺',
    lavanderia: '🧺',
    utilidades: '🧰',
  };

  const CATEGORIA_COMPLETA = {
    cozinha: 'Cozinha completa! Agora o miojo vai ter companhia.',
    mesa: 'Mesa posta! Já dá para chamar as visitas.',
    banheiro: 'Banheiro completo! Agora dá para tomar banho com dignidade.',
    quarto: 'Quarto pronto! Boa noite, Vinícius.',
    sala: 'Sala montada! O sofá agradece.',
    'limpeza e lavanderia': 'Limpeza garantida! Usar é outra história.',
    utilidades: 'Ferramentas garantidas! Os quadros tortos já estão com medo.',
  };

  const AGRADECE = {
    cozinha: 'A pia também.',
    mesa: 'A mesa também.',
    banheiro: 'O chuveiro também.',
    quarto: 'O colchão também.',
    sala: 'O sofá também.',
    'limpeza e lavanderia': 'O chão também.',
    utilidades: 'A tomada também.',
  };

  const FRASES_CONTAGEM = [
    (d) => `${d} para o Vinícius descobrir que não tem abridor de garrafa.`,
    (d) => `${d} para ele ensaiar a cara de surpresa para cada presente.`,
    (d) => `${d} e a camisa havaiana já está separada. Mentira, ele vai decidir na hora.`,
    (d) => `${d} para ele treinar o “ai, não precisava!”.`,
    (d) => `${d} para ele aprender a fazer pelo menos um petisco.`,
  ];

  // ------------------------------------------------------------------------
  // Utilidades

  function escapar(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function chave(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function slug(s) {
    return chave(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'outros';
  }

  function primeiroNome(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
  }

  function plural(n, um, varios) {
    return `${n} ${n === 1 ? um : varios}`;
  }

  /** "24/10/2026 15:00" (horário de Brasília) -> Date */
  function lerData(texto) {
    const m = String(texto || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2})(?:[:h](\d{2}))?)?/);
    if (!m) return null;
    const [, d, mes, a, h = '0', min = '0'] = m;
    return new Date(Date.UTC(+a, +mes - 1, +d, +h + 3, +min));
  }

  function dataEvento() {
    const d = estado.dados && estado.dados.evento;
    return lerData(d && d.data) || lerData(CFG.DATA_PADRAO);
  }

  const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  /** Partes da data no horário de Brasília. */
  function partesData(data) {
    const b = new Date(data.getTime() - 3 * 3600 * 1000);
    return {
      dia: b.getUTCDate(),
      mes: b.getUTCMonth(),
      semana: b.getUTCDay(),
      hora: b.getUTCHours(),
      minuto: b.getUTCMinutes(),
    };
  }

  function textoHora(p) {
    return p.minuto ? `${p.hora}h${String(p.minuto).padStart(2, '0')}` : `${p.hora}h`;
  }

  function enderecoCompleto() {
    const e = (estado.dados && estado.dados.evento) || {};
    return [e.endereco, e.bairro, e.cidade].filter((x) => x && String(x).trim()).join(', ');
  }

  // ------------------------------------------------------------------------
  // Rolagem suave (Lenis no computador)

  let lenis = null;
  function iniciarRolagem() {
    if (!temGsap || !window.Lenis || !window.matchMedia('(pointer: fine)').matches) return;
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function irPara(alvo) {
    const el = typeof alvo === 'string' ? document.querySelector(alvo) : alvo;
    if (!el) return;
    const deslocamento = el.id === 'inicio' ? 0 : el.tagName === 'SECTION' ? -8 : -24;
    if (lenis) lenis.scrollTo(el, { offset: deslocamento, duration: 1.4 });
    else {
      const y = el.getBoundingClientRect().top + window.scrollY + deslocamento;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  function travarRolagem(travar) {
    document.documentElement.classList.toggle('travado', travar);
    if (lenis) (travar ? lenis.stop() : lenis.start());
  }

  // ------------------------------------------------------------------------
  // Varal de lâmpadas

  let varalId = 0;
  function construirVaral(svg) {
    const largura = Math.max(320, svg.getBoundingClientRect().width || window.innerWidth);
    const altura = 84;
    const id = 'halo-' + varalId++;
    const vaos = Math.max(1, Math.round(largura / 340));
    const lv = largura / vaos;
    let caminho = '';
    const lampadas = [];
    for (let i = 0; i < vaos; i++) {
      const x0 = i * lv - (i === 0 ? 10 : 0);
      const x1 = (i + 1) * lv + (i === vaos - 1 ? 10 : 0);
      const cx = (x0 + x1) / 2;
      const cy = 50;
      caminho += `M${x0.toFixed(1)} 4 Q${cx.toFixed(1)} ${cy} ${x1.toFixed(1)} 4 `;
      const n = Math.max(4, Math.round(lv / 46));
      for (let j = 1; j < n; j++) {
        const t = j / n;
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
        const y = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * cy + t * t * 4;
        lampadas.push([x, y]);
      }
    }
    svg.setAttribute('viewBox', `0 0 ${largura.toFixed(0)} ${altura}`);
    svg.innerHTML =
      `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/>` +
      `<stop offset=".35" stop-color="#ffb84d" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a3d" stop-opacity="0"/></radialGradient></defs>` +
      `<path class="fio" d="${caminho}"/>` +
      lampadas
        .map(
          ([x, y]) =>
            `<g class="lampada" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">` +
            `<circle class="halo" cx="0" cy="12" r="22" fill="url(#${id})"/>` +
            `<rect class="soquete" x="-2.6" y="-1" width="5.2" height="6" rx="1.2"/>` +
            `<ellipse class="bulbo" cx="0" cy="12" rx="5" ry="7"/></g>`
        )
        .join('');
    return $$('.lampada', svg);
  }

  function acenderVaral(svg, atraso) {
    const lampadas = $$('.lampada', svg);
    if (!temGsap) {
      lampadas.forEach((l) => l.classList.add('acesa'));
      return;
    }
    lampadas.forEach((l, i) => {
      gsap.delayedCall((atraso || 0) + i * 0.045, () => l.classList.add('acesa'));
      gsap.to($('.halo', l), { opacity: 1, duration: 0.5, delay: (atraso || 0) + i * 0.045, ease: 'power2.out' });
    });
    gsap.to($$('.halo', svg), {
      opacity: () => gsap.utils.random(0.55, 1),
      duration: () => gsap.utils.random(0.8, 1.8),
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: (atraso || 0) + lampadas.length * 0.045 + 0.4,
      stagger: { each: 0.08, from: 'random' },
    });
  }

  function prepararVarais() {
    const varais = $$('.varal');
    varais.forEach((svg) => construirVaral(svg));
    let larguraAnterior = window.innerWidth;
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - larguraAnterior) < 40) return;
      larguraAnterior = window.innerWidth;
      varais.forEach((svg) => {
        const estavaAceso = !!$('.acesa', svg);
        construirVaral(svg);
        if (estavaAceso) {
          $$('.lampada', svg).forEach((l) => l.classList.add('acesa'));
          $$('.halo', svg).forEach((h) => (h.style.opacity = 1));
        }
      });
    });
  }

  // ------------------------------------------------------------------------
  // Abertura

  const FOLHAS_ABERTURA = [
    { x: 6, y: 8, s: 0.95, r: 140, c: '#1f5a40' },
    { x: 94, y: 6, s: 1.0, r: -140, c: '#2a6a4c' },
    { x: -4, y: 46, s: 0.9, r: 84, c: '#2f6b4f' },
    { x: 104, y: 52, s: 0.95, r: -82, c: '#245c43' },
    { x: 8, y: 94, s: 1.0, r: 28, c: '#2a6a4c' },
    { x: 92, y: 96, s: 1.05, r: -30, c: '#1f5a40' },
    { x: 50, y: -8, s: 0.8, r: 180, c: '#3e8e5e' },
    { x: 50, y: 108, s: 0.85, r: 0, c: '#357a55' },
  ];

  let timerFrase = null;
  let animacoesAbertura = [];

  function iniciarAbertura() {
    const folhas = $$('.lf');
    const frase = $('#loader-frase');
    let i = 0;
    timerFrase = setInterval(() => {
      i = (i + 1) % FRASES_ABERTURA.length;
      if (temGsap) {
        gsap.to(frase, {
          y: -10,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            frase.textContent = FRASES_ABERTURA[i];
            gsap.fromTo(frase, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
          },
        });
      } else {
        frase.textContent = FRASES_ABERTURA[i];
      }
    }, 1500);

    if (!temGsap) return;
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    folhas.forEach((f, k) => {
      const c = FOLHAS_ABERTURA[k];
      const tam = Math.max(240, vmin * 0.78 * c.s);
      gsap.set(f, {
        width: tam,
        height: tam * 1.1,
        left: (c.x / 100) * window.innerWidth,
        top: (c.y / 100) * window.innerHeight,
        xPercent: -50,
        yPercent: -50,
        rotation: c.r,
        color: c.c,
      });
      animacoesAbertura.push(
        gsap.to(f, {
          rotation: c.r + (k % 2 ? 7 : -7),
          duration: gsap.utils.random(1.8, 2.6),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: k * 0.1,
        })
      );
    });
    gsap.from(folhas, { scale: 0.6, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.05 });
    gsap.from('.loader-centro', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 });
    animacoesAbertura.push(
      gsap.fromTo(
        '.loader-figurinha',
        { rotation: -5 },
        { rotation: 5, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 }
      )
    );
  }

  function abrirCortina() {
    clearInterval(timerFrase);
    const loader = $('#loader');
    document.body.classList.remove('is-loading');

    if (!temGsap) {
      loader.remove();
      introHero();
      return Promise.resolve();
    }

    animacoesAbertura.forEach((a) => a.kill());
    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
      },
    });
    tl.to('.loader-centro', { scale: 0.85, opacity: 0, duration: 0.45, ease: 'power2.in' });
    $$('.lf').forEach((f, k) => {
      const c = FOLHAS_ABERTURA[k];
      const dx = (c.x - 50) / 50;
      const dy = (c.y - 50) / 50;
      tl.to(
        f,
        {
          x: dx * window.innerWidth * 0.75 + (dx === 0 ? 0 : Math.sign(dx) * 60),
          y: dy * window.innerHeight * 0.7,
          rotation: c.r + (dx >= 0 ? 35 : -35),
          scale: 1.25,
          duration: 1.25,
          ease: 'power3.inOut',
        },
        0.25 + k * 0.03
      );
    });
    tl.to(loader, { backgroundColor: 'rgba(15,46,34,0)', duration: 0.8, ease: 'power2.inOut' }, 0.5);
    tl.add(() => introHero(), 0.75);
    return tl.then();
  }

  // ------------------------------------------------------------------------
  // Hero

  function introHero() {
    const varal = $('#varal-hero');
    if (lenis) lenis.start();
    if (!temGsap) {
      acenderVaral(varal);
      return;
    }

    const titulo = $('[data-hero-title]');
    let alvosTitulo = $$('.linha', titulo);
    if (SplitText) {
      const split = SplitText.create(titulo, { type: 'words', mask: 'words' });
      alvosTitulo = split.words;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from(alvosTitulo, { yPercent: 115, rotation: 4, duration: 1.1, stagger: 0.08 }, 0)
      .from('[data-hero]', { y: 26, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.25)
      .from('.surf-fig', { y: 120, scale: 0.75, rotation: -10, opacity: 0, duration: 1.3, ease: 'back.out(1.5)' }, 0.35)
      .from('.hf', { scale: 0.5, opacity: 0, duration: 1.4, ease: 'power3.out', stagger: 0.08 }, 0)
      .add(() => {
        balancarSurfista();
        mostrarRolar();
      });
    acenderVaral(varal, 0.3);
  }

  function balancarSurfista() {
    gsap.to('.surf-fig', { y: -12, rotation: 2.5, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.surf-sombra', { scaleX: 0.85, opacity: 0.7, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  function mostrarRolar() {
    gsap.from('.rolar', { opacity: 0, duration: 0.6 });
  }

  function efeitosDeRolagem() {
    if (!temGsap) return;

    // Folhas do hero sobem em velocidades diferentes
    $$('.hf').forEach((f, i) => {
      gsap.to(f, {
        yPercent: -30 - i * 12,
        rotation: `+=${i % 2 ? -14 : 14}`,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    gsap.to('.hero-texto', {
      yPercent: -18,
      opacity: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });

    // Frase do kōkua acende palavra por palavra
    const frase = $('#kokua-frase');
    if (SplitText) {
      const split = SplitText.create(frase, { type: 'words' });
      gsap.fromTo(
        split.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.12,
          ease: 'none',
          scrollTrigger: { trigger: frase, start: 'top 82%', end: 'bottom 48%', scrub: true },
        }
      );
    }
    gsap.fromTo(
      '.kokua-flor',
      { rotation: -30, y: 40 },
      { rotation: 60, y: -60, ease: 'none', scrollTrigger: { trigger: '.kokua', start: 'top bottom', end: 'bottom top', scrub: true } }
    );

    // Revelações genéricas
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (lote) =>
        gsap.to(lote, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
    });

    gsap.fromTo(
      '.contagem-tiki',
      { rotation: -6 },
      { rotation: 6, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }
    );

    // Folhas da confirmação
    $$('.cf').forEach((f, i) => {
      gsap.to(f, {
        yPercent: i ? 25 : -25,
        rotation: `+=${i ? -18 : 18}`,
        ease: 'none',
        scrollTrigger: { trigger: '.confirmar', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    ScrollTrigger.create({
      trigger: '.confirmar',
      start: 'top 75%',
      once: true,
      onEnter: () => acenderVaral($('#varal-rsvp')),
    });

    // Navegação flutuante
    const nav = $('#nav');
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'bottom 70%',
      onEnter: () => nav.classList.add('visivel'),
      onLeaveBack: () => nav.classList.remove('visivel'),
    });
    ['inicio', 'lista', 'confirmar', 'quem'].forEach((id) => {
      const alvo = document.getElementById(id);
      if (!alvo) return;
      ScrollTrigger.create({
        trigger: alvo,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (st) => {
          if (st.isActive) $$('.nav a').forEach((a) => a.classList.toggle('ativo', a.dataset.nav === id));
        },
      });
    });

    // Barra de filtros com borda quando gruda
    ScrollTrigger.create({
      trigger: '#filtros',
      start: 'top top+=1',
      endTrigger: '#lista',
      end: 'bottom top',
      toggleClass: { targets: '#filtros', className: 'grudado' },
    });
  }

  // ------------------------------------------------------------------------
  // Data, endereço e contagem

  function aplicarEvento() {
    const data = dataEvento();
    if (data) {
      const p = partesData(data);
      $('#hero-data-texto').textContent = `${DIAS[p.semana].replace('-feira', '')}, ${p.dia} de ${MESES[p.mes]}`;
      $('#hero-hora-texto').textContent = textoHora(p);
      $('#dia-num').textContent = p.dia;
      $('#dia-mes').textContent = MESES[p.mes].slice(0, 3);
      $('#dia-semana').textContent = DIAS[p.semana];
      $('#hora-num').textContent = textoHora(p);
    }

    const e = (estado.dados && estado.dados.evento) || {};
    const rua = (e.endereco || '').trim();
    const resto = [e.bairro, e.cidade].filter((x) => x && String(x).trim()).join(', ');
    $('#endereco-texto').textContent = rua || resto || 'Endereço em breve';
    $('#endereco-sub').textContent = rua ? resto : '';
    atualizarTrava();
  }

  function atualizarTrava() {
    const trava = $('#trava-local');
    const local = estado.dados && estado.dados.local;
    if (local && local.nome) {
      trava.classList.add('liberada');
      trava.innerHTML =
        `<svg class="ic"><use href="#i-pin"/></svg><span><span class="trava-local">${escapar(local.nome)}</span>` +
        `<span class="trava-botoes"><a class="btn btn-claro" href="${escapar(local.maps)}" target="_blank" rel="noopener">Google Maps</a>` +
        `<a class="btn btn-claro" href="${escapar(local.waze)}" target="_blank" rel="noopener">Waze</a></span></span>`;
    } else {
      trava.classList.remove('liberada');
      trava.innerHTML =
        '<svg class="ic"><use href="#i-cadeado"/></svg><span>O nome do lugar e o mapa aparecem quando você confirmar presença.</span>';
    }
  }

  const relogioAnterior = {};
  function atualizarContagem() {
    const data = dataEvento();
    if (!data) return;
    const agora = Date.now();
    const fim = data.getTime() + (CFG.DURACAO_HORAS || 5) * 3600 * 1000;
    let resto = Math.max(0, data.getTime() - agora);
    const valores = {
      dias: Math.floor(resto / 86400000),
      horas: Math.floor((resto % 86400000) / 3600000),
      min: Math.floor((resto % 3600000) / 60000),
      seg: Math.floor((resto % 60000) / 1000),
    };
    $$('.relogio-num').forEach((el) => {
      const u = el.dataset.unidade;
      const texto = String(valores[u]).padStart(2, '0');
      if (relogioAnterior[u] !== texto) {
        el.textContent = texto;
        if (temGsap && relogioAnterior[u] !== undefined) {
          gsap.fromTo(el, { yPercent: -45, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
        }
        relogioAnterior[u] = texto;
      }
    });

    let frase;
    const p = partesData(data);
    const hoje = partesData(new Date(agora));
    const mesmoDia = p.dia === hoje.dia && p.mes === hoje.mes;
    if (agora >= fim) frase = 'O luau já foi. E que luau, hein?';
    else if (agora >= data.getTime()) frase = 'O luau está rolando agora! Corre que ainda dá tempo.';
    else if (mesmoDia) frase = `É HOJE! O Vinícius já está de colar havaiano esperando você às ${textoHora(p)}.`;
    else {
      const dias = valores.dias;
      const texto = dias === 0 ? 'Falta menos de um dia' : dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`;
      frase = FRASES_CONTAGEM[dias % FRASES_CONTAGEM.length](texto);
    }
    const el = $('#contagem-frase');
    if (el.textContent !== frase) el.textContent = frase;
  }

  // ------------------------------------------------------------------------
  // Lista de presentes

  function categoriasDe(itens) {
    const ordem = [];
    const mapa = {};
    itens.forEach((i) => {
      const k = chave(i.categoria);
      if (!mapa[k]) {
        mapa[k] = { chave: k, nome: i.categoria, id: 'cat-' + slug(i.categoria), itens: [] };
        ordem.push(mapa[k]);
      }
      mapa[k].itens.push(i);
    });
    return ordem;
  }

  function livres(i) {
    return Math.max(0, i.quantidade - i.reservados);
  }

  function textoQuantidade(i) {
    const l = livres(i);
    if (l <= 0) return 'Já garantido';
    if (i.quantidade === 1) return 'Disponível';
    return `${l} de ${i.quantidade} disponíveis`;
  }

  function assinaturaLista(itens) {
    return itens.map((i) => `${i.id}|${i.categoria}|${i.nome}|${i.piada}|${i.quantidade}`).join('§');
  }
  let assinaturaAtual = '';
  let gatilhosLista = [];

  function renderizarLista() {
    const itens = (estado.dados && estado.dados.itens) || [];
    const caixa = $('#categorias');
    const assinatura = assinaturaLista(itens);

    if (assinatura !== assinaturaAtual) {
      assinaturaAtual = assinatura;
      gatilhosLista.forEach((g) => g.kill());
      gatilhosLista = [];
      const cats = categoriasDe(itens);
      caixa.innerHTML = cats
        .map(
          (c) => `
        <section class="categoria" id="${c.id}" data-cat="${escapar(c.chave)}">
          <header class="categoria-topo">
            <span class="categoria-emoji" aria-hidden="true">${EMOJI_CATEGORIA[c.chave] || '🎁'}</span>
            <h3>${escapar(c.nome)}</h3>
            <span class="categoria-conta"></span>
          </header>
          <p class="categoria-completa" hidden></p>
          <div class="itens">
            ${c.itens
              .map(
                (i) => `
              <article class="item" data-id="${escapar(i.id)}">
                <div class="carimbo" aria-hidden="true">Reservado</div>
                <div class="item-info">
                  <h4 class="item-nome">${escapar(i.nome)}</h4>
                  ${i.piada ? `<p class="item-piada">${escapar(i.piada)}</p>` : ''}
                </div>
                <div class="item-acao">
                  <span class="item-qtd"></span>
                  <button class="btn-item" type="button" data-reservar>Eu dou esse</button>
                </div>
                <div class="item-meu">
                  <svg class="ic"><use href="#i-presente"/></svg>
                  <span>Você vai dar esse</span>
                  <button class="link" type="button" data-desfazer><svg class="ic"><use href="#i-desfazer"/></svg>Desfazer</button>
                </div>
              </article>`
              )
              .join('')}
          </div>
        </section>`
        )
        .join('');

      $('#chips').innerHTML = cats
        .map(
          (c) =>
            `<button class="chip" type="button" role="tab" data-alvo="${c.id}">` +
            `<span aria-hidden="true">${EMOJI_CATEGORIA[c.chave] || '🎁'}</span>${escapar(c.nome)}<span class="chip-conta"></span></button>`
        )
        .join('');

      prepararEspiaoCategorias();
      if (temGsap) {
        const cards = $$('.item', caixa);
        gsap.set(cards, { y: 30, opacity: 0 });
        gatilhosLista.push(
          ...ScrollTrigger.batch(cards, {
            start: 'top 94%',
            once: true,
            onEnter: (lote) => gsap.to(lote, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.06 }),
          })
        );
        ScrollTrigger.refresh();
      }
    }

    // Estado de cada item
    itens.forEach((i) => {
      const el = caixa.querySelector(`.item[data-id="${CSS.escape(i.id)}"]`);
      if (!el || estado.ocupados.has(i.id)) return;
      el.classList.toggle('is-meu', !!i.meu);
      el.classList.toggle('is-esgotado', livres(i) <= 0);
      if (temGsap && !i.meu && livres(i) > 0) gsap.set($('.carimbo', el), { clearProps: 'all' });
      $('.item-qtd', el).textContent = textoQuantidade(i);
      const btn = $('[data-reservar]', el);
      btn.setAttribute('aria-label', `Reservar ${i.nome}`);
    });

    // Contagens por categoria
    categoriasDe(itens).forEach((c) => {
      const sec = document.getElementById(c.id);
      if (!sec) return;
      const total = c.itens.reduce((t, i) => t + i.quantidade, 0);
      const disp = c.itens.reduce((t, i) => t + livres(i), 0);
      $('.categoria-conta', sec).textContent = disp ? `${disp} ${disp === 1 ? 'livre' : 'livres'}` : 'Tudo garantido';
      const completa = $('.categoria-completa', sec);
      completa.hidden = disp > 0;
      completa.textContent = CATEGORIA_COMPLETA[c.chave] || 'Categoria completa! Vocês são demais.';
      const chip = document.querySelector(`.chip[data-alvo="${c.id}"] .chip-conta`);
      if (chip) chip.textContent = disp;
      sec.dataset.total = total;
    });

    aplicarFiltro();
    atualizarProgresso();
  }

  function atualizarProgresso() {
    const itens = (estado.dados && estado.dados.itens) || [];
    const total = itens.reduce((t, i) => t + i.quantidade, 0);
    const res = itens.reduce((t, i) => t + Math.min(i.quantidade, i.reservados), 0);
    $('#progresso-num').textContent = `${res} de ${total}`;
    $('#progresso-barra').style.width = total ? `${(res / total) * 100}%` : '0%';
  }

  function aplicarFiltro() {
    let mudou = false;
    $$('.categoria').forEach((sec) => {
      let visiveis = 0;
      $$('.item', sec).forEach((el) => {
        const esconder = estado.soLivres && el.classList.contains('is-esgotado') && !el.classList.contains('is-meu');
        if (el.hidden !== esconder) {
          el.hidden = esconder;
          mudou = true;
        }
        if (!esconder) visiveis++;
      });
      if (sec.hidden !== (visiveis === 0)) {
        sec.hidden = visiveis === 0;
        mudou = true;
      }
    });
    if (mudou && temGsap) ScrollTrigger.refresh();
  }

  function prepararEspiaoCategorias() {
    const chips = $$('.chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const alvo = document.getElementById(chip.dataset.alvo);
        if (alvo && !alvo.hidden) irPara(alvo);
      });
    });
    if (!temGsap) return;
    $$('.categoria').forEach((sec) => {
      gatilhosLista.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 140px',
        end: 'bottom 140px',
        onToggle: (st) => {
          if (!st.isActive) return;
          chips.forEach((c) => c.classList.toggle('ativo', c.dataset.alvo === sec.id));
          const ativo = chips.find((c) => c.dataset.alvo === sec.id);
          if (ativo) {
            const barra = $('#chips');
            const alvoX = ativo.offsetLeft - barra.clientWidth / 2 + ativo.clientWidth / 2;
            barra.scrollTo({ left: alvoX, behavior: 'smooth' });
          }
        },
      }));
    });
  }

  function itemPorId(id) {
    return ((estado.dados && estado.dados.itens) || []).find((i) => i.id === id);
  }

  function nomeSalvo() {
    return API.guardar.ler('luau.nome') || '';
  }

  function abrirReserva(id) {
    const item = itemPorId(id);
    if (!item) return;
    if (livres(item) <= 0 && !item.meu) {
      abrirConflito();
      return;
    }
    abrirFolha({
      html: `
        <p class="folha-sobre">Reservar presente</p>
        <h3 id="folha-titulo">${escapar(item.nome)}</h3>
        ${item.piada ? `<p class="folha-piada">${escapar(item.piada)}</p>` : ''}
        <form id="form-reserva" novalidate>
          <label class="campo">
            <span class="campo-rotulo">Quem vai dar?</span>
            <input type="text" name="nome" maxlength="60" autocomplete="name" placeholder="Seu nome" value="${escapar(nomeSalvo())}" required>
          </label>
          <p class="folha-nota">Ninguém no site vê seu nome. Só a organização sabe quem deu o quê.</p>
          <p class="form-erro" role="alert"></p>
          <div class="folha-botoes">
            <button type="button" class="btn btn-fantasma" data-fechar>Agora não</button>
            <button type="submit" class="btn btn-coral"><span>Reservar</span></button>
          </div>
        </form>`,
      aoAbrir: (raiz) => {
        const form = $('#form-reserva', raiz);
        const input = $('input', form);
        if (!input.value) setTimeout(() => input.focus(), 350);
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          confirmarReserva(item, form);
        });
      },
    });
  }

  async function confirmarReserva(item, form) {
    const input = $('input', form);
    const erro = $('.form-erro', form);
    const botao = $('button[type="submit"]', form);
    const nome = input.value.trim().replace(/\s+/g, ' ');
    if (!nome) {
      input.closest('.campo').classList.add('invalido');
      erro.textContent = 'Coloca seu nome para a organização saber quem vai dar.';
      input.focus();
      return;
    }
    input.closest('.campo').classList.remove('invalido');
    erro.textContent = '';
    API.guardar.gravar('luau.nome', nome);
    botao.classList.add('carregando');

    try {
      const dados = await API.reservar(item.id, nome);
      await fecharFolha();
      estado.dados = dados;
      estado.ocupados.add(item.id);
      renderizarTudo();
      estado.ocupados.delete(item.id);
      const el = document.querySelector(`.item[data-id="${CSS.escape(item.id)}"]`);
      await animarCarimbo(el, itemPorId(item.id) || item);
      renderizarLista();
      const cat = chave(item.categoria);
      abrirFolha({
        figurinha: 'assets/img/presente.webp',
        html: `
          <p class="folha-sobre">Reservado!</p>
          <h3 id="folha-titulo">Vinícius agradece. ${escapar(AGRADECE[cat] || 'A casa também.')}</h3>
          <p class="folha-texto">${escapar(item.nome)}: reserva feita no seu nome. Se mudar de ideia, dá para desfazer na própria lista.</p>
          <div class="folha-botoes um"><button type="button" class="btn btn-coral" data-fechar>Fechar</button></div>`,
      });
    } catch (e) {
      botao.classList.remove('carregando');
      if (e.codigo === 'esgotado') {
        await fecharFolha();
        abrirConflito();
        recarregar();
      } else if (e.codigo === 'rede') {
        await fecharFolha();
        abrirErro(() => abrirReserva(item.id));
      } else {
        erro.textContent = e.message || 'Não deu certo. Tenta de novo.';
      }
    }
  }

  function animarCarimbo(el, item) {
    if (!el) return Promise.resolve();
    el.classList.add('is-meu');
    el.classList.toggle('is-esgotado', livres(item) <= 0);
    const carimbo = $('.carimbo', el);
    soltarConfete(el);
    if (!temGsap) return Promise.resolve();
    const tl = gsap.timeline();
    tl.fromTo(
      carimbo,
      { scale: 2.6, opacity: 0, rotation: -28 },
      { scale: 1, opacity: 0.92, rotation: -12, duration: 0.42, ease: 'power4.in' }
    )
      .to(el, { x: -5, duration: 0.05, yoyo: true, repeat: 5, ease: 'none' })
      .set(el, { x: 0 })
      .fromTo(carimbo, { scale: 1.08 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, '<')
      .fromTo($('.item-meu', el), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.1')
      .to({}, { duration: 0.5 });
    return tl.then();
  }

  let formasConfete = null;
  function soltarConfete(el) {
    if (!window.confetti) return;
    if (!formasConfete && window.confetti.shapeFromText) {
      try {
        formasConfete = ['🌺', '🌸', '🌿'].map((t) => window.confetti.shapeFromText({ text: t, scalar: 2.2 }));
      } catch (_) {
        formasConfete = [];
      }
    }
    const r = el.getBoundingClientRect();
    const origem = {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 3) / window.innerHeight,
    };
    const base = { origin: origem, disableForReducedMotion: false, zIndex: 400 };
    window.confetti(Object.assign({}, base, {
      particleCount: 70,
      spread: 75,
      startVelocity: 38,
      colors: ['#f2735a', '#f2b544', '#3fbfb5', '#3e8e5e', '#fbf4e6'],
      scalar: 0.9,
    }));
    if (formasConfete && formasConfete.length) {
      window.confetti(Object.assign({}, base, {
        particleCount: 22,
        spread: 90,
        startVelocity: 30,
        shapes: formasConfete,
        scalar: 2.2,
        gravity: 0.8,
        flat: true,
      }));
    }
  }

  function abrirConflito() {
    abrirFolha({
      figurinha: 'assets/img/ombros.webp',
      html: `
        <p class="folha-sobre">Fazer o quê</p>
        <h3 id="folha-titulo">Alguém foi mais rápido!</h3>
        <p class="folha-texto">Esse acabou de ser reservado. Mas ainda tem muita coisa boa na lista.</p>
        <div class="folha-botoes um"><button type="button" class="btn btn-coral" data-fechar>Escolher outro</button></div>`,
    });
  }

  function abrirErro(tentarDeNovo) {
    abrirFolha({
      figurinha: 'assets/img/erro.webp',
      html: `
        <p class="folha-sobre">Ops</p>
        <h3 id="folha-titulo">A planilha tropeçou numa caixa da mudança.</h3>
        <p class="folha-texto">Confere sua internet e tenta de novo.</p>
        <div class="folha-botoes">
          <button type="button" class="btn btn-fantasma" data-fechar>Fechar</button>
          <button type="button" class="btn btn-coral" data-tentar>Tentar de novo</button>
        </div>`,
      aoAbrir: (raiz) => {
        $('[data-tentar]', raiz).addEventListener('click', async () => {
          await fecharFolha();
          if (tentarDeNovo) tentarDeNovo();
        });
      },
    });
  }

  function abrirDesfazer(id) {
    const item = itemPorId(id);
    if (!item) return;
    abrirFolha({
      html: `
        <p class="folha-sobre">${escapar(item.nome)}</p>
        <h3 id="folha-titulo">Mudou de ideia?</h3>
        <p class="folha-texto">Sem julgamentos. (Um pouquinho de julgamento.)</p>
        <div class="folha-botoes">
          <button type="button" class="btn btn-fantasma" data-fechar>Manter</button>
          <button type="button" class="btn btn-coral" data-confirmar-desfazer><span>Desfazer reserva</span></button>
        </div>`,
      aoAbrir: (raiz) => {
        const botao = $('[data-confirmar-desfazer]', raiz);
        botao.addEventListener('click', async () => {
          botao.classList.add('carregando');
          try {
            const dados = await API.cancelar(item.id);
            await fecharFolha();
            estado.dados = dados;
            const el = document.querySelector(`.item[data-id="${CSS.escape(item.id)}"]`);
            if (el && temGsap) {
              await gsap.to($('.carimbo', el), { scale: 0.6, opacity: 0, rotation: 10, duration: 0.35, ease: 'power2.in' }).then();
              gsap.set($('.carimbo', el), { clearProps: 'all' });
            }
            renderizarTudo();
            toast('Reserva desfeita. O item voltou para a lista.');
          } catch (e) {
            botao.classList.remove('carregando');
            await fecharFolha();
            if (e.codigo === 'rede') abrirErro(() => abrirDesfazer(id));
            else toast(e.message || 'Não deu certo. Tenta de novo.');
          }
        });
      },
    });
  }

  function mostrarErroLista() {
    $('#categorias').innerHTML = `
      <div class="lista-erro">
        <img src="assets/img/erro-sm.webp" alt="Vinícius enrolado num fio de lampadinhas" width="200" height="520">
        <h3>A planilha tropeçou numa caixa da mudança.</h3>
        <p>Não deu para carregar a lista agora. Confere sua internet e tenta de novo.</p>
        <button type="button" class="btn btn-coral" id="tentar-lista">Tentar de novo</button>
      </div>`;
    assinaturaAtual = '';
    $('#tentar-lista').addEventListener('click', async (ev) => {
      ev.currentTarget.classList.add('carregando');
      const ok = await recarregar();
      if (!ok) ev.currentTarget.classList.remove('carregando');
    });
  }

  // ------------------------------------------------------------------------
  // Confirmação de presença

  function prepararRsvp() {
    const form = $('#rsvp-form');
    const escolha = $('#rsvp-escolha');
    const campoAcomp = $('#campo-acomp');
    const nome = $('#rsvp-nome');
    const recado = $('#rsvp-recado');

    nome.value = nomeSalvo();
    recado.value = API.guardar.ler('luau.recado') || '';

    function atualizarEscolha() {
      const vai = form.elements.vai.value === 'sim';
      escolha.classList.toggle('nao', !vai);
      campoAcomp.classList.toggle('oculto', !vai);
    }
    $$('input[name="vai"]', form).forEach((r) => r.addEventListener('change', atualizarEscolha));
    atualizarEscolha();

    function atualizarAcomp() {
      const n = estado.acompanhantes;
      $('#acomp-valor').textContent = n;
      $('#acomp-legenda').textContent = n === 0 ? 'Só eu mesmo' : n === 1 ? 'Eu + 1' : `Eu + ${n}`;
      $('[data-delta="-1"]', form).disabled = n <= 0;
      $('[data-delta="1"]', form).disabled = n >= 10;
    }
    $$('.contador-btn', form).forEach((b) =>
      b.addEventListener('click', () => {
        estado.acompanhantes = Math.max(0, Math.min(10, estado.acompanhantes + Number(b.dataset.delta)));
        atualizarAcomp();
        if (temGsap) gsap.fromTo('#acomp-valor', { scale: 1.35 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      })
    );
    atualizarAcomp();
    prepararRsvp.atualizarAcomp = atualizarAcomp;
    prepararRsvp.atualizarEscolha = atualizarEscolha;

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const erro = $('#rsvp-erro');
      const n = nome.value.trim().replace(/\s+/g, ' ');
      if (!n) {
        nome.closest('.campo').classList.add('invalido');
        erro.textContent = 'Coloca seu nome para a gente saber quem vem.';
        nome.focus();
        return;
      }
      nome.closest('.campo').classList.remove('invalido');
      erro.textContent = '';
      const vai = form.elements.vai.value === 'sim';
      API.guardar.gravar('luau.nome', n);
      API.guardar.gravar('luau.recado', recado.value.trim());
      const botao = $('#rsvp-enviar');
      botao.classList.add('carregando');
      try {
        const dados = await API.confirmar({
          nome: n,
          vai: vai,
          acompanhantes: vai ? estado.acompanhantes : 0,
          recado: recado.value.trim(),
        });
        estado.dados = dados;
        estado.editandoRsvp = false;
        estado.revelacaoAnimada = false;
        renderizarTudo({ animarRsvp: true });
      } catch (e) {
        if (e.codigo === 'rede') abrirErro(() => form.requestSubmit());
        else erro.textContent = e.message || 'Não deu certo. Tenta de novo.';
      } finally {
        botao.classList.remove('carregando');
      }
    });
  }

  function renderizarRsvp(animar) {
    const d = estado.dados;
    const minha = d && d.eu && d.eu.confirmacao;
    const form = $('#rsvp-form');
    const feito = $('#rsvp-feito');

    if (!minha || estado.editandoRsvp) {
      form.hidden = false;
      feito.hidden = true;
      return;
    }

    form.hidden = true;
    feito.hidden = false;
    const nome = primeiroNome(minha.nome);

    if (minha.vai) {
      const local = d.local || {};
      const acomp = minha.acompanhantes || 0;
      const temKokua = chave(local.nome).indexOf('kokua') >= 0;
      const end = enderecoCompleto();
      feito.innerHTML = `
        <div class="feito-check"><svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
        <p class="sobretitulo" style="color:var(--folha-clara)">Presença confirmada</p>
        <h3 class="feito-titulo">Te vejo no luau, ${escapar(nome)}!</h3>
        <p class="feito-acomp">${acomp ? `Você e mais ${plural(acomp, 'pessoa', 'pessoas')}. Anotado.` : 'Anotado. Pode ir separando a camisa florida.'}</p>
        <div class="revelacao">
          <div class="cadeado-aberto"><svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path class="haste" d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></g></svg></div>
          <p class="revelacao-sobre">O luau é no</p>
          <p class="revelacao-local" id="revelacao-local">${escapar(local.nome || 'local secreto')}</p>
          ${temKokua ? '<p class="revelacao-kokua">Lembra do <em>kōkua</em> lá em cima? Pois é. Agora fez sentido.</p>' : ''}
          ${end ? `<p class="revelacao-endereco">${escapar(end)}</p>` : ''}
        </div>
        <div class="botoes-mapa">
          <a class="btn btn-claro" href="${escapar(local.maps || '#')}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-pin"/></svg>Google Maps</a>
          <a class="btn btn-claro" href="${escapar(local.waze || '#')}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-nav"/></svg>Waze</a>
        </div>
        <div class="botoes-agenda">
          <a class="btn btn-vidro" href="${escapar(linkGoogleAgenda())}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-agenda"/></svg>Google Agenda</a>
          <button class="btn btn-vidro" type="button" data-ics><svg class="ic"><use href="#i-agenda"/></svg>iPhone / outros</button>
        </div>
        <p class="feito-rodape"><button class="link" type="button" data-mudar>Mudar minha resposta</button></p>`;
      $('[data-ics]', feito).addEventListener('click', baixarIcs);
    } else {
      feito.innerHTML = `
        <div class="feito-nao">
          <img src="assets/img/drama.webp" alt="Vinícius ajoelhado em drama de novela" width="574" height="949">
          <h3 class="feito-titulo">Tudo bem, ${escapar(nome)}.</h3>
          <p>O presente ainda pode ir sem você 👀</p>
          <a class="btn btn-coral" href="#lista" data-ir><svg class="ic"><use href="#i-presente"/></svg>Ver a lista de presentes</a>
        </div>
        <p class="feito-rodape"><button class="link" type="button" data-mudar>Mudar minha resposta</button></p>`;
    }

    $('[data-mudar]', feito).addEventListener('click', () => {
      estado.editandoRsvp = true;
      const f = $('#rsvp-form');
      $('#rsvp-nome').value = minha.nome || nomeSalvo();
      f.elements.vai.value = minha.vai ? 'sim' : 'nao';
      estado.acompanhantes = minha.acompanhantes || 0;
      prepararRsvp.atualizarEscolha();
      prepararRsvp.atualizarAcomp();
      renderizarRsvp(false);
      if (temGsap) gsap.fromTo(f, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
      irPara('#confirmar');
    });

    if (animar && !estado.revelacaoAnimada) {
      estado.revelacaoAnimada = true;
      animarRevelacao(feito, minha.vai);
    } else if (temGsap) {
      gsap.set(feito, { clearProps: 'opacity,transform' });
    }
  }

  function animarRevelacao(feito, vai) {
    if (!temGsap) return;
    const tl = gsap.timeline();
    tl.fromTo(feito, { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' });
    if (vai) {
      const check = $('.feito-check', feito);
      tl.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'back.out(2.5)' }, 0.15)
        .fromTo($('path', check), { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, 0.4)
        .fromTo($('.revelacao', feito), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.5)
        .to($('.cadeado-aberto .haste', feito), { y: -3.5, rotation: -25, transformOrigin: '100% 100%', duration: 0.5, ease: 'back.out(3)' }, 0.95);
      const local = $('#revelacao-local', feito);
      if (SplitText && local) {
        const split = SplitText.create(local, { type: 'words,chars', wordsClass: 'palavra', charsClass: 'char' });
        tl.from(split.chars, { yPercent: 80, opacity: 0, rotation: 12, duration: 0.6, stagger: 0.04, ease: 'back.out(2)' }, 1.05);
      }
      tl.fromTo(
        $$('.revelacao-kokua, .revelacao-endereco, .botoes-mapa .btn, .botoes-agenda .btn, .feito-rodape', feito),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' },
        1.4
      );
      tl.add(() => soltarConfete($('.revelacao', feito)), 1.2);
    } else {
      tl.from($('.feito-nao img', feito), { y: 40, rotation: -8, scale: 0.8, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.1);
    }
    setTimeout(() => irPara(feito), 50);
  }

  function datasAgenda() {
    const inicio = dataEvento();
    const fim = new Date(inicio.getTime() + (CFG.DURACAO_HORAS || 5) * 3600 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return { inicio: fmt(inicio), fim: fmt(fim) };
  }

  function localAgenda() {
    const local = estado.dados && estado.dados.local;
    return [local && local.nome, enderecoCompleto()].filter(Boolean).join(', ');
  }

  function linkGoogleAgenda() {
    const d = datasAgenda();
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Luau da Casa Nova do Vinícius 🌺',
      dates: `${d.inicio}/${d.fim}`,
      details: 'Chá de casa nova do Vinícius. Lista de presentes: ' + location.href.split('#')[0],
      location: localAgenda(),
      ctz: 'America/Sao_Paulo',
    });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }

  function baixarIcs() {
    const d = datasAgenda();
    const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Luau da Casa Nova//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:luau-vinicius-${d.inicio}@convite`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART:${d.inicio}`,
      `DTEND:${d.fim}`,
      'SUMMARY:Luau da Casa Nova do Vinícius',
      `LOCATION:${esc(localAgenda())}`,
      `DESCRIPTION:${esc('Chá de casa nova do Vinícius. Lista de presentes: ' + location.href.split('#')[0])}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT3H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Hoje tem luau!',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'luau-do-vinicius.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ------------------------------------------------------------------------
  // Quem vai

  function renderizarNomes() {
    const d = estado.dados;
    const lista = $('#nomes');
    const confirmados = (d && d.confirmados) || [];
    const total = (d && d.totalPessoas) || 0;
    const meu = d && d.eu && d.eu.confirmacao && d.eu.confirmacao.vai ? chave(d.eu.confirmacao.nome) : null;

    $('#quem-total').textContent = confirmados.length
      ? `${plural(total, 'pessoa', 'pessoas')} no luau até agora, contando acompanhantes.`
      : '';

    if (!confirmados.length) {
      lista.innerHTML = '<li class="nomes-vazio">Ninguém confirmou ainda. Seja a primeira pessoa e ganhe… nada. Mas com estilo.</li>';
      return;
    }

    const html = confirmados
      .map((c) => {
        const n = String(c.nome || '').trim();
        let h = 0;
        for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
        const inicial = n.charAt(0).toUpperCase();
        const eu = meu && chave(n) === meu ? ' eu' : '';
        return `<li class="nome${eu}"><span class="avatar" style="--h:${h}">${escapar(inicial)}</span>${escapar(n)}${
          c.acompanhantes ? `<span class="mais">+${c.acompanhantes}</span>` : ''
        }</li>`;
      })
      .join('');
    if (lista.dataset.html === html) return;
    const primeiraVez = !lista.dataset.html;
    lista.dataset.html = html;
    lista.innerHTML = html;
    if (temGsap) {
      const alvos = $$('.nome', lista);
      if (primeiraVez) {
        gsap.set(alvos, { opacity: 0, y: 16, scale: 0.9 });
        ScrollTrigger.create({
          trigger: lista,
          start: 'top 90%',
          once: true,
          onEnter: () => gsap.to(alvos, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.04, ease: 'back.out(1.8)' }),
        });
      }
    }
  }

  // ------------------------------------------------------------------------
  // Janela inferior

  const folha = $('#folha');
  let aoFechar = null;

  function abrirFolha(opcoes) {
    const conteudo = $('#folha-conteudo');
    let fig = $('.folha-fig', folha);
    if (opcoes.figurinha) {
      if (!fig) {
        fig = document.createElement('img');
        fig.className = 'folha-fig';
        fig.alt = '';
        folha.insertBefore(fig, folha.firstChild);
      }
      fig.src = opcoes.figurinha;
      folha.classList.add('folha-com-fig');
    } else {
      if (fig) fig.remove();
      folha.classList.remove('folha-com-fig');
    }
    conteudo.innerHTML = opcoes.html;
    $$('[data-fechar]', conteudo).forEach((b) => b.addEventListener('click', () => fecharFolha()));
    $$('[data-ir]', conteudo).forEach(ligarAncora);

    if (!folha.open) folha.showModal();
    estado.folhaAberta = true;
    travarRolagem(true);
    requestAnimationFrame(() => folha.classList.add('aberta'));
    if (temGsap) {
      gsap.fromTo($('.folha-cartao', folha), { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
      if (fig) {
        gsap.fromTo(fig, { y: 80, scale: 0.6, rotation: -10, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.8)', delay: 0.15 });
      }
    }
    if (opcoes.aoAbrir) opcoes.aoAbrir(conteudo);
  }

  function fecharFolha() {
    if (!folha.open) return Promise.resolve();
    folha.classList.remove('aberta');
    const terminar = () => {
      folha.close();
      estado.folhaAberta = false;
      travarRolagem(false);
      if (aoFechar) {
        const f = aoFechar;
        aoFechar = null;
        f();
      }
    };
    if (!temGsap) {
      terminar();
      return Promise.resolve();
    }
    const fig = $('.folha-fig', folha);
    const tl = gsap.timeline({ onComplete: terminar });
    tl.to($('.folha-cartao', folha), { yPercent: 105, duration: 0.38, ease: 'power3.in' }, 0);
    if (fig) tl.to(fig, { y: 120, opacity: 0, duration: 0.3, ease: 'power3.in' }, 0);
    return tl.then();
  }

  folha.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    fecharFolha();
  });
  folha.addEventListener('click', (ev) => {
    if (ev.target === folha) fecharFolha();
  });

  // ------------------------------------------------------------------------
  // Toast

  let timerToast = null;
  function toast(texto) {
    const el = $('#toast');
    el.textContent = texto;
    el.classList.add('visivel');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => el.classList.remove('visivel'), 3200);
  }

  // ------------------------------------------------------------------------
  // Dados

  function renderizarTudo(opcoes) {
    const o = opcoes || {};
    aplicarEvento();
    atualizarContagem();
    renderizarLista();
    if (!estado.editandoRsvp) renderizarRsvp(!!o.animarRsvp);
    renderizarNomes();
  }

  let carregando = null;
  function recarregar() {
    if (carregando) return carregando;
    carregando = API.dados()
      .then((d) => {
        estado.dados = d;
        if (!estado.folhaAberta) renderizarTudo();
        return true;
      })
      .catch(() => {
        if (!estado.dados) mostrarErroLista();
        return false;
      })
      .finally(() => {
        carregando = null;
      });
    return carregando;
  }

  // ------------------------------------------------------------------------
  // Ligações

  function ligarAncora(a) {
    a.addEventListener('click', (ev) => {
      const href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      ev.preventDefault();
      if (estado.folhaAberta) fecharFolha().then(() => irPara(href));
      else irPara(href);
    });
  }

  function ligarEventos() {
    $$('[data-ir]').forEach(ligarAncora);

    $('#categorias').addEventListener('click', (ev) => {
      const item = ev.target.closest('.item');
      if (!item) return;
      if (ev.target.closest('[data-reservar]')) abrirReserva(item.dataset.id);
      else if (ev.target.closest('[data-desfazer]')) abrirDesfazer(item.dataset.id);
    });

    const filtros = $$('[data-so-livres]');
    filtros.forEach((f) =>
      f.addEventListener('change', () => {
        estado.soLivres = f.checked;
        filtros.forEach((g) => (g.checked = f.checked));
        aplicarFiltro();
      })
    );

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && estado.dados) recarregar();
    });
    setInterval(() => {
      if (!document.hidden && !estado.folhaAberta && estado.dados) recarregar();
    }, 45000);
  }

  // ------------------------------------------------------------------------
  // Início

  async function iniciar() {
    if (API.demo) {
      $('#demo-aviso').hidden = false;
      $('#demo-recomecar').addEventListener('click', () => {
        ['luau.demo.v1', 'luau.codigo', 'luau.nome', 'luau.recado'].forEach((k) => API.guardar.apagar(k));
        location.reload();
      });
    }
    iniciarRolagem();
    prepararVarais();
    iniciarAbertura();
    aplicarEvento();
    atualizarContagem();
    setInterval(atualizarContagem, 1000);
    prepararRsvp();
    ligarEventos();

    const minimo = esperar(2100);
    const dados = recarregar();
    await Promise.race([Promise.all([minimo, dados]), esperar(9000)]);
    await document.fonts.ready.catch(() => {});

    efeitosDeRolagem();
    await abrirCortina();
    if (temGsap) ScrollTrigger.refresh();
  }

  iniciar().catch((erro) => {
    console.error(erro);
    document.documentElement.classList.add('sem-animacao');
    document.body.classList.remove('is-loading');
    const loader = $('#loader');
    if (loader) loader.remove();
  });
})();
