import { forwardRef, useImperativeHandle, useRef } from 'react'
import './EditorLetra.css'

// Regex que separa a letra em trechos: acordes marcados como [X] e texto comum.
// Ex.: "Amor [G]demais" -> ["Amor ", "[G]", "demais"]
const REGEX_ACORDE = /(\[[^\]]+\])/g

// Escapa HTML para evitar que o texto do usuário seja interpretado como markup
// na camada de destaque (que usa innerHTML via dangerouslySetInnerHTML).
function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Converte o texto cru em HTML, transformando cada [Acorde] em um chip azul.
// O restante vira texto escapado. Mantém as quebras de linha (white-space: pre-wrap).
function construirHighlight(texto) {
  if (!texto) return ''

  const partes = texto.split(REGEX_ACORDE)

  const html = partes
    .map((parte) => {
      const ehAcorde = parte.startsWith('[') && parte.endsWith(']') && parte.length > 2
      if (ehAcorde) {
        // Mantém os colchetes dentro do chip. Assim a camada de destaque tem
        // EXATAMENTE os mesmos caracteres que o textarea por baixo, preservando
        // o alinhamento. Os colchetes ficam esmaecidos para o acorde se destacar.
        const nome = parte.slice(1, -1)
        return (
          `<span class="editor-letra__chip">` +
          `<span class="editor-letra__colchete">[</span>` +
          `${escaparHtml(nome)}` +
          `<span class="editor-letra__colchete">]</span>` +
          `</span>`
        )
      }
      return escaparHtml(parte)
    })
    .join('')

  return html
}

// Editor de letra com destaque de acordes.
// Técnica de overlay: um <textarea> transparente recebe toda a interação
// (digitação, cursor, seleção, colar) e, exatamente atrás e alinhado, uma <div>
// pinta o mesmo texto convertendo os marcadores [Acorde] em chips azuis.
const EditorLetra = forwardRef(function EditorLetra(
  { value = '', onChange, placeholder, rows = 12, className },
  ref,
) {

  const textareaRef = useRef(null)
  const highlightRef = useRef(null)

  // Expõe o textarea interno para quem precisa manipular o cursor (ex.: inserir acorde).
  useImperativeHandle(ref, () => textareaRef.current, [])

  // Mantém a camada de destaque com o mesmo scroll do textarea.
  const sincronizarScroll = () => {
    const ta = textareaRef.current
    const hl = highlightRef.current
    if (!ta || !hl) return
    hl.scrollTop = ta.scrollTop
    hl.scrollLeft = ta.scrollLeft
  }

  return (
    <div className={`editor-letra${className ? ` ${className}` : ''}`}>
      <div
        ref={highlightRef}
        className="editor-letra__highlight"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: construirHighlight(value) }}
      />
      <textarea
        ref={textareaRef}
        className="editor-letra__input"
        value={value}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        onChange={(e) => onChange?.(e)}
        onScroll={sincronizarScroll}
      />
    </div>
  )
})

export default EditorLetra
