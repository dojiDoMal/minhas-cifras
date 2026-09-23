import { ScreenOrientation } from '@capacitor/screen-orientation'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import NavTop from '../componentes/NavTop/NavTop'
import PlaybackPlayer from '../componentes/PlaybackPlayer/PlaybackPlayer'
import { FILE_SYSTEM_TYPE } from '../js/FileSystem'
import { getFileSystem } from '../js/FileSystemFactory'
import { useAudioPlayer } from '../js/useAudioPlayer'
import './EdicaoPlayback.css'

// Limites de transposição de tom, em semitons.
const TOM_MIN = -12
const TOM_MAX = 12

const formatarTom = (tom) => (tom > 0 ? `+${tom}` : `${tom}`)

export default function EdicaoPlayback() {
  const navigate = useNavigate()
  const { id } = useParams()
  const fs = getFileSystem()

  const cardRef = useRef(null)
  // Guarda sempre os valores mais recentes para o salvamento automático no
  // cleanup (evita stale closure com dependências vazias).
  const dadosRef = useRef(null)

  const [carregando, setCarregando] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [artista, setArtista] = useState('')
  const [tom, setTom] = useState(0)
  const [volumeVoz, setVolumeVoz] = useState(0.5)
  const [volumeInstrumentos, setVolumeInstrumentos] = useState(0.5)

  // Player de áudio: toca os dois stems ao mesmo tempo, refletindo tom e
  // volumes em tempo real.
  const player = useAudioPlayer({ fs, id, tom, volumeVoz, volumeInstrumentos, titulo, artista })

  // Trava a tela em modo retrato enquanto esta página estiver montada e
  // libera a orientação ao sair. Envolvido em try/catch porque no navegador
  // (fora do app nativo) a Screen Orientation API pode não estar disponível.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      ScreenOrientation.lock({ orientation: 'portrait' })
        .catch((erro) => {
          console.warn('Não foi possível travar a orientação em retrato:', erro)
        })
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        ScreenOrientation.unlock()
          .catch((erro) => {
            console.warn('Não foi possível liberar a orientação:', erro)
          })
      }
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    if (!id) return

    fs.ler(id, FILE_SYSTEM_TYPE.PLAYBACK)
      .then((pb) => {
        if (cancelado) return
        if (!pb) {
          alert('Playback não encontrado.')
          navigate('/playback')
          return
        }
        setTitulo(pb.titulo ?? '')
        setArtista(pb.artista ?? '')
        setTom(Number(pb.tom ?? 0))
        setVolumeVoz(Number(pb.volumeVoz ?? 0.5))
        setVolumeInstrumentos(Number(pb.volumeInstrumentos ?? 0.5))
        setCarregando(false)
      })
      .catch((erro) => {
        if (cancelado) return
        console.error('Falha ao carregar o playback:', erro)
        alert('Não foi possível carregar o playback.')
        navigate('/playback')
      })

    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Mantém o ref sincronizado com o estado atual, sem disparar salvamentos.
  // O cleanup de desmontagem lê daqui para persistir a última versão.
  useEffect(() => {
    if (carregando) return
    dadosRef.current = { titulo, artista, tom, volumeVoz, volumeInstrumentos }
  }, [carregando, titulo, artista, tom, volumeVoz, volumeInstrumentos])

  // Persiste os dados atuais do playback (usado pelo salvamento automático
  // ao sair da página).
  const persistir = async (dados) => {
    const atual = await fs.ler(id, FILE_SYSTEM_TYPE.PLAYBACK)
    const playback = {
      ...atual,
      titulo: dados.titulo.trim() || 'Sem título',
      artista: dados.artista.trim() || '',
      tom: String(dados.tom),
      volumeVoz: String(dados.volumeVoz),
      volumeInstrumentos: String(dados.volumeInstrumentos),
    }
    await fs.salvar(id, playback, FILE_SYSTEM_TYPE.PLAYBACK)
  }

  // Ao desmontar (sair da página), salva as alterações feitas no playback.
  // Array vazio garante que o cleanup só rode uma vez, na saída; os valores
  // vêm do ref, sempre atualizado.
  useEffect(() => {
    return () => {
      const dados = dadosRef.current
      if (!id || !dados) return
      persistir(dados).catch((erro) => {
        console.error('Falha ao salvar o playback ao sair:', erro)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ajustarTom = (delta) => {
    setTom((atual) => Math.min(TOM_MAX, Math.max(TOM_MIN, atual + delta)))
  }

  return (
    <div className="container container-com-player">
      <NavTop
        title={'Reproduzir playback'}
        onBack={() => navigate('/playback')}
      />

      <div className="main">
        <div className="main-content">
          {carregando ? (
            <p style={{ textAlign: 'center', padding: '24px' }}>Carregando...</p>
          ) : (
            <>
              <Card
                ref={cardRef}
                title={titulo || 'Título'}
                subtitle={artista || 'Artista'}
                allowEdit
                onTituloChange={setTitulo}
                onSubtituloChange={setArtista}
                action={
                  <Button
                    tipo={TipoBotao.AUXILIAR}
                    label={'Editar'}
                    onClick={() => cardRef.current?.iniciarEdicao()}
                  />
                }
              />

              <Card title={'Tom'}>
                <div className="playback-tom">
                  <Button
                    icon={faMinus}
                    tipo={TipoBotao.SECUNDARIO}
                    onClick={() => ajustarTom(-1)}
                    disabled={tom <= TOM_MIN}
                    aria-label="Diminuir tom"
                  />
                  <span className="playback-tom-valor">{formatarTom(tom)}</span>
                  <Button
                    icon={faPlus}
                    tipo={TipoBotao.SECUNDARIO}
                    onClick={() => ajustarTom(1)}
                    disabled={tom >= TOM_MAX}
                    aria-label="Aumentar tom"
                  />
                </div>
              </Card>

              <Card title={'Volumes'}>
                <div className="playback-volume">
                  <label htmlFor="volume-voz">
                    Voz <span className="playback-volume-valor">{Math.round(volumeVoz * 100)}%</span>
                  </label>
                  <input
                    id="volume-voz"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumeVoz}
                    onChange={(e) => setVolumeVoz(Number(e.target.value))}
                  />
                </div>
                <div className="playback-volume">
                  <label htmlFor="volume-instrumentos">
                    Instrumentos <span className="playback-volume-valor">{Math.round(volumeInstrumentos * 100)}%</span>
                  </label>
                  <input
                    id="volume-instrumentos"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumeInstrumentos}
                    onChange={(e) => setVolumeInstrumentos(Number(e.target.value))}
                  />
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {!carregando && (
        <PlaybackPlayer
          tocando={player.tocando}
          tempoAtual={player.tempoAtual}
          duracao={player.duracao}
          desabilitado={!player.pronto}
          onPlayPause={player.toggle}
          onReiniciar={player.reiniciar}
          onSeek={player.seek}
        />
      )}
    </div>
  )
}
