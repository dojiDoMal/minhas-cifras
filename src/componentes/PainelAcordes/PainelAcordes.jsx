import { useRef, useState } from 'react'
import './PainelAcordes.css'

// Acordes de exemplo. Substituir pela fonte real (biblioteca/store) quando integrar.
const ACORDES_EXEMPLO = ['G', 'C', 'A', 'A#', 'F7M/C', 'Cm', 'Em']

// Painel inferior arrastável para inserir/editar acordes na tela de Edição de letra.
// - Handle no topo: clicar alterna minimizado/expandido.
// - Arrastar o handle para baixo minimiza; arrastar para cima expande.
export default function PainelAcordes({
  acordes = ACORDES_EXEMPLO,
  onSelecionarAcorde,
  onBuscar,
  onMostrarMais,
}) {

  const [minimizado, setMinimizado] = useState(false)

  // Guarda a posição Y inicial do gesto para decidir a direção do arrasto.
  const arrasteInicioY = useRef(null)

  const iniciarArraste = (clientY) => {
    arrasteInicioY.current = clientY
  }

  const finalizarArraste = (clientY) => {
    if (arrasteInicioY.current == null) return

    const delta = clientY - arrasteInicioY.current
    const LIMIAR = 24 // px mínimos para considerar um arrasto (evita conflito com o clique)

    if (delta > LIMIAR) {
      setMinimizado(true)
    } else if (delta < -LIMIAR) {
      setMinimizado(false)
    } else {
      // Movimento pequeno: trata como clique e alterna o estado.
      setMinimizado((v) => !v)
    }

    arrasteInicioY.current = null
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    iniciarArraste(e.clientY)
  }

  const onPointerUp = (e) => {
    finalizarArraste(e.clientY)
  }

  // Acessibilidade: permite alternar via teclado quando o handle está focado.
  const onHandleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setMinimizado((v) => !v)
    }
  }

  return (
    <div className={`painel-acordes${minimizado ? ' painel-acordes--minimizado' : ''}`}>
      <div
        className="painel-acordes__handle"
        role="button"
        tabIndex={0}
        aria-label={minimizado ? 'Expandir painel de acordes' : 'Minimizar painel de acordes'}
        aria-expanded={!minimizado}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onHandleKeyDown}
      >
        <span className="painel-acordes__handle-barra" />
      </div>

      <div className="painel-acordes__conteudo">
        <label className="painel-acordes__label">Inserir/Editar acorde</label>

        <input
          className="painel-acordes__busca"
          placeholder="Buscar acorde..."
          onChange={(e) => onBuscar?.(e.target.value)}
        />

        <div className="painel-acordes__grade">
          {acordes.map((acorde) => (
            <button
              key={acorde}
              type="button"
              className="btn-auxiliar btn-text-center painel-acordes__acorde"
              onClick={() => onSelecionarAcorde?.(acorde)}
            >
              <span>{acorde}</span>
            </button>
          ))}
        </div>

        <div className="painel-acordes__rodape">
          <button
            type="button"
            className="btn-auxiliar btn-text-center"
            onClick={() => onMostrarMais?.()}
            style={{ flex: 1 }}
          >
            <span>Mostrar mais</span>
          </button>
        </div>
      </div>
    </div>
  )
}
