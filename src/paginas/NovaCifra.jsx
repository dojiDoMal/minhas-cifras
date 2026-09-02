import { faGear, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { ChordDisplay, RhythmDisplay, Section, TabDisplay } from 'tab-sketch/react'
import { TipoBloco, selectBlocos, removerBloco } from '../store/cifraSlice'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import AppFooter from '../componentes/AppFooter/AppFooter'
import Button, { FloatingMenu, TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import NavTop from '../componentes/NavTop/NavTop'

export default function NovaCifra() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const blocos = useSelector(selectBlocos)

  const [musica, setMusica] = useState('Música')
  const [artista, setArtista] = useState('Artista')
  const cardMusicaRef = useRef(null)

  return (
    <div className="container container-com-footer">
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

          <Section chordTitleColor="#78aee0">
            {blocos.map((bloco) => {
              if (bloco.tipo === TipoBloco.ACORDES) {
                return (
                  <Card
                    key={bloco.id}
                    rowContent
                    action={
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button icon={faTrash} tipo={TipoBotao.AUXILIAR} label={'Remover'} onClick={() => dispatch(removerBloco(bloco.id))} />
                        <Button icon={faPen} tipo={TipoBotao.AUXILIAR} label={'Editar'} onClick={() => navigate(`/edicao-cifra/edicao-acordes?bloco=${bloco.id}`)} />
                      </div>
                    }
                  >
                    {bloco.dados?.acordes?.map((ac, j) => {
                      const nome = typeof ac === 'string' ? ac : ac.nome
                      const shapeVariant = typeof ac === 'string' ? 0 : (ac.shapeVariant ?? 0)
                      return <ChordDisplay key={j} chord={nome} shapeVariant={shapeVariant} />
                    })}
                  </Card>
                )
              }
              if (bloco.tipo === TipoBloco.TABLATURA) {
                return (
                  <Card
                    key={bloco.id}
                    title={bloco.titulo}
                    action={
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button icon={faTrash} tipo={TipoBotao.AUXILIAR} label={'Remover'} onClick={() => dispatch(removerBloco(bloco.id))} />
                        <Button icon={faPen} tipo={TipoBotao.AUXILIAR} label={'Editar'} onClick={() => navigate(`/edicao-cifra/edicao-tablatura?bloco=${bloco.id}`)} />
                      </div>
                    }
                  >
                    <TabDisplay tab={bloco.dados?.tab ?? ''} />
                  </Card>
                )
              }
              if (bloco.tipo === TipoBloco.LETRA) {
                return (
                  <Card
                    key={bloco.id}
                    action={
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button icon={faTrash} tipo={TipoBotao.AUXILIAR} label={'Remover'} onClick={() => dispatch(removerBloco(bloco.id))} />
                        <Button icon={faPen} tipo={TipoBotao.AUXILIAR} label={'Editar'} onClick={() => navigate(`/edicao-cifra/edicao-letra?bloco=${bloco.id}`)} />
                      </div>
                    }
                    title={bloco.titulo}
                  >
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{bloco.dados?.texto}</pre>
                  </Card>
                )
              }
              return (
                <Card
                  key={bloco.id}
                  rowContent
                  action={
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button icon={faTrash} tipo={TipoBotao.AUXILIAR} label={'Remover'} onClick={() => dispatch(removerBloco(bloco.id))} />
                      <Button icon={faPen} tipo={TipoBotao.AUXILIAR} label={'Editar'} onClick={() => navigate(`/edicao-cifra/edicao-ritmo?bloco=${bloco.id}`)} />
                    </div>
                  }
                >
                  <label style={{ flex: 1 }}>{bloco.titulo}</label>
                  {bloco.tipo === TipoBloco.RITMO && bloco.dados?.pattern && (
                    <RhythmDisplay
                      pattern={bloco.dados.pattern}
                      timeSignature={bloco.dados.timeSignature}
                    />
                  )}
                </Card>
              )
            })}
          </Section>
        </div>

        <FloatingMenu
          icon={faPlus}
          acoes={[
            { label: 'Tablatura', onClick: () => navigate('/edicao-cifra/edicao-tablatura') },
            { label: 'Acordes', onClick: () => navigate('/edicao-cifra/edicao-acordes') },
            { label: 'Ritmo', onClick: () => navigate('/edicao-cifra/edicao-ritmo') },
            { label: 'Letra', onClick: () => navigate('/edicao-cifra/edicao-letra') },
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
