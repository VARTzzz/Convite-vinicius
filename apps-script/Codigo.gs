/**
 * Backend do convite "Luau da Casa Nova do Vinícius".
 *
 * Cole este arquivo inteiro em Extensões > Apps Script da planilha e publique
 * como App da Web (Executar como: eu; Quem pode acessar: qualquer pessoa).
 * O passo a passo completo está em apps-script/COMO-PUBLICAR.md.
 *
 * Abas usadas (os nomes das colunas importam, a ordem não):
 *   Itens          Categoria | Item | Quantidade | Piada | ... | ID
 *   Reservas       Data/hora | ID do item | Item | Nome | Situação | Código
 *   Confirmações   Data/hora | Nome | Resposta | Acompanhantes | Recado | Código
 *   Configuração   Campo | Valor
 */

const ABAS = {
  itens: 'Itens',
  reservas: 'Reservas',
  confirmacoes: 'Confirmações',
  config: 'Configuração',
};

const CACHE_CHAVE = 'dados-v1';
const CACHE_SEGUNDOS = 15;
const MAX_ACOMPANHANTES = 10;

// ---------------------------------------------------------------------------
// Entradas HTTP

function doGet(e) {
  return responder_(() => executar_((e && e.parameter) || {}));
}

function doPost(e) {
  return responder_(() => {
    let corpo = {};
    if (e && e.postData && e.postData.contents) {
      try {
        corpo = JSON.parse(e.postData.contents);
      } catch (_) {
        throw erro_('dados_invalidos', 'Não entendi o pedido.');
      }
    }
    return executar_(corpo);
  });
}

/** Limpa o cache sempre que alguém edita a planilha à mão. */
function onEdit() {
  try {
    CacheService.getScriptCache().remove(CACHE_CHAVE);
  } catch (_) {
    // gatilho simples sem permissão de cache: o cache expira sozinho em segundos
  }
}

// ---------------------------------------------------------------------------
// Ações

function executar_(p) {
  const acao = String(p.acao || 'dados');

  if (acao === 'dados') {
    return montarResposta_(obterDados_(), codigo_(p.codigo, false));
  }

  const codigo = codigo_(p.codigo, true);
  return comTrava_(() => {
    const dados = lerPlanilha_(true);
    if (acao === 'reservar') reservar_(dados, p, codigo);
    else if (acao === 'cancelar') cancelar_(dados, p, codigo);
    else if (acao === 'confirmar') confirmar_(dados, p, codigo);
    else throw erro_('acao_invalida', 'Ação desconhecida.');

    SpreadsheetApp.flush();
    const atualizados = lerPlanilha_(false);
    salvarCache_(atualizados);
    return montarResposta_(atualizados, codigo);
  });
}

function reservar_(dados, p, codigo) {
  const id = texto_(p.item, 40);
  const nome = texto_(p.nome, 60);
  if (!id) throw erro_('dados_invalidos', 'Item não informado.');
  if (!nome) throw erro_('dados_invalidos', 'Diga seu nome para reservar.');

  const item = dados.itens.find((i) => i.id === id);
  if (!item) throw erro_('item_inexistente', 'Esse item saiu da lista.');

  const ativas = dados.reservas.filter((r) => r.id === id && r.ativa);
  if (ativas.some((r) => r.codigo === codigo)) return; // já é dessa pessoa
  if (ativas.length >= item.quantidade) {
    throw erro_('esgotado', 'Alguém foi mais rápido e reservou esse item.');
  }

  const aba = aba_(ABAS.reservas);
  const col = dados.colunas.reservas;
  const valores = {
    data: new Date(),
    id: id,
    item: seguro_(item.nome),
    nome: seguro_(nome),
    situacao: 'ativa',
    codigo: codigo,
  };
  aba.appendRow(linhaNova_(aba, col, valores));
}

function cancelar_(dados, p, codigo) {
  const id = texto_(p.item, 40);
  const aba = aba_(ABAS.reservas);
  const col = dados.colunas.reservas;
  if (col.situacao < 0) throw erro_('planilha', 'A aba Reservas está sem a coluna Situação.');

  dados.reservas
    .filter((r) => r.id === id && r.codigo === codigo && r.ativa)
    .forEach((r) => aba.getRange(r.linha, col.situacao + 1).setValue('cancelada'));
}

function confirmar_(dados, p, codigo) {
  const nome = texto_(p.nome, 60);
  if (!nome) throw erro_('dados_invalidos', 'Diga seu nome para confirmar.');

  const vai = p.vai === true || p.vai === 'sim' || p.vai === 'true';
  let acompanhantes = parseInt(p.acompanhantes, 10);
  if (!vai || isNaN(acompanhantes) || acompanhantes < 0) acompanhantes = 0;
  acompanhantes = Math.min(acompanhantes, MAX_ACOMPANHANTES);
  const recado = texto_(p.recado, 500);

  const aba = aba_(ABAS.confirmacoes);
  const col = dados.colunas.confirmacoes;
  const valores = {
    data: new Date(),
    nome: seguro_(nome),
    resposta: vai ? 'Vou' : 'Não vou',
    acompanhantes: acompanhantes,
    recado: seguro_(recado),
    codigo: codigo,
  };

  const existente = dados.confirmacoes.find((c) => c.codigo === codigo);
  if (existente) {
    Object.keys(valores).forEach((campo) => {
      if (col[campo] >= 0) aba.getRange(existente.linha, col[campo] + 1).setValue(valores[campo]);
    });
  } else {
    aba.appendRow(linhaNova_(aba, col, valores));
  }
}

