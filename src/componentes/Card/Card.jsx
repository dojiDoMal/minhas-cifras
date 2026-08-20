import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen } from '@fortawesome/free-solid-svg-icons'
import Button, { TipoBotao } from '../Button/Button'
import './Card.css'

export default function Card({ icon, iconClass, iconBadge, title, subtitle, action, children, showButtonHint, allowTitleChange, onTituloChange, row, gap }) {
  const [editando, setEditando] = useState(false)
  const [tituloTemp, setTituloTemp] = useState(title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editando])

  useEffect(() => {
    setTituloTemp(title)
  }, [title])

  function confirmarEdicao() {
    const novoTitulo = tituloTemp.trim()
    if (novoTitulo && novoTitulo !== title) {
      onTituloChange?.(novoTitulo)
    } else {
      setTituloTemp(title)
    }
    setEditando(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      confirmarEdicao()
    } else if (e.key === 'Escape') {
      setTituloTemp(title)
      setEditando(false)
    }
  }

  return (
    <div className={`card${row ? ' card-row' : ''}`}>
      <div className='card-header'>
        <div className='card-header-info'>
          {(icon || iconBadge) && (
            <span className='card-header-icon-wrapper'>
              {icon && <span className={`card-header-icon ${iconClass ?? ''}`}><FontAwesomeIcon icon={icon} /></span>}
              {iconBadge}
            </span>
          )}
          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editando ? (
                <input
                  ref={inputRef}
                  className='card-title-input'
                  value={tituloTemp}
                  onChange={(e) => setTituloTemp(e.target.value)}
                  onBlur={confirmarEdicao}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <>
                  <span>{title}</span>
                  {allowTitleChange && (
                    <Button tipo={TipoBotao.DISCRETO} icon={faPen} onClick={() => setEditando(true)} />
                  )}
                </>
              )}
              {showButtonHint && (<Button tipo={TipoBotao.DISCRETO_ALT} label={'?'} />)}
            </div>
            {subtitle && <span className='card-subtitle'>{subtitle}</span>}
          </label>
        </div>
        {action}
      </div>
      {children && (
        <div className='card-content' style={gap != null ? { gap: `${gap * 8}px` } : undefined}>{children}</div>
      )}
    </div>
  )
}
