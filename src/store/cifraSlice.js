import { createSlice, nanoid } from '@reduxjs/toolkit'

// Tipos de bloco que compõem uma seção
export const TipoBloco = {
  RITMO: 'ritmo',
  ACORDES: 'acordes',
  TABLATURA: 'tablatura',
  LETRA: 'letra',
}

// Cria o objeto `dados` inicial de acordo com o tipo do bloco
function dadosIniciais(tipo) {
  switch (tipo) {
    case TipoBloco.RITMO:
      return { pattern: '', timeSignature: [4, 4] }
    case TipoBloco.ACORDES:
      // acordes: Array<{ nome: string, shapeVariant: number }>
      // shapeVariant indexa a variante do desenho do acorde (0 = primeira, -1 = última)
      return { acordes: [] }
    case TipoBloco.TABLATURA:
      // tab: string única no formato de tablatura ASCII (compatível com TabEditor/TabDisplay)
      return { tab: '' }
    case TipoBloco.LETRA:
      return { texto: '' }
    default:
      return {}
  }
}

// Cria uma nova seção. Uma seção agrupa blocos e define os parâmetros
// musicais herdados por eles (capo, tuning, bpm).
function novaSecao({ titulo, capo, tuning, bpm, blocos } = {}) {
  return {
    id: nanoid(),
    titulo: titulo ?? '',
    capo: capo ?? 0,
    tuning: tuning ?? 0,
    bpm: bpm ?? 0,
    blocos: blocos ?? [],
  }
}

function novoBloco({ tipo, titulo, dados } = {}) {
  return {
    id: nanoid(),
    tipo,
    titulo: titulo ?? '',
    dados: dados ?? dadosIniciais(tipo),
  }
}

const estadoInicial = {
  titulo: '',
  artista: '',
  secoes: [novaSecao()],
}

// Resolve a seção alvo: usa `secaoId` se informado, senão a primeira seção.
function encontrarSecao(state, secaoId) {
  if (secaoId != null) return state.secoes.find((s) => s.id === secaoId)
  return state.secoes[0]
}

const cifraSlice = createSlice({
  name: 'cifra',
  initialState: estadoInicial,
  reducers: {
    setTitulo(state, action) {
      state.titulo = action.payload
    },

    // Adiciona uma nova seção. payload: { titulo?, capo?, tuning?, bpm? }
    adicionarSecao: {
      reducer(state, action) {
        state.secoes.push(action.payload)
      },
      prepare(dados = {}) {
        return { payload: novaSecao(dados) }
      },
    },

    // Atualiza (merge) os parâmetros de uma seção.
    // payload: { id, titulo?, capo?, tuning?, bpm? }
    atualizarSecao(state, action) {
      const { id, ...campos } = action.payload
      const secao = state.secoes.find((s) => s.id === id)
      if (!secao) return
      for (const [chave, valor] of Object.entries(campos)) {
        if (valor !== undefined) secao[chave] = valor
      }
    },

    // Remove uma seção pelo id. payload: id
    removerSecao(state, action) {
      state.secoes = state.secoes.filter((s) => s.id !== action.payload)
    },

    // Adiciona um novo bloco a uma seção.
    // payload: { tipo, titulo?, dados?, secaoId? }
    adicionarBloco: {
      reducer(state, action) {
        const { secaoId, bloco } = action.payload
        const secao = encontrarSecao(state, secaoId)
        if (secao) secao.blocos.push(bloco)
      },
      prepare({ tipo, titulo, dados, secaoId } = {}) {
        return {
          payload: {
            secaoId,
            bloco: novoBloco({ tipo, titulo, dados }),
          },
        }
      },
    },

    // Atualiza o título de um bloco. payload: { id, titulo, secaoId? }
    setTituloBloco(state, action) {
      const { id, titulo, secaoId } = action.payload
      const secao = encontrarSecao(state, secaoId)
      const bloco = secao?.blocos.find((b) => b.id === id)
      if (bloco) bloco.titulo = titulo
    },

    // Atualiza (merge) os dados de um bloco. payload: { id, dados, secaoId? }
    atualizarDadosBloco(state, action) {
      const { id, dados, secaoId } = action.payload
      const secao = encontrarSecao(state, secaoId)
      const bloco = secao?.blocos.find((b) => b.id === id)
      if (bloco) bloco.dados = { ...bloco.dados, ...dados }
    },

    // Remove um bloco pelo id. payload: { id, secaoId? } ou id (usa a primeira seção)
    removerBloco(state, action) {
      const { id, secaoId } =
        typeof action.payload === 'object' ? action.payload : { id: action.payload }
      const secao = encontrarSecao(state, secaoId)
      if (secao) secao.blocos = secao.blocos.filter((b) => b.id !== id)
    },

    // Reordena um bloco dentro de uma seção.
    // payload: { de, para, secaoId? } (índices)
    moverBloco(state, action) {
      const { de, para, secaoId } = action.payload
      const secao = encontrarSecao(state, secaoId)
      if (!secao) return
      if (de < 0 || de >= secao.blocos.length) return
      if (para < 0 || para >= secao.blocos.length) return
      const [bloco] = secao.blocos.splice(de, 1)
      secao.blocos.splice(para, 0, bloco)
    },

    // Carrega uma cifra inteira no store (usado na edição de uma cifra existente).
    // payload: { titulo?, artista?, secoes? }
    carregarCifra(state, action) {
      const cifra = action.payload ?? {}
      const secoes = Array.isArray(cifra.secoes) && cifra.secoes.length > 0
        ? cifra.secoes.map((s) =>
          novaSecao({
            titulo: s.titulo,
            capo: s.capo,
            tuning: s.tuning,
            bpm: s.bpm,
            blocos: (s.blocos ?? []).map((b) => novoBloco({ tipo: b.tipo, titulo: b.titulo, dados: b.dados })),
          }),
        )
        : [novaSecao()]
      return {
        titulo: cifra.titulo ?? '',
        artista: cifra.artista ?? '',
        secoes,
      }
    },

    // Zera a cifra inteira
    resetCifra() {
      return { titulo: '', artista: '', secoes: [novaSecao()] }
    },
  },
})

