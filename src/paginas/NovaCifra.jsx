import { faGear, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { ChordDisplay, LyricsDisplay, RhythmDisplay, Section, TabDisplay } from 'tab-sketch/react'
import { TipoBloco, selectBlocos, selectSecoes, removerBloco, resetCifra, carregarCifra, assinaturaCifra } from '../store/cifraSlice'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { getFileSystem } from '../js/FileSystemFactory'
import AppFooter from '../componentes/AppFooter/AppFooter'
import Button, { FloatingMenu, TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import NavTop from '../componentes/NavTop/NavTop'

export default function NovaCifra() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { id } = useParams()
  const editando = Boolean(id)
  const blocos = useSelector(selectBlocos)
  const secoes = useSelector(selectSecoes)

  const [musica, setMusica] = useState('Música')
  const [artista, setArtista] = useState('Artista')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(editando)
  const cardMusicaRef = useRef(null)
  // Assinatura do estado no momento em que a cifra foi carregada (modo edição).
  // Usada para habilitar "Salvar cifra" apenas quando houve mudança.
  const assinaturaOriginalRef = useRef(null)

  useEffect(() => {
    let cancelado = false

    if (!editando) {
      dispatch(resetCifra())
      setMusica('Música')
      setArtista('Artista')
      return
    }

    setCarregando(true)
    getFileSystem()
      .lerCifra(id)
      .then((cifra) => {
        if (cancelado) return
        if (!cifra) {
          alert('Cifra não encontrada.')
          navigate('/')
          return
        }
        dispatch(carregarCifra(cifra))
        setMusica(cifra.titulo || 'Música')
        setArtista(cifra.artista || 'Artista')
        assinaturaOriginalRef.current = assinaturaCifra(cifra)
        setCarregando(false)
      })
      .catch((erro) => {
        if (cancelado) return
        console.error('Falha ao carregar a cifra:', erro)
        alert('Não foi possível carregar a cifra.')
        navigate('/')
      })

    return () => {
      cancelado = true
    }
  }, [id, editando, dispatch, navigate])

  // Normaliza os valores editáveis do cabeçalho, tratando os placeholders
  // ('Música'/'Artista') como vazio, para a assinatura refletir o que de fato
  // seria salvo em disco.
  const tituloAtual = musica === 'Música' ? '' : musica
  const artistaAtual = artista === 'Artista' ? '' : artista
  const assinaturaAtual = assinaturaCifra({ titulo: tituloAtual, artista: artistaAtual, secoes })

  // No modo edição, só houve mudança se a assinatura atual difere da carregada.
  const houveMudanca =
    !editando || assinaturaOriginalRef.current === null
      ? true
      : assinaturaAtual !== assinaturaOriginalRef.current

  async function salvarCifra() {
    if (salvando || blocos.length === 0 || !houveMudanca) return

    setSalvando(true)
    try {
      const idCifra = id ?? uuidv4()
      const cifra = {
        titulo: musica.trim() || 'Sem título',
        artista: artista.trim() || '',
        secoes,
      }
      await getFileSystem().salvarCifra(idCifra, cifra)
      dispatch(resetCifra())
      navigate('/')
    } catch (erro) {
      console.error('Falha ao salvar a cifra:', erro)
      alert('Não foi possível salvar a cifra. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <div className="container container-com-footer">
      <NavTop
        title={editando ? 'Editar cifra' : 'Nova cifra'}
        onBack={() => navigate('/')}
        actionIcon={faGear}
        onAction={() => { /* TODO: abrir configurações */ }}
      />

      <div className="main">
        <div className='main-content'>
          {carregando ? (
            <p style={{ textAlign: 'center', padding: '24px' }}>Carregando cifra...</p>
          ) : (
            <>
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
                        <LyricsDisplay>{bloco.dados?.texto ?? ''}</LyricsDisplay>
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
            </>
          )}
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
        primario={<Button tipo={TipoBotao.PRIMARIO} label={salvando ? 'Salvando...' : 'Salvar cifra'} onClick={salvarCifra} disabled={salvando || blocos.length === 0 || !houveMudanca} />}
        secundario={<Button tipo={TipoBotao.SECUNDARIO} label="Cancelar" onClick={() => navigate('/')} />}
      />
    </div>
  )
}
