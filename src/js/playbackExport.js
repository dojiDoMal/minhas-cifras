import { Mp3Encoder } from '@breezystack/lamejs'
import { SoundTouchNode } from '@soundtouchjs/audio-worklet'
import processorUrl from '@soundtouchjs/audio-worklet/processor?url'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { chavesStems } from './FileSystem'
import { isNativeApp } from './platform'
import { tituloPadraoDoArquivo } from './playbackImport'

// Bitrate do MP3 gerado (kbps).
const BITRATE_KBPS = 192

// Amostras por bloco enviadas ao encoder lamejs.
const TAMANHO_BLOCO = 1152

/**
 * Renderiza os dois stems (voz e instrumentos) de um playback num único
 * AudioBuffer mixado, aplicando o mesmo processamento da reprodução:
 * transposição de tom (pitchSemitones via SoundTouch) e os volumes de cada
 * stem (GainNode). Usa OfflineAudioContext para renderizar mais rápido que
 * tempo real, sem tocar nada.
 *
 * Grafo (por stem):
 *   AudioBufferSourceNode -> [SoundTouchNode(tom)] -> GainNode -> destination
 *
 * O SoundTouchNode só é inserido quando há transposição (tom != 0), evitando
 * qualquer artefato/latência quando não é necessário.
 *
 * @param {import('./FileSystem').FileSystem} fs
 * @param {string} id  id do playback
 * @param {{ tom: number, volumeVoz: number, volumeInstrumentos: number }} config
 * @returns {Promise<AudioBuffer>}
 */
export const renderizarPlaybackMixado = async (fs, id, config) => {
    const tom = Number(config?.tom ?? 0)
    const volumeVoz = Number(config?.volumeVoz ?? 0.5)
    const volumeInstrumentos = Number(config?.volumeInstrumentos ?? 0.5)

    const chaves = chavesStems(id)
    const [blobVoz, blobInstrumentos] = await Promise.all([
        fs.lerArquivo(chaves.voz),
        fs.lerArquivo(chaves.instrumentos),
    ])

    if (!blobVoz || !blobInstrumentos) {
        throw new Error('Arquivos de áudio do playback não encontrados.')
    }

    // Um AudioContext comum é usado apenas para decodificar os MP3s em PCM.
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctxDecode = new AudioCtx()
    let bufVoz
    let bufInstrumentos
    try {
        ;[bufVoz, bufInstrumentos] = await Promise.all([
            ctxDecode.decodeAudioData(await blobVoz.arrayBuffer()),
            ctxDecode.decodeAudioData(await blobInstrumentos.arrayBuffer()),
        ])
    } finally {
        ctxDecode.close().catch(() => { })
    }

    const sampleRate = bufVoz.sampleRate
    const canais = Math.max(bufVoz.numberOfChannels, bufInstrumentos.numberOfChannels, 2)
    const duracao = Math.max(bufVoz.duration, bufInstrumentos.duration)

    // Uma folga no fim cobre a latência que o SoundTouch pode introduzir; o
    // silêncio extra é removido depois pela detecção de fim real do áudio.
    const folgaSegundos = tom !== 0 ? 2 : 0
    const totalAmostras = Math.ceil((duracao + folgaSegundos) * sampleRate)

    const offline = new OfflineAudioContext(canais, totalAmostras, sampleRate)

    if (tom !== 0) {
        await SoundTouchNode.register(offline, processorUrl)
    }

    const conectarStem = (buffer, volume) => {
        const source = offline.createBufferSource()
        source.buffer = buffer

        const gain = offline.createGain()
        gain.gain.value = volume

        if (tom !== 0) {
            const st = new SoundTouchNode({ context: offline })
            st.pitchSemitones.value = tom
            source.connect(st)
            st.connect(gain).connect(offline.destination)
        } else {
            source.connect(gain).connect(offline.destination)
        }

        source.start(0)
    }

    conectarStem(bufVoz, volumeVoz)
    conectarStem(bufInstrumentos, volumeInstrumentos)

    return offline.startRendering()
}

/**
 * Localiza a última amostra com áudio audível, para descartar silêncio final
 * (folga adicionada para a latência do pitch shift). Retorna o número de
 * amostras a manter.
 * @param {AudioBuffer} buffer
 * @returns {number}
 */
const amostrasUteis = (buffer) => {
    const limiar = 1e-4 // ~ -80 dBFS
    let ultima = 0
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const dados = buffer.getChannelData(c)
        for (let i = dados.length - 1; i > ultima; i--) {
            if (Math.abs(dados[i]) > limiar) {
                ultima = i
                break
            }
        }
    }
    return Math.min(buffer.length, ultima + 1)
}

/**
 * Converte um valor float [-1, 1] para PCM 16-bit com clipping.
 * @param {number} amostra
 */
const paraInt16 = (amostra) => {
    const s = Math.max(-1, Math.min(1, amostra))
    return s < 0 ? s * 0x8000 : s * 0x7fff
}