export const {
  setTitulo,
  adicionarSecao,
  atualizarSecao,
  removerSecao,
  adicionarBloco,
  setTituloBloco,
  atualizarDadosBloco,
  removerBloco,
  moverBloco,
  carregarCifra,
  resetCifra,
} = cifraSlice.actions

// Gera uma assinatura estável do conteúdo semântico da cifra, ignorando
// os `id`s voláteis (regerados por `carregarCifra`/`novaSecao`/`novoBloco`).
// Serve para detectar se houve mudança em relação ao estado carregado.
// payload: { titulo?, artista?, secoes? }
export function assinaturaCifra(cifra = {}) {
  const normalizada = {
    titulo: (cifra.titulo ?? '').trim(),
    artista: (cifra.artista ?? '').trim(),
    secoes: (cifra.secoes ?? []).map((s) => ({
      titulo: s.titulo ?? '',
      capo: s.capo ?? 0,
      tuning: s.tuning ?? 0,
      bpm: s.bpm ?? 0,
      blocos: (s.blocos ?? []).map((b) => ({
        tipo: b.tipo,
        titulo: b.titulo ?? '',
        dados: b.dados ?? {},
      })),
    })),
  }
  return JSON.stringify(normalizada)
}

// Selectors
export const selectCifra = (state) => state.cifra
export const selectTitulo = (state) => state.cifra.titulo
export const selectArtista = (state) => state.cifra.artista
export const selectSecoes = (state) => state.cifra.secoes
export const selectSecaoPorId = (id) => (state) =>
  state.cifra.secoes.find((s) => s.id === id)

// Blocos de todas as seções, achatados (útil para telas que ainda tratam
// a cifra como uma lista única de blocos).
export const selectBlocos = (state) =>
  state.cifra.secoes.flatMap((s) => s.blocos)

export const selectBlocosDaSecao = (secaoId) => (state) =>
  state.cifra.secoes.find((s) => s.id === secaoId)?.blocos ?? []

export const selectBlocoPorId = (id) => (state) => {
  for (const secao of state.cifra.secoes) {
    const bloco = secao.blocos.find((b) => b.id === id)
    if (bloco) return bloco
  }
  return undefined
}

export const selectBlocosPorTipo = (tipo) => (state) =>
  state.cifra.secoes.flatMap((s) => s.blocos).filter((b) => b.tipo === tipo)

export default cifraSlice.reducer
