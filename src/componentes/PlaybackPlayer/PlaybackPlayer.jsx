import { faBackwardStep, faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './PlaybackPlayer.css'

/**
 * Formata um tempo em segundos para "m:ss".
 * @param {number} segundos
 */
const formatarTempo = (segundos) => {
  const s = Math.max(0, Math.floor(segundos || 0))
  const min = Math.floor(s / 60)
  const seg = s % 60
  return `${min}:${String(seg).padStart(2, '0')}`
}

/**
 * Player de áudio fixo na parte inferior da tela, no mesmo estilo do AppFooter.
 *
 * Componente puramente visual: não reproduz áudio. Recebe o estado atual por
 * props e comunica as interações do usuário pelos callbacks. A lógica de
 * reprodução (Web Audio API / SoundTouch) será plugada depois.
 *
 * @param {Object} props
 * @param {boolean} [props.tocando]        se está reproduzindo no momento
 * @param {number}  [props.tempoAtual]     posição atual, em segundos
 * @param {number}  [props.duracao]        duração total, em segundos
 * @param {boolean} [props.desabilitado]   desabilita os controles (ex.: carregando)
 * @param {() => void}        [props.onPlayPause]  alterna play/pause
 * @param {() => void}        [props.onReiniciar]  volta ao início
 * @param {(t: number) => void} [props.onSeek]     usuário arrastou a barra (segundos)
 */
export default function PlaybackPlayer({
  tocando = false,
  tempoAtual = 0,
  duracao = 0,
  desabilitado = false,
  onPlayPause,
  onReiniciar,
  onSeek,
}) {
  const total = duracao > 0 ? duracao : 0
  const atual = Math.min(tempoAtual, total)

  return (
    <div className="playback-player">
      <div className="playback-player-progresso">
        <span className="playback-player-tempo">{formatarTempo(atual)}</span>
        <input
          className="playback-player-seek"
          type="range"
          min="0"
          max={total || 1}
          step="0.1"
          value={atual}
          disabled={desabilitado || total === 0}
          onChange={(e) => onSeek?.(Number(e.target.value))}
          aria-label="Posição da reprodução"
        />
        <span className="playback-player-tempo">{formatarTempo(total)}</span>
      </div>

      <div className="playback-player-controles">
        <button
          className="playback-player-botao"
          onClick={() => onReiniciar?.()}
          disabled={desabilitado}
          aria-label="Voltar ao início"
        >
          <FontAwesomeIcon icon={faBackwardStep} />
        </button>

        <button
          className="playback-player-botao playback-player-botao-principal"
          onClick={() => onPlayPause?.()}
          disabled={desabilitado}
          aria-label={tocando ? 'Pausar' : 'Reproduzir'}
        >
          <FontAwesomeIcon icon={tocando ? faPause : faPlay} />
        </button>
      </div>
    </div>
  )
}