/** Monta uma linha nova respeitando a posição de cada coluna na aba. */
function linhaNova_(aba, col, valores) {
  const largura = Math.max(aba.getLastColumn(), 6);
  const linha = new Array(largura).fill('');
  Object.keys(valores).forEach((campo) => {
    if (col[campo] >= 0) linha[col[campo]] = valores[campo];
  });
  return linha;
}

// ---------------------------------------------------------------------------
// Leitura da planilha

function obterDados_() {
  const cache = CacheService.getScriptCache();
  const salvo = cache.get(CACHE_CHAVE);
  if (salvo) return JSON.parse(salvo);

  let dados = lerPlanilha_(false);
  if (dados.faltamIds) {
    dados = comTrava_(() => lerPlanilha_(true));
  }
  salvarCache_(dados);
  return dados;
}

/**
 * Lê as quatro abas. Com `atribuirIds`, dá um ID para itens novos que ainda
 * não têm (só pode ser chamado com a trava).
 */
function lerPlanilha_(atribuirIds) {
  const itensTab = tabela_(ABAS.itens);
  const colItens = colunas_(itensTab.cabecalho, {
    categoria: 'categoria',
    nome: 'item',
    quantidade: 'quantidade',
    piada: 'piada',
    id: 'id',
  });
  if (colItens.nome < 0 || colItens.id < 0) {
    throw erro_('planilha', 'A aba Itens precisa das colunas Item e ID.');
  }

  const usados = {};
  itensTab.linhas.forEach((l) => {
    const id = String(l.valores[colItens.id] || '').trim();
    if (id) usados[id] = true;
  });

  const itens = [];
  let faltamIds = false;
  itensTab.linhas.forEach((l) => {
    const v = l.valores;
    const nome = String(v[colItens.nome] || '').trim();
    if (!nome) return;
    let id = String(v[colItens.id] || '').trim();
    if (!id) {
      if (!atribuirIds) {
        faltamIds = true;
        return;
      }
      id = novoId_(usados);
      usados[id] = true;
      aba_(ABAS.itens).getRange(l.linha, colItens.id + 1).setValue(id);
    }
    const quantidade = parseInt(v[colItens.quantidade], 10);
    itens.push({
      id: id,
      categoria: String(v[colItens.categoria] || '').trim() || 'Outros',
      nome: nome,
      piada: colItens.piada >= 0 ? String(v[colItens.piada] || '').trim() : '',
      quantidade: isNaN(quantidade) || quantidade < 1 ? 1 : quantidade,
    });
  });

  const resTab = tabela_(ABAS.reservas);
  const colRes = colunas_(resTab.cabecalho, {
    data: 'data',
    id: 'id do item',
    item: 'item',
    nome: 'nome',
    situacao: 'situacao',
    codigo: 'codigo',
  });
  if (colRes.id < 0 || colRes.situacao < 0 || colRes.codigo < 0) {
    throw erro_('planilha', 'A aba Reservas precisa das colunas ID do item, Situação e Código.');
  }
  const reservas = resTab.linhas
    .map((l) => ({
      linha: l.linha,
      id: String(l.valores[colRes.id] || '').trim(),
      ativa: normalizar_(l.valores[colRes.situacao]) === 'ativa',
      codigo: String(l.valores[colRes.codigo] || '').trim(),
    }))
    .filter((r) => r.id);

  const confTab = tabela_(ABAS.confirmacoes);
  const colConf = colunas_(confTab.cabecalho, {
    data: 'data',
    nome: 'nome',
    resposta: 'resposta',
    acompanhantes: 'acompanhantes',
    recado: 'recado',
    codigo: 'codigo',
  });
  const confirmacoes = confTab.linhas
    .map((l) => ({
      linha: l.linha,
      nome: String(l.valores[colConf.nome] || '').trim(),
      vai: normalizar_(l.valores[colConf.resposta]) === 'vou',
      acompanhantes: Math.max(0, parseInt(l.valores[colConf.acompanhantes], 10) || 0),
      codigo: String(l.valores[colConf.codigo] || '').trim(),
    }))
    .filter((c) => c.nome);

  const config = {};
  tabela_(ABAS.config).linhas.forEach((l) => {
    const campo = normalizar_(l.valores[0]);
    if (campo) config[campo] = String(l.valores[1] || '').trim();
  });

  return {
    itens: itens,
    reservas: reservas,
    confirmacoes: confirmacoes,
    config: config,
    faltamIds: faltamIds,
    colunas: { reservas: colRes, confirmacoes: colConf },
  };
}

