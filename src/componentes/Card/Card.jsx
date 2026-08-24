import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen } from '@fortawesome/free-solid-svg-icons'
import Button, { TipoBotao } from '../Button/Button'
import './Card.css'

function Card({
  icon,
  iconClass,
  iconBadge,
  title,
  subtitle,
  action,
  children,
  showButtonHint,
  allowTitleChange,
  allowEdit,
  onTituloChange,
  onSubtituloChange,
  row,
  gap,
  clickable,
  onClick
}, ref) {

  const [editando, setEditando] = useState(false)
  const [tituloTemp, setTituloTemp] = useState(title)
  const [tituloOld, setTituloOld] = useState()
  const [subtituloTemp, setSubtituloTemp] = useState(subtitle)
  const [subtituloOld, setSubtituloOld] = useState()
  const titleInputRef = useRef(null)
  const subtitleInputRef = useRef(null)
  const editWrapperRef = useRef(null)

  const podeEditar = allowTitleChange || allowEdit

  useEffect(() => {
    if (editando && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
    if (editando) {
      setTituloOld(tituloTemp)
      setTituloTemp('')
      setSubtituloOld(subtituloTemp)
      setSubtituloTemp('')
    }
  }, [editando])

  useEffect(() => {
    setTituloTemp(title)
  }, [title])

  useEffect(() => {
    setSubtituloTemp(subtitle)
  }, [subtitle])

  function iniciarEdicao() {
    if (!podeEditar) return
    setTituloTemp(title)
    setSubtituloTemp(subtitle)
    setEditando(true)
  }

  function confirmarEdicao() {
    const novoTitulo = tituloTemp.trim()
    if (novoTitulo && novoTitulo !== title) {
      onTituloChange?.(novoTitulo)
    } else {
      setTituloTemp(title)
    }

    if (allowEdit) {
      const novoSubtitulo = subtituloTemp.trim()
      if (novoSubtitulo && novoSubtitulo !== subtitle) {
        onSubtituloChange?.(novoSubtitulo)
      } else {
        setSubtituloTemp(subtitle)
      }
    }

    setEditando(false)
  }

  function cancelarEdicao() {
    setTituloTemp(title)
    setSubtituloTemp(subtitle)
    setEditando(false)
  }

  // Só confirma quando o foco realmente saiu dos campos de edição
  // (evita fechar ao mover o foco do input de título para o de subtítulo).
  function handleBlur(e) {
    if (editWrapperRef.current?.contains(e.relatedTarget)) return
    confirmarEdicao()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      confirmarEdicao()
    } else if (e.key === 'Escape') {
      cancelarEdicao()
    }
  }

  useImperativeHandle(ref, () => ({
    iniciarEdicao,
    confirmarEdicao,
    cancelarEdicao,
    get editando() {
      return editando
    }
  }))

  return (
    <div
      className={`card${row ? ' card-row' : ''}${clickable ? ' card-clickable' : ''}${editando ? ' card-editing' : ''}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(e)
        }
      } : undefined}
    >
      <div className='card-header'>
        <div className='card-header-info'>
          {(icon || iconBadge) && (
            <span className='card-header-icon-wrapper'>
              {icon && <span className={`card-header-icon ${iconClass ?? ''}`}><FontAwesomeIcon icon={icon} /></span>}
              {iconBadge}
            </span>
          )}
          <label ref={editWrapperRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editando ? (
                <input
                  ref={titleInputRef}
                  className='card-title-input'
                  value={tituloTemp}
                  placeholder={tituloOld}
                  onChange={(e) => setTituloTemp(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <>
                  <span>{title}</span>
                  {allowTitleChange && (
                    <Button tipo={TipoBotao.DISCRETO} icon={faPen} onClick={iniciarEdicao} />
                  )}
                </>
              )}
              {showButtonHint && (<Button tipo={TipoBotao.DISCRETO_ALT} label={'?'} />)}
            </div>
            {(subtitle || (editando && allowEdit)) && (editando && allowEdit
              ? (
                <input
                  ref={subtitleInputRef}
                  className='card-subtitle-input'
                  value={subtituloTemp}
                  placeholder={subtituloOld}
                  onChange={(e) => setSubtituloTemp(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                />
              )
              : <span className='card-subtitle'>{subtitle}</span>
            )}
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

export default forwardRef(Card)
