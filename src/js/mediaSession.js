import { MediaSession } from '@jofr/capacitor-media-session'

/**
 * Camada fina sobre o plugin @jofr/capacitor-media-session.
 *
 * Motivo de existir: o áudio deste app é gerado dentro do WebView (Web Audio +
 * SoundTouch), e no Android o sistema suspende/estrangula o WebView quando a
 * tela apaga — o que corrompe a reprodução. Este plugin sobe um foreground
 * service enquanto há uma Media Session ativa (playbackState 'playing'),
 * mantendo o app vivo em background. Ele NÃO reproduz áudio: apenas mostra a
 * notificação de mídia e encaminha os controles (play/pause/seek) de volta.
 *
 * Todas as chamadas são "best-effort": em ambiente web/dev, ou se o plugin não
 * estiver disponível, elas falham silenciosamente sem derrubar o player.
 */

const seguro = async (fn) => {
  try {
    await fn()
  } catch (erro) {
    // Não é crítico para a reprodução em si; só perde a integração de mídia.
    console.warn('MediaSession indisponível ou falhou:', erro)
  }
}

/**
 * Define os metadados exibidos na notificação/tela de bloqueio.
 * @param {{ title?: string, artist?: string, album?: string }} meta
 */
export const definirMetadados = ({ title = '', artist = '', album = '' } = {}) =>
  seguro(() => MediaSession.setMetadata({ title, artist, album, artwork: [] }))

/**
 * Indica ao sistema se está tocando. 'playing' é o que dispara o foreground
 * service; 'paused' mantém a notificação mas libera o service; 'none' encerra.
 * @param {'playing' | 'paused' | 'none'} estado
 */
export const definirEstadoReproducao = (estado) =>
  seguro(() => MediaSession.setPlaybackState({ playbackState: estado }))

/**
 * Atualiza posição/duração exibidas na notificação (barra de progresso).
 * @param {{ duration?: number, position?: number, playbackRate?: number }} pos
 */
export const definirPosicao = ({ duration = 0, position = 0, playbackRate = 1 } = {}) =>
  seguro(() =>
    MediaSession.setPositionState({
      duration: Number.isFinite(duration) ? duration : 0,
      position: Math.min(Math.max(0, position), Number.isFinite(duration) ? duration : 0),
      playbackRate,
    }),
  )

/**
 * Registra (ou remove, passando null) o handler de uma ação de mídia.
 * @param {'play'|'pause'|'stop'|'seekto'|'seekforward'|'seekbackward'|'previoustrack'|'nexttrack'} acao
 * @param {((detalhes: { action: string, seekTime?: number|null }) => void) | null} handler
 */
export const registrarAcao = (acao, handler) =>
  seguro(() => MediaSession.setActionHandler({ action: acao }, handler))