function montarResposta_(dados, codigo) {
  const ativas = {};
  const minhas = {};
  dados.reservas.forEach((r) => {
    if (!r.ativa) return;
    ativas[r.id] = (ativas[r.id] || 0) + 1;
    if (codigo && r.codigo === codigo) minhas[r.id] = true;
  });

  const itens = dados.itens.map((i) => ({
    id: i.id,
    categoria: i.categoria,
    nome: i.nome,
    piada: i.piada,
    quantidade: i.quantidade,
    reservados: Math.min(ativas[i.id] || 0, i.quantidade),
    meu: !!minhas[i.id],
  }));

  const vao = dados.confirmacoes.filter((c) => c.vai);
  const minha = codigo ? dados.confirmacoes.find((c) => c.codigo === codigo) : null;
  const cfg = dados.config;

  const evento = {
    data: campo_(cfg, 'data'),
    endereco: campo_(cfg, 'endereco'),
    bairro: campo_(cfg, 'bairro'),
    cidade: campo_(cfg, 'cidade'),
  };

  const resposta = {
    evento: evento,
    itens: itens,
    confirmados: vao.map((c) => ({ nome: c.nome, acompanhantes: c.acompanhantes })),
    totalPessoas: vao.reduce((soma, c) => soma + 1 + c.acompanhantes, 0),
    eu: {
      confirmacao: minha ? { nome: minha.nome, vai: minha.vai, acompanhantes: minha.acompanhantes } : null,
    },
    local: null,
  };

  if (minha && minha.vai) {
    const nomeLocal = campo_(cfg, 'nome do local');
    const enderecoCompleto = [evento.endereco, evento.bairro, evento.cidade].filter(String).join(', ');
    resposta.local = {
      nome: nomeLocal,
      maps:
        campo_(cfg, 'link do google maps') ||
        'https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent([nomeLocal, enderecoCompleto].filter(String).join(', ')),
      waze:
        campo_(cfg, 'link do waze') ||
        'https://waze.com/ul?q=' + encodeURIComponent(enderecoCompleto || nomeLocal) + '&navigate=yes',
    };
  }

  return resposta;
}

// ---------------------------------------------------------------------------
// Utilidades

function responder_(fn) {
  let saida;
  try {
    saida = Object.assign({ ok: true }, fn());
  } catch (e) {
    if (!(e && e.codigo)) console.error(e && e.stack ? e.stack : e);
    saida = {
      ok: false,
      erro: (e && e.codigo) || 'erro',
      mensagem: e && e.codigo ? e.message : 'Algo deu errado. Tenta de novo.',
    };
  }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}

function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(20000)) {
    throw erro_('ocupado', 'Muita gente mexendo ao mesmo tempo. Tenta de novo em alguns segundos.');
  }
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}

function salvarCache_(dados) {
  try {
    CacheService.getScriptCache().put(CACHE_CHAVE, JSON.stringify(dados), CACHE_SEGUNDOS);
  } catch (_) {
    // dados grandes demais para o cache: segue sem cache
  }
}

function aba_(nome) {
  const aba = SpreadsheetApp.getActive().getSheetByName(nome);
  if (!aba) throw erro_('planilha', 'Não encontrei a aba "' + nome + '".');
  return aba;
}

/** Valores exibidos da aba, com o número real de cada linha. */
function tabela_(nome) {
  const valores = aba_(nome).getDataRange().getDisplayValues();
  const cabecalho = (valores[0] || []).map(normalizar_);
  const linhas = [];
  for (let i = 1; i < valores.length; i++) {
    if (valores[i].some((v) => String(v).trim() !== '')) {
      linhas.push({ linha: i + 1, valores: valores[i] });
    }
  }
  return { cabecalho: cabecalho, linhas: linhas };
}

/** Acha o índice de cada coluna pelo começo do nome do cabeçalho. */
function colunas_(cabecalho, procurados) {
  const indices = {};
  Object.keys(procurados).forEach((chave) => {
    const alvo = procurados[chave];
    let idx = cabecalho.indexOf(alvo);
    if (idx < 0) idx = cabecalho.findIndex((c) => c.indexOf(alvo) === 0);
    indices[chave] = idx;
  });
  return indices;
}

function campo_(config, inicio) {
  const chave = Object.keys(config).find((k) => k.indexOf(inicio) === 0);
  return chave ? config[chave] : '';
}

function normalizar_(v) {
  return String(v == null ? '' : v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function texto_(v, max) {
  return String(v == null ? '' : v)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Impede que um texto digitado vire fórmula na planilha. */
function seguro_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function codigo_(v, obrigatorio) {
  const s = String(v == null ? '' : v).trim();
  if (/^[A-Za-z0-9-]{8,64}$/.test(s)) return s;
  if (obrigatorio) throw erro_('codigo_invalido', 'Recarregue a página e tente de novo.');
  return '';
}

function novoId_(usados) {
  let id;
  do {
    id = 'i' + Utilities.getUuid().replace(/-/g, '').slice(0, 6);
  } while (usados[id]);
  return id;
}

function erro_(codigo, mensagem) {
  const e = new Error(mensagem);
  e.codigo = codigo;
  return e;
}
