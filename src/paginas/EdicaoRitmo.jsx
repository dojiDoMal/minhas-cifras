import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { faAngleLeft, faSearch, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { RhythmDisplay, RhythmEditor } from 'tab-sketch/react'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import Spacer from '../componentes/Spacer/Spacer'
import { RITMOS_PREDEFINIDOS } from '../ritmos'
import { TipoBloco, adicionarBloco } from '../store/cifraSlice'

const RITMOS_POR_PAGINA = 3

export default function EdicaoRitmo() {

  const editorRef = useRef();

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [ritmosVisiveis, setRitmosVisiveis] = useState(RITMOS_POR_PAGINA)

  // Rascunho local do ritmo desenhado à mão. Só vira bloco ao clicar em "Adicionar".
  const [tituloCardRitmo, setTituloCardRitmo] = useState('Ritmo 1')
  const [pattern, setPattern] = useState('')

  // Adiciona o ritmo desenhado à mão como bloco e volta para a edição da cifra
  const adicionarRitmoManual = () => {
    dispatch(
      adicionarBloco({
        tipo: TipoBloco.RITMO,
        titulo: tituloCardRitmo,
        dados: { pattern, timeSignature: [4, 4] },
      }),
    )
    navigate('/edicao-cifra')
  }

  // Adiciona um ritmo predefinido como bloco e volta para a edição da cifra
  const adicionarRitmoPredefinido = (ritmoPredefinido) => {
    dispatch(
      adicionarBloco({
        tipo: TipoBloco.RITMO,
        titulo: ritmoPredefinido.title,
        dados: {
          pattern: ritmoPredefinido.pattern,
          timeSignature: ritmoPredefinido.timeSignature,
        },
      }),
    )
    navigate('/edicao-cifra')
  }

  return (
    <div className="container">
      <nav className="nav-top">
        <button className="nav-icon" onClick={() => navigate('/edicao-cifra')}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <span className="nav-title">Edição de ritmo</span>
        <span className="nav-icon" />
      </nav>

      <div className="main">
        <div className='main-content'>
          <Card
            title={tituloCardRitmo}
            allowTitleChange
            action={
              <Button
                tipo={TipoBotao.AUXILIAR}
                icon={faTrash}
                label="Limpar"
                onClick={() => {
                  editorRef?.current?.clear()
                  setPattern('')
                }}
              />
            }
            onTituloChange={(value) => { setTituloCardRitmo(value) }}
          >
            <RhythmEditor
              ref={editorRef}
              onChange={(value) => {
                setPattern(value)
              }}
              timeSignature={[4, 4]}
            />
            <Spacer />
            <Button
              tipo={TipoBotao.PRIMARIO}
              label="Adicionar"
              textAlign='center'
              onClick={adicionarRitmoManual}
            />
          </Card>

          <Card
            title={'Biblioteca de ritmos'}
            gap={1}
            action={<Button tipo={TipoBotao.AUXILIAR} icon={faSearch} label="Buscar" onClick={() => { console.log('TODO') }} />}
          >
            {RITMOS_PREDEFINIDOS.slice(0, ritmosVisiveis).map((ritmoPredefinido) => (
              <Card
                key={ritmoPredefinido.id}
                title={ritmoPredefinido.title}
                clickable
                onClick={() => adicionarRitmoPredefinido(ritmoPredefinido)}
                row
              >
                <RhythmDisplay showBpmLabel={false} pattern={ritmoPredefinido.pattern} timeSignature={ritmoPredefinido.timeSignature} />
              </Card>
            ))}
            <Spacer />
            {ritmosVisiveis < RITMOS_PREDEFINIDOS.length && (
              <Button
                tipo={TipoBotao.PRIMARIO}
                label="Exibir mais"
                textAlign='center'
                onClick={() => setRitmosVisiveis((n) => n + RITMOS_POR_PAGINA)}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
