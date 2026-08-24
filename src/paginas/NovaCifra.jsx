import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { faAngleLeft, faGear, faPen, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { RhythmDisplay } from 'tab-sketch/react'
import Card from '../componentes/Card/Card'
import Button, { FloatingMenu, TipoBotao } from '../componentes/Button/Button'
import { TipoBloco, selectBlocos } from '../store/cifraSlice'
import AppFooter from '../componentes/AppFooter/AppFooter'

export default function NovaCifra() {
  const navigate = useNavigate()
  const blocos = useSelector(selectBlocos)

  const [musica, setMusica] = useState('Música')
  const [artista, setArtista] = useState('Artista')
  const cardMusicaRef = useRef(null)

  return (
    <div className="container">
      <nav className="nav-top">
        <button className="nav-icon" onClick={() => navigate('/')}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <span className="nav-title">Nova cifra</span>
        <button className="nav-icon">
          <FontAwesomeIcon icon={faGear} />
        </button>
      </nav>

      <div className="main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Card
            ref={cardMusicaRef}
            title={musica}
            subtitle={artista}
            allowEdit
            onTituloChange={setMusica}
            onSubtituloChange={setArtista}
            action={<Button icon={faPen} tipo={TipoBotao.AUXILIAR} label={'Editar'} onClick={() => cardMusicaRef.current?.iniciarEdicao()} />}></Card>
          {blocos.map((bloco) => (
            <Card key={bloco.id} title={bloco.titulo} row>
              {bloco.tipo === TipoBloco.RITMO && bloco.dados?.pattern && (
                <RhythmDisplay
                  pattern={bloco.dados.pattern}
                  timeSignature={bloco.dados.timeSignature}
                />
              )}
            </Card>
          ))}
        </div>

        <FloatingMenu
          icon={faPlus}
          acoes={[
            { label: 'Tablatura', onClick: () => { /* ... */ } },
            { label: 'Acordes', onClick: () => { /* ... */ } },
            { label: 'Ritmo', onClick: () => navigate('/edicao-cifra/edicao-ritmo') },
            { label: 'Letra', onClick: () => { /* ... */ } },
          ]}
        />
      </div>

      <AppFooter
        primario={<Button tipo={TipoBotao.PRIMARIO} label="Salvar cifra" onClick={() => { }} />}
        secundario={<Button tipo={TipoBotao.SECUNDARIO} label="Cancelar" onClick={() => { }} />}
      />
    </div>
  )
}
