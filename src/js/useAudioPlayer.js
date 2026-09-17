import { useCallback, useEffect, useRef, useState } from 'react'
import { SoundTouchNode } from '@soundtouchjs/audio-worklet'
// Vite resolve este import para a URL pública do arquivo do processor.
import processorUrl from '@soundtouchjs/audio-worklet/processor?url'
import { chavesStems } from './FileSystem'

/**
 * Estado inicial exposto pelo hook.
 */
const ESTADO_INICIAL = {
  pronto: false,
  carregando: true,
  tocando: false,
  tempoAtual: 0,
  duracao: 0,
  erro: null,
}

/**
 * Hook que reproduz os dois stems (voz e instrumentos) de um playback ao mesmo
 * tempo, aplicando transposição de tom (em semitons) via SoundTouchJS.
 *
 * Monta, para cada stem, o grafo Web Audio:
 *
 *   AudioBufferSourceNode -> SoundTouchNode(pitchSemitones) -> GainNode -> destination
 *
 * Os dois caminhos compartilham o mesmo AudioContext, então tocam
 * sincronizados na mesma timeline. O mesmo valor de `tom` é aplicado nos dois
 * SoundTouchNode; cada GainNode recebe o volume do seu stem.
 *
 * Observações:
 * - Reprodução (play/pause) usa `AudioContext.suspend()/resume()`, que mantém
 *   os dois stems perfeitamente alinhados sem recriar os nós.
 * - `AudioBufferSourceNode` não é reutilizável após `start()`, então o seek
 *   recria as fontes a partir de um novo offset.
 * - Não há controle de tempo/andamento aqui: `playbackRate` fica em 1.0.
 *
 * @param {Object} params
 * @param {import('./FileSystem').FileSystem} params.fs  implementação de FileSystem
 * @param {string} params.id   id do playback (usado para achar os stems)
 * @param {number} params.tom  transposição em semitons
 * @param {number} params.volumeVoz          volume da voz (0..1)
 * @param {number} params.volumeInstrumentos volume dos instrumentos (0..1)
 */
