import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { faAngleLeft, faSearch, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { RhythmDisplay, RhythmEditor } from 'tab-sketch/react'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import Spacer from '../componentes/Spacer/Spacer'
import { RITMOS_PREDEFINIDOS } from '../ritmos'

const RITMOS_POR_PAGINA = 3

export default function EdicaoRitmo() {
  const navigate = useNavigate()
  const [tituloCardRitmo, settituloCardRitmo] = useState('Ritmo 1')
  const [ritmosVisiveis, setRitmosVisiveis] = useState(RITMOS_POR_PAGINA)

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Card
            title={tituloCardRitmo}
            allowTitleChange
            action={<Button tipo={TipoBotao.AUXILIAR} icon={faTrash} label="Limpar" onClick={() => {console.log('TODO')}} />}
            onTituloChange={(value) => { settituloCardRitmo(value) }}
          >
            <RhythmEditor timeSignature={[4, 4]} />
            <Spacer />
            <Button
              tipo={TipoBotao.PRIMARIO}
              label="Adicionar"
              textAlign='center'
              onClick={() => setRitmosVisiveis((n) => n + RITMOS_POR_PAGINA)}
            />
          </Card>

          <Card
            title={'Biblioteca de ritmos'}
            gap={1}
            action={<Button tipo={TipoBotao.AUXILIAR} icon={faSearch} label="Buscar" onClick={() => {console.log('TODO')}} />}
          >
            {RITMOS_PREDEFINIDOS.slice(0, ritmosVisiveis).map((ritmo) => (
              <Card
                key={ritmo.id}
                title={ritmo.title}
                clickable
                onClick={() => {console.log('TODO')}}
                row
              >
                <RhythmDisplay showBpmLabel={false} pattern={ritmo.pattern} timeSignature={ritmo.timeSignature} />
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
