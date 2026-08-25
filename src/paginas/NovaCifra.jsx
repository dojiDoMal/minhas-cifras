import { faGear, faPen, faPlus } from '@fortawesome/free-solid-svg-icons'
import { RhythmDisplay } from 'tab-sketch/react'
import { TipoBloco, selectBlocos } from '../store/cifraSlice'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import AppFooter from '../componentes/AppFooter/AppFooter'
import Button, { FloatingMenu, TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import NavTop from '../componentes/NavTop/NavTop'

export default function NovaCifra() {
  const navigate = useNavigate()
  const blocos = useSelector(selectBlocos)

  const [musica, setMusica] = useState('Música')
  const [artista, setArtista] = useState('Artista')
  const cardMusicaRef = useRef(null)

  return (
    <div className="container">
      <NavTop
        title="Nova cifra"
        onBack={() => navigate('/')}
        actionIcon={faGear}
        onAction={() => { /* TODO: abrir configurações */ }}
      />

      <div className="main">
        <div className='main-content'>
          <Card
            ref={cardMusicaRef}
            title={musica}
            subtitle={artista}
            allowEdit
            onTituloChange={setMusica}
            onSubtituloChange={setArtista}
            action={<Button icon={faPen} tipo={TipoBotao.AUXILIAR} label={'Editar'} onClick={() => cardMusicaRef.current?.iniciarEdicao()} />}
          />

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
        secundario={<Button tipo={TipoBotao.SECUNDARIO} label="Cancelar" onClick={() => navigate('/')} />}
      />
    </div>
  )
}