export function useAudioPlayer({ fs, id, tom, volumeVoz, volumeInstrumentos }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL)

  // Recursos de áudio persistentes entre renders.
  const ctxRef = useRef(null)
  const buffersRef = useRef(null) // { voz: AudioBuffer, instrumentos: AudioBuffer }
  const stNodesRef = useRef(null) // { voz: SoundTouchNode, instrumentos: SoundTouchNode }
  const gainsRef = useRef(null) // { voz: GainNode, instrumentos: GainNode }
  const sourcesRef = useRef(null) // { voz: AudioBufferSourceNode, instrumentos: AudioBufferSourceNode }

  // Controle de progresso/posição na timeline.
  const rafRef = useRef(0)
  const inicioCtxRef = useRef(0) // ctx.currentTime no momento em que as fontes começaram
  const offsetRef = useRef(0) // posição (em s) correspondente a esse início
  const tocandoRef = useRef(false)

  // Guarda os valores atuais para uso dentro de callbacks estáveis.
  const paramsRef = useRef({ tom, volumeVoz, volumeInstrumentos })
  paramsRef.current = { tom, volumeVoz, volumeInstrumentos }

  // --- Carregamento e montagem do grafo -----------------------------------

  useEffect(() => {
    let cancelado = false
    if (!id || !fs) return

    const montar = async () => {
      setEstado({ ...ESTADO_INICIAL })

      try {
        const chaves = chavesStems(id)
        const [blobVoz, blobInstrumentos] = await Promise.all([
          fs.lerArquivo(chaves.voz),
          fs.lerArquivo(chaves.instrumentos),
        ])

        if (!blobVoz || !blobInstrumentos) {
          throw new Error('Arquivos de áudio do playback não encontrados.')
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioCtx()
        await SoundTouchNode.register(ctx, processorUrl)

        const [bufVoz, bufInstrumentos] = await Promise.all([
          ctx.decodeAudioData(await blobVoz.arrayBuffer()),
          ctx.decodeAudioData(await blobInstrumentos.arrayBuffer()),
        ])

        if (cancelado) {
          ctx.close()
          return
        }

        // Um SoundTouchNode + GainNode por stem, ambos ligados ao destino.
        const stVoz = new SoundTouchNode({ context: ctx })
        const stInstrumentos = new SoundTouchNode({ context: ctx })
        const gainVoz = ctx.createGain()
        const gainInstrumentos = ctx.createGain()

        stVoz.connect(gainVoz).connect(ctx.destination)
        stInstrumentos.connect(gainInstrumentos).connect(ctx.destination)

        const { tom: tomAtual, volumeVoz: vVoz, volumeInstrumentos: vInstr } =
          paramsRef.current
        stVoz.pitchSemitones.value = tomAtual
        stInstrumentos.pitchSemitones.value = tomAtual
        gainVoz.gain.value = vVoz
        gainInstrumentos.gain.value = vInstr

        ctxRef.current = ctx
        buffersRef.current = { voz: bufVoz, instrumentos: bufInstrumentos }
        stNodesRef.current = { voz: stVoz, instrumentos: stInstrumentos }
        gainsRef.current = { voz: gainVoz, instrumentos: gainInstrumentos }
        offsetRef.current = 0

        // A duração é a do stem mais longo (normalmente idênticas).
        const duracao = Math.max(bufVoz.duration, bufInstrumentos.duration)

        setEstado({
          pronto: true,
          carregando: false,
          tocando: false,
          tempoAtual: 0,
          duracao,
          erro: null,
        })
      } catch (erro) {
        if (cancelado) return
        console.error('Falha ao preparar o player de áudio:', erro)
        setEstado({ ...ESTADO_INICIAL, carregando: false, erro })
      }
    }

    montar()

    return () => {
      cancelado = true
      pararLoop()
      pararFontes()
      const ctx = ctxRef.current
      ctxRef.current = null
      buffersRef.current = null
      stNodesRef.current = null
      gainsRef.current = null
      if (ctx) ctx.close().catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, id])

  // --- Reflexo dos parâmetros (tom e volumes) em tempo real ---------------

  useEffect(() => {
    const st = stNodesRef.current
    if (!st) return
    st.voz.pitchSemitones.value = tom
    st.instrumentos.pitchSemitones.value = tom
  }, [tom])

  useEffect(() => {
    const gains = gainsRef.current
    if (!gains) return
    gains.voz.gain.value = volumeVoz
  }, [volumeVoz])

  useEffect(() => {
    const gains = gainsRef.current
    if (!gains) return
    gains.instrumentos.gain.value = volumeInstrumentos
  }, [volumeInstrumentos])

  // --- Utilitários internos ----------------------------------------------

  const pararLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }

  const pararFontes = () => {
    const sources = sourcesRef.current
    sourcesRef.current = null
    if (!sources) return
    for (const src of [sources.voz, sources.instrumentos]) {
      try {
        src.onended = null
        src.stop()
      } catch {
        // já parado / nunca iniciado
      }
      try {
        src.disconnect()
      } catch {
        // ignore
      }
    }
  }

  /**
   * Posição atual na timeline, em segundos, considerando o estado de play.
   */
  const posicaoAtual = () => {
    const ctx = ctxRef.current
    if (!ctx) return offsetRef.current
    if (!tocandoRef.current) return offsetRef.current
    return offsetRef.current + (ctx.currentTime - inicioCtxRef.current)
  }

  /**
   * Loop de atualização do tempo exibido enquanto toca.
   */
  const iniciarLoop = () => {
    pararLoop()
    const tick = () => {
      const pos = posicaoAtual()
      const dur = buffersRef.current
        ? Math.max(
          buffersRef.current.voz.duration,
          buffersRef.current.instrumentos.duration,
        )
        : 0
      if (pos >= dur) {
        // Chegou ao fim.
        pararFontes()
        pararLoop()
        offsetRef.current = 0
        tocandoRef.current = false
        setEstado((e) => ({ ...e, tocando: false, tempoAtual: 0 }))
        return
      }
      setEstado((e) => ({ ...e, tempoAtual: pos }))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  /**
   * Cria e dispara as duas fontes a partir de `offset` (segundos), no mesmo
   * instante, para manter os stems sincronizados.
   */
  const dispararFontes = (offset) => {
    const ctx = ctxRef.current
    const buffers = buffersRef.current
    const st = stNodesRef.current
    if (!ctx || !buffers || !st) return

    pararFontes()

    const srcVoz = ctx.createBufferSource()
    const srcInstrumentos = ctx.createBufferSource()
    srcVoz.buffer = buffers.voz
    srcInstrumentos.buffer = buffers.instrumentos

    srcVoz.connect(st.voz)
    srcInstrumentos.connect(st.instrumentos)

    const quando = ctx.currentTime
    srcVoz.start(quando, offset)
    srcInstrumentos.start(quando, offset)

    inicioCtxRef.current = quando
    offsetRef.current = offset
    sourcesRef.current = { voz: srcVoz, instrumentos: srcInstrumentos }
  }

  // --- API pública ---------------------------------------------------------

  const play = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx || !buffersRef.current) return

    // O AudioContext pode iniciar suspenso (política de autoplay dos
    // navegadores). O play é sempre disparado por um gesto do usuário, então
    // aqui é seguro retomá-lo.
    if (ctx.state === 'suspended') await ctx.resume()

    // Sempre (re)cria as fontes a partir da posição guardada. AudioBufferSource
    // não é reutilizável após stop(), e recriar evita depender do relógio do
    // contexto durante a pausa — que é o que causava o salto de tempo ao
    // retomar com suspend()/resume().
    dispararFontes(offsetRef.current)

    tocandoRef.current = true
    setEstado((e) => ({ ...e, tocando: true }))
    iniciarLoop()
  }, [])

  const pause = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    // Captura a posição exata (com base no tempo de áudio já reproduzido)
    // ANTES de parar as fontes, e então para de fato — sem suspender o
    // contexto, para que `posicaoAtual()` continue confiável.
    const pos = posicaoAtual()
    tocandoRef.current = false
    pararLoop()
    pararFontes()
    offsetRef.current = pos
    setEstado((e) => ({ ...e, tocando: false, tempoAtual: pos }))
  }, [])

  const toggle = useCallback(() => {
    if (tocandoRef.current) pause()
    else play()
  }, [play, pause])

  const seek = useCallback((segundos) => {
    const buffers = buffersRef.current
    if (!buffers) return
    const dur = Math.max(buffers.voz.duration, buffers.instrumentos.duration)
    const alvo = Math.min(Math.max(0, segundos), dur)

    offsetRef.current = alvo
    setEstado((e) => ({ ...e, tempoAtual: alvo }))

    if (tocandoRef.current) {
      // Reposiciona as fontes e continua tocando.
      dispararFontes(alvo)
    } else {
      // Parado: só marca a nova posição; as fontes serão criadas no próximo play.
      pararFontes()
    }
  }, [])

  const reiniciar = useCallback(() => {
    // seek(0) já trata os dois casos: tocando (recria as fontes desde o
    // início) e parado (apenas reposiciona para 0).
    seek(0)
  }, [seek])

  return {
    ...estado,
    play,
    pause,
    toggle,
    seek,
    reiniciar,
  }
}
