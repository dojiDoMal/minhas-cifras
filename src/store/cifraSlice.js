import { createSlice, nanoid } from '@reduxjs/toolkit'

// Tipos de bloco que compõem uma cifra
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
      return { acordes: [] }
    case TipoBloco.TABLATURA:
      return { linhas: [] }
    case TipoBloco.LETRA:
      return { texto: '' }
    default:
      return {}
  }
}

const estadoInicial = {
  titulo: '',
  blocos: [],
}

const cifraSlice = createSlice({
  name: 'cifra',
  initialState: estadoInicial,
  reducers: {
    setTitulo(state, action) {
      state.titulo = action.payload
    },

    // Adiciona um novo bloco. payload: { tipo, titulo?, dados? }
    adicionarBloco: {
      reducer(state, action) {
        state.blocos.push(action.payload)
      },
      prepare({ tipo, titulo, dados } = {}) {
        return {
          payload: {
            id: nanoid(),
            tipo,
            titulo: titulo ?? '',
            dados: dados ?? dadosIniciais(tipo),
          },
        }
      },
    },

    // Atualiza o título de um bloco. payload: { id, titulo }
    setTituloBloco(state, action) {
      const { id, titulo } = action.payload
      const bloco = state.blocos.find((b) => b.id === id)
      if (bloco) bloco.titulo = titulo
    },

    // Atualiza (merge) os dados de um bloco. payload: { id, dados }
    atualizarDadosBloco(state, action) {
      const { id, dados } = action.payload
      const bloco = state.blocos.find((b) => b.id === id)
      if (bloco) bloco.dados = { ...bloco.dados, ...dados }
    },

    // Remove um bloco pelo id. payload: id
    removerBloco(state, action) {
      state.blocos = state.blocos.filter((b) => b.id !== action.payload)
    },

    // Reordena um bloco. payload: { de, para } (índices)
    moverBloco(state, action) {
      const { de, para } = action.payload
      if (de < 0 || de >= state.blocos.length) return
      if (para < 0 || para >= state.blocos.length) return
      const [bloco] = state.blocos.splice(de, 1)
      state.blocos.splice(para, 0, bloco)
    },

    // Zera a cifra inteira
    resetCifra() {
      return estadoInicial
    },
  },
})

export const {
  setTitulo,
  adicionarBloco,
  setTituloBloco,
  atualizarDadosBloco,
  removerBloco,
  moverBloco,
  resetCifra,
} = cifraSlice.actions

// Selectors
export const selectCifra = (state) => state.cifra
export const selectBlocos = (state) => state.cifra.blocos
export const selectBlocoPorId = (id) => (state) =>
  state.cifra.blocos.find((b) => b.id === id)
export const selectBlocosPorTipo = (tipo) => (state) =>
  state.cifra.blocos.filter((b) => b.tipo === tipo)

export default cifraSlice.reducer
