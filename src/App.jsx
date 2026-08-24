import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './componentes/Navbar/Navbar'
import { FloatingMenu } from './componentes/Button/Button'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

export default function App() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('filtros')

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
                { label: 'Ritmo', onClick: () => navigate('/edicao-cifra/edicao-ritmo') },
                { label: 'Letra', onClick: () => { /* ... */ } },
              ]}
            />
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
