import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { NativeAudioPlayer } from 'native-audio-player'
import { chavesStems } from './FileSystem'

/**
 * Camada fina sobre o plugin nativo NativeAudioPlayer (Media3/ExoPlayer).
 *
 * Só faz sentido em plataforma nativa; na web o useAudioPlayer usa o caminho
 * Web Audio + SoundTouch. Use `suportado()` para decidir qual caminho seguir.
 */

/** true quando rodando no app nativo (Android/iOS), onde o plugin existe. */
export const suportado = () => Capacitor.isNativePlatform()

// Espelha a convenção do FileSystemMobile: os stems ficam em Directory.Data,
// na pasta 'arquivos/<chave>'. getUri devolve o caminho file:// absoluto que
// o ExoPlayer consegue abrir diretamente.
const PASTA_ARQUIVOS = 'arquivos'

const uriDoStem = async (chave) => {
  const { uri } = await Filesystem.getUri({
    directory: Directory.Data,
    path: `${PASTA_ARQUIVOS}/${chave}`,
  })
  return uri
}

/**
 * Resolve os caminhos absolutos (file://) dos dois stems de um playback.
 * @param {string} id
 * @returns {Promise<{voz: string, instrumentos: string}>}
 */
export const resolverUrisStems = async (id) => {
  const chaves = chavesStems(id)
  const [voz, instrumentos] = await Promise.all([
    uriDoStem(chaves.voz),
    uriDoStem(chaves.instrumentos),
  ])
  return { voz, instrumentos }
}

// Reexporta o plugin para o hook consumir play/pause/seek/etc. diretamente.
export { NativeAudioPlayer }