/**
 * Codifica um AudioBuffer (mono ou estéreo) em MP3 usando lamejs.
 * @param {AudioBuffer} audioBuffer
 * @param {{ bitrate?: number }} [opcoes]
 * @returns {Blob}  Blob com o conteúdo MP3 (audio/mpeg)
 */
export const audioBufferParaMp3 = (audioBuffer, opcoes = {}) => {
    const bitrate = opcoes.bitrate ?? BITRATE_KBPS
    const canais = Math.min(audioBuffer.numberOfChannels, 2)
    const sampleRate = audioBuffer.sampleRate
    const total = amostrasUteis(audioBuffer)

    const encoder = new Mp3Encoder(canais, sampleRate, bitrate)

    const esquerdaFloat = audioBuffer.getChannelData(0)
    const direitaFloat = canais > 1 ? audioBuffer.getChannelData(1) : null

    // Buffers Int16 reutilizados por bloco.
    const esquerda = new Int16Array(TAMANHO_BLOCO)
    const direita = canais > 1 ? new Int16Array(TAMANHO_BLOCO) : null

    const partes = []

    for (let offset = 0; offset < total; offset += TAMANHO_BLOCO) {
        const tamanho = Math.min(TAMANHO_BLOCO, total - offset)

        for (let i = 0; i < tamanho; i++) {
            esquerda[i] = paraInt16(esquerdaFloat[offset + i])
            if (direita) direita[i] = paraInt16(direitaFloat[offset + i])
        }

        const esquerdaBloco = tamanho === TAMANHO_BLOCO ? esquerda : esquerda.subarray(0, tamanho)
        const direitaBloco = direita
            ? (tamanho === TAMANHO_BLOCO ? direita : direita.subarray(0, tamanho))
            : null

        const mp3 = canais > 1
            ? encoder.encodeBuffer(esquerdaBloco, direitaBloco)
            : encoder.encodeBuffer(esquerdaBloco)

        if (mp3.length > 0) partes.push(new Uint8Array(mp3))
    }

    const fim = encoder.flush()
    if (fim.length > 0) partes.push(new Uint8Array(fim))

    return new Blob(partes, { type: 'audio/mpeg' })
}

/**
 * Monta um nome de arquivo .mp3 seguro a partir de título e artista.
 * @param {string} titulo
 * @param {string} artista
 * @param {string} [fallback]  usado quando não há título (ex.: id ou nomeArquivo)
 * @returns {string}
 */
export const nomeArquivoMp3 = (titulo, artista, fallback = 'playback') => {
    const partes = [titulo?.trim(), artista?.trim()].filter(Boolean)
    const base = (partes.join(' - ') || tituloPadraoDoArquivo(fallback) || 'playback')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
    return `${base || 'playback'}.mp3`
}

/**
 * Converte um Blob em string base64 (sem o prefixo data:), para escrita via
 * Capacitor Filesystem no app nativo.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
const blobParaBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const resultado = String(reader.result)
            resolve(resultado.slice(resultado.indexOf(',') + 1))
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })

/**
 * Entrega o arquivo ao usuário conforme a plataforma:
 * - Web: dispara um download no navegador.
 * - Nativo: grava em Directory.Documents e retorna o caminho salvo.
 *
 * @param {Blob} blob
 * @param {string} nomeArquivo
 * @returns {Promise<{ nativo: boolean, caminho?: string }>}
 */
export const entregarArquivo = async (blob, nomeArquivo) => {
    if (isNativeApp) {
        const base64 = await blobParaBase64(blob)
        const { uri } = await Filesystem.writeFile({
            path: nomeArquivo,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
        })
        return { nativo: true, caminho: uri }
    }

    const url = URL.createObjectURL(blob)
    try {
        const a = document.createElement('a')
        a.href = url
        a.download = nomeArquivo
        document.body.appendChild(a)
        a.click()
        a.remove()
    } finally {
        // Revoga após um tick para garantir que o download iniciou.
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    return { nativo: false }
}

/**
 * Fluxo completo de exportação: renderiza o mix (tom + volumes), codifica em
 * MP3 e entrega o arquivo (download no web, gravação em Documents no nativo).
 *
 * @param {import('./FileSystem').FileSystem} fs
 * @param {string} id  id do playback
 * @param {Object} playback  metadados do playback (titulo, artista, tom, volumes, nomeArquivo)
 * @returns {Promise<{ nativo: boolean, caminho?: string, nomeArquivo: string }>}
 */
export const exportarPlaybackComoMp3 = async (fs, id, playback) => {
    const audioBuffer = await renderizarPlaybackMixado(fs, id, {
        tom: playback?.tom,
        volumeVoz: playback?.volumeVoz,
        volumeInstrumentos: playback?.volumeInstrumentos,
    })

    const mp3 = audioBufferParaMp3(audioBuffer)
    const nomeArquivo = nomeArquivoMp3(playback?.titulo, playback?.artista, playback?.nomeArquivo || id)
    const resultado = await entregarArquivo(mp3, nomeArquivo)

    return { ...resultado, nomeArquivo }
}
