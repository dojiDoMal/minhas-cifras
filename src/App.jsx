import { FILTROS, FILTROS_CONFIG_DEFAULT, filtrar } from './filtro'
import { useState, useMemo, useRef } from 'react'
import Navbar from './componentes/Navbar/Navbar'
import Filtros from './paginas/Filtros'
import Resultados from './paginas/Resultados'
import './App.css'
import Button, { FloatingMenu, TipoBotao } from './componentes/Button/Button'
import { faBook, faMusic, faPen, faPlus } from '@fortawesome/free-solid-svg-icons'
import { RhythmDisplay, RhythmEditor } from 'tab-sketch/react'
import Card from './componentes/Card/Card'

export default function App() {
  const [tituloCardRitmo, settituloCardRitmo] = useState('Ritmo 1')
  const [texto, setTexto] = useState('')
  const [ativos, setAtivos] = useState(new Set(FILTROS.map(f => f.id)))
  const [filtrosConfig, setFiltrosConfig] = useState(FILTROS_CONFIG_DEFAULT)
  const [tab, setTab] = useState('filtros')
  const [expandidos, setExpandidos] = useState(new Set())

  const [ritmoItems, setRitmoItems] = useState([
    { id: 'down', content: <span style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>➝</span> },
    { id: 'up', content: <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>➝</span> },
    { id: 'mute', content: '\u2A2F' },
    { id: 'rest', content: '-' },
  ])
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const handleDragStart = (index) => {
    dragItem.current = index
  }

  const handleDragEnter = (index) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const items = [...ritmoItems]
    const [dragged] = items.splice(dragItem.current, 1)
    items.splice(dragOverItem.current, 0, dragged)
    setRitmoItems(items)
    dragItem.current = null
    dragOverItem.current = null
  }

  const toggleExpandido = id =>
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggle = id =>
    setAtivos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const resultado = useMemo(() => filtrar(texto, ativos, filtrosConfig), [texto, ativos, filtrosConfig])

  const total = texto.trim() ? texto.trim().split('\n').filter(Boolean).length : 0
  const removidos = useMemo(() => {
    const s = new Set(resultado)
    return texto.trim().split('\n').map(j => j.trim()).filter(j => j && !s.has(j))
  }, [texto, resultado])

  return (
    <div className="container">
      <Navbar tab={tab} setTab={setTab} />

      <div className="main">
        {tab === 'filtros' && (
          <>
            <FloatingMenu
              icon={faPlus}
              acoes={[
                { label: 'Tablatura', onClick: () => { /* ... */ } },
                { label: 'Acordes', onClick: () => { /* ... */ } },
                { label: 'Ritmo', onClick: () => { /* ... */ } },
                { label: 'Letra', onClick: () => { /* ... */ } },
              ]}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Card
                title={tituloCardRitmo}
                allowTitleChange
                onTituloChange={(value) => { settituloCardRitmo(value) }}
              >
                <RhythmEditor timeSignature={[4, 4]} />
              </Card>

              <Card
                title={'Biblioteca de ritmos'}
                gap={1}
              >
                <Card
                  title={'Rock 1'}
                  row
                >
                  <RhythmDisplay showBpmLabel={false} pattern='D---DUD-DUD---UD' timeSignature={[4, 4]} />
                </Card>
                <Card
                  title={'Reggae 1'}
                  row
                >
                  <RhythmDisplay showBpmLabel={false} pattern='CBXXCBXXCBXX' timeSignature={[3, 4]} />
                </Card>
              </Card>
            </div>
          </>

        )}

        {tab === 'resultados' && (
          <>
            {/* <Resultados resultado={resultado} removidos={removidos} />  */}
          </>
        )}
      </div>
    </div>
  )
}
