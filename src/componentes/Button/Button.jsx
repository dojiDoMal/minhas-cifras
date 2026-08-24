import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './Button.css'

export const TipoBotao = {
  DISCRETO_ALT: 'discreto-alt',
  DISCRETO: 'discreto',
  AUXILIAR: 'auxiliar',
  PRIMARIO: 'primario',
  SECUNDARIO: 'secundario',
  FLUTUANTE: 'flutuante',
  FLUTUANTE_ACAO: 'flutuante-acao',
}

export default function Button({
  tipo = TipoBotao.AUXILIAR,
  icon,
  label,
  tall,
  small,
  textAlign,
  className,
  ...props
}) {

  const classes = [
    `btn-${tipo}`,
    tall && 'btn-tall',
    small && 'btn-small',
    textAlign === 'center' && 'btn-text-center',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} {...props}>
      {icon && <FontAwesomeIcon icon={icon} />}
      {label && <span>{label}</span>}
    </button>
  )
}

export function FloatingMenu({ icon, acoes = [] }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="floating-menu">
      {aberto && (
        <div className="floating-menu-acoes">
          {acoes.map((acao, i) => (
            <button
              key={i}
              className="btn-flutuante-acao"
              onClick={() => { acao.onClick?.(); setAberto(false) }}
            >
              {acao.icon && <FontAwesomeIcon icon={acao.icon} />}
              <span>{acao.label}</span>
            </button>
          ))}
        </div>
      )}
      <button className="btn-flutuante" onClick={() => setAberto(!aberto)}>
        {icon && <FontAwesomeIcon icon={icon} />}
      </button>
    </div>
  )
}
