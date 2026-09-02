import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faDeleteLeft,
  faRotateLeft,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons'
import './PainelTablatura.css'

// Painel inferior arrastável com controles simples para editar a tablatura.
// Opera sobre a API imperativa exposta pelo `TabEditor` via `editorRef`:
//   addColumnBefore / addColumnAfter / removeColumnBefore / removeColumnAfter
//   undo / redo
// - Handle no topo: clicar alterna minimizado/expandido.
// - Arrastar o handle para baixo minimiza; arrastar para cima expande.
export default function PainelTablatura({ editorRef }) {

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

  // Aciona um método da API do editor, se disponível.
  const acionar = (metodo) => () => {
    editorRef?.current?.[metodo]?.()
  }

  const controles = [
    { icone: faArrowLeft, label: 'Adicionar coluna antes', onClick: acionar('addColumnBefore') },
    { icone: faArrowRight, label: 'Adicionar coluna depois', onClick: acionar('addColumnAfter') },
    { icone: faDeleteLeft, label: 'Remover coluna antes', onClick: acionar('removeColumnBefore') },
    { icone: faDeleteLeft, label: 'Remover coluna depois', onClick: acionar('removeColumnAfter'), espelhar: true },
    { icone: faRotateLeft, label: 'Desfazer', onClick: acionar('undo') },
    { icone: faRotateRight, label: 'Refazer', onClick: acionar('redo') },
  ]

  return (
    <div className={`painel-tablatura${minimizado ? ' painel-tablatura--minimizado' : ''}`}>
      <div
        className="painel-tablatura__handle"
        role="button"
        tabIndex={0}
        aria-label={minimizado ? 'Expandir painel de tablatura' : 'Minimizar painel de tablatura'}
        aria-expanded={!minimizado}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onHandleKeyDown}
      >
        <span className="painel-tablatura__handle-barra" />
      </div>

      <div className="painel-tablatura__conteudo">
        <label className="painel-tablatura__label">Controles da tablatura</label>

        <div className="painel-tablatura__grade">
          {controles.map((controle) => (
            <button
              key={controle.label}
              type="button"
              className="btn-auxiliar btn-text-center painel-tablatura__botao"
              aria-label={controle.label}
              title={controle.label}
              onClick={controle.onClick}
            >
              <FontAwesomeIcon
                icon={controle.icone}
                style={controle.espelhar ? { transform: 'scaleX(-1)' } : undefined}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
