import { useCallback, useEffect, useRef, useState } from 'react'
import { SoundTouchNode } from '@soundtouchjs/audio-worklet'
// Vite resolve este import para a URL pública do arquivo do processor.
import processorUrl from '@soundtouchjs/audio-worklet/processor?url'
import { chavesStems } from './FileSystem'
import {
  definirEstadoReproducao,
  definirMetadados,
  definirPosicao,
  registrarAcao,
} from './mediaSession'
import { liberarSono, manterAcordado } from './wakeLock'
import { NativeAudioPlayer, resolverUrisStems, suportado } from './nativeAudioPlayer'

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
 * tempo, aplicando transposição de tom (em semitons).
 *
 * Há DOIS caminhos de reprodução, escolhidos pela plataforma:
 *
 * - NATIVO (Android/iOS): usa o plugin NativeAudioPlayer (Media3/ExoPlayer).
 *   O pitch e os volumes são aplicados pelo engine nativo, FORA do WebView.
 *   Isso elimina os underflows do pipeline Web Audio (descasamento entre o
 *   quantum de 128 do AudioWorklet e o buffer de hardware do aparelho) que
 *   causavam distorção, sobretudo com a tela apagada.
 *
 * - WEB (navegador/PWA): mantém o grafo Web Audio + SoundTouch:
 *     srcVoz -> gainVoz ↘
 *                        mixGain -> [SoundTouch(tom) se tom≠0] -> destination
 *     srcInstrumentos -> gainInstrumentos ↗
 *
 * A integração com a notificação de mídia (foreground service) e o wake lock é
 * compartilhada pelos dois caminhos, pois independe da fonte de áudio.
 *
 * @param {Object} params
 * @param {import('./FileSystem').FileSystem} params.fs  implementação de FileSystem
 * @param {string} params.id   id do playback (usado para achar os stems)
 * @param {number} params.tom  transposição em semitons
 * @param {number} params.volumeVoz          volume da voz (0..1)
 * @param {number} params.volumeInstrumentos volume dos instrumentos (0..1)
 * @param {string} [params.titulo]   título exibido na notificação de mídia
 * @param {string} [params.artista]  artista exibido na notificação de mídia
 */
export function useAudioPlayer({ fs, id, tom, volumeVoz, volumeInstrumentos, titulo = '', artista = '' }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL)

  // Decisão de caminho, estável durante a vida do componente.
  const usarNativoRef = useRef(suportado())

  // --- Recursos do caminho WEB (Web Audio) --------------------------------
  const ctxRef = useRef(null)
  const buffersRef = useRef(null) // { voz: AudioBuffer, instrumentos: AudioBuffer }
  const stNodeRef = useRef(null) // SoundTouchNode único, sobre o mix somado
  const mixGainRef = useRef(null) // GainNode que soma voz + instrumentos antes do pitch
  const gainsRef = useRef(null) // { voz: GainNode, instrumentos: GainNode }
  const sourcesRef = useRef(null) // { voz, instrumentos } AudioBufferSourceNode
  const soundTouchAtivoRef = useRef(false)
  const metricsListenerRef = useRef(null)
  const rafRef = useRef(0)
  const inicioCtxRef = useRef(0)

  // --- Recursos do caminho NATIVO -----------------------------------------
  // Handles dos listeners do plugin (ended/state), para remover no cleanup.
  const nativeListenersRef = useRef([])
  // Intervalo de atualização de posição no caminho nativo (poll leve).
  const nativePollRef = useRef(0)

  // --- Estado de posição/reprodução (compartilhado) -----------------------
  const offsetRef = useRef(0) // posição (s) atual/última conhecida
  const tocandoRef = useRef(false)
  const duracaoRef = useRef(0)

  // Guarda os valores atuais para uso dentro de callbacks estáveis.
  const paramsRef = useRef({ tom, volumeVoz, volumeInstrumentos })
  paramsRef.current = { tom, volumeVoz, volumeInstrumentos }

  const metaRef = useRef({ titulo, artista })
  metaRef.current = { titulo, artista }

  const handlersRegistradosRef = useRef(false)
  const acoesRef = useRef({ play: () => { }, pause: () => { }, seek: () => { } })

  // ========================================================================
  // Utilitários do caminho WEB
  // ========================================================================

  const aplicarRoteamento = (tomAtual) => {
    const mixGain = mixGainRef.current
    const soundTouch = stNodeRef.current
    const ctx = ctxRef.current
    if (!mixGain || !soundTouch || !ctx) return

    const querAtivo = tomAtual !== 0
    if (querAtivo === soundTouchAtivoRef.current) return

    try { mixGain.disconnect() } catch { /* nada conectado */ }
    try { soundTouch.disconnect() } catch { /* nada conectado */ }

    if (querAtivo) {
      mixGain.connect(soundTouch).connect(ctx.destination)
    } else {
      mixGain.connect(ctx.destination)
    }
    soundTouchAtivoRef.current = querAtivo
  }

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
      try { src.onended = null; src.stop() } catch { /* já parado */ }
      try { src.disconnect() } catch { /* ignore */ }
    }
  }

  const posicaoWeb = () => {
    const ctx = ctxRef.current
    if (!ctx) return offsetRef.current
    if (!tocandoRef.current) return offsetRef.current
    return offsetRef.current + (ctx.currentTime - inicioCtxRef.current)
  }

  const dispararFontes = (offset) => {
    const ctx = ctxRef.current
    const buffers = buffersRef.current
    const gains = gainsRef.current
    if (!ctx || !buffers || !gains) return

    pararFontes()

    const srcVoz = ctx.createBufferSource()
    const srcInstrumentos = ctx.createBufferSource()
    srcVoz.buffer = buffers.voz
    srcInstrumentos.buffer = buffers.instrumentos
    srcVoz.connect(gains.voz)
    srcInstrumentos.connect(gains.instrumentos)

    const quando = ctx.currentTime
    srcVoz.start(quando, offset)
    srcInstrumentos.start(quando, offset)

    inicioCtxRef.current = quando
    offsetRef.current = offset
    sourcesRef.current = { voz: srcVoz, instrumentos: srcInstrumentos }
  }

  const iniciarLoopWeb = () => {
    pararLoop()
    const tick = () => {
      const pos = posicaoWeb()
      const dur = duracaoRef.current
      if (pos >= dur && dur > 0) {
        aoTerminar()
        return
      }
      setEstado((e) => ({ ...e, tempoAtual: pos }))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // ========================================================================
  // Posição/progresso genéricos
  // ========================================================================

  const posicaoAtual = () => {
    if (usarNativoRef.current) return offsetRef.current
    return posicaoWeb()
  }

  const sincronizarPosicaoMidia = () => {
    definirPosicao({
      duration: duracaoRef.current,
      position: posicaoAtual(),
      playbackRate: 1,
    })
  }

  // Tratamento único de fim de faixa (ambos os caminhos).
  const aoTerminar = () => {
    if (!usarNativoRef.current) {
      pararFontes()
      pararLoop()
    } else {
      pararPollNativo()
    }
    offsetRef.current = 0
    tocandoRef.current = false
    setEstado((e) => ({ ...e, tocando: false, tempoAtual: 0 }))
    definirEstadoReproducao('none')
    liberarSono()
  }

  // ========================================================================
  // Utilitários do caminho NATIVO
  // ========================================================================

  const pararPollNativo = () => {
    if (nativePollRef.current) {
      clearInterval(nativePollRef.current)
      nativePollRef.current = 0
    }
  }

  const iniciarPollNativo = () => {
    pararPollNativo()
    // 4x/s é suave para o cronômetro e barato de CPU (o áudio roda nativo).
    nativePollRef.current = setInterval(async () => {
      try {
        const { position } = await NativeAudioPlayer.getPosition()
        offsetRef.current = position
        setEstado((e) => ({ ...e, tempoAtual: position }))
      } catch { /* ignore */ }
    }, 250)
  }

  // ========================================================================
  // Carregamento / montagem
  // ========================================================================

  useEffect(() => {
    let cancelado = false
    if (!id || !fs) return

    const montarWeb = async () => {
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
      if (cancelado) { ctx.close(); return null }

      const gainVoz = ctx.createGain()
      const gainInstrumentos = ctx.createGain()
      const mixGain = ctx.createGain()
      const soundTouch = new SoundTouchNode({ context: ctx })

      const aoReceberMetricas = (e) => {
        const m = e.detail
        if (!m) return
        console.log(
          `[soundtouch] underruns=${m.underrunCount}/${m.blockCount} buffered=${m.framesBuffered} peak=${m.outputPeak?.toFixed?.(3)}`,
        )
      }
      soundTouch.addEventListener('metrics', aoReceberMetricas)
      metricsListenerRef.current = aoReceberMetricas

      gainVoz.connect(mixGain)
      gainInstrumentos.connect(mixGain)

      const { tom: tomAtual, volumeVoz: vVoz, volumeInstrumentos: vInstr } = paramsRef.current
      soundTouch.pitchSemitones.value = tomAtual
      gainVoz.gain.value = vVoz
      gainInstrumentos.gain.value = vInstr
      mixGain.gain.value = 1

      ctxRef.current = ctx
      buffersRef.current = { voz: bufVoz, instrumentos: bufInstrumentos }
      stNodeRef.current = soundTouch
      mixGainRef.current = mixGain
      gainsRef.current = { voz: gainVoz, instrumentos: gainInstrumentos }
      soundTouchAtivoRef.current = false
      aplicarRoteamento(tomAtual)

      return Math.max(bufVoz.duration, bufInstrumentos.duration)
    }

    const montarNativo = async () => {
      const { voz, instrumentos } = await resolverUrisStems(id)
      const { tom: tomAtual, volumeVoz: vVoz, volumeInstrumentos: vInstr } = paramsRef.current
      const { duration } = await NativeAudioPlayer.load({
        voz,
        instrumentos,
        semitons: tomAtual,
        volumeVoz: vVoz,
        volumeInstrumentos: vInstr,
      })
      if (cancelado) { await NativeAudioPlayer.release().catch(() => { }); return null }

      // Fim de faixa e mudanças de estado vêm por evento do plugin.
      const hEnded = await NativeAudioPlayer.addListener('ended', () => { aoTerminar() })
      const hState = await NativeAudioPlayer.addListener('state', () => { /* reservado */ })
      // A duração real chega quando o ExoPlayer atinge STATE_READY (o load pode
      // resolver antes disso, com duração 0). Atualiza o estado ao recebê-la.
      const hDur = await NativeAudioPlayer.addListener('duration', ({ duration: d }) => {
        if (d > 0) {
          duracaoRef.current = d
          setEstado((e) => ({ ...e, duracao: d }))
          sincronizarPosicaoMidia()
        }
      })
      nativeListenersRef.current = [hEnded, hState, hDur]

      return duration
    }

    const montar = async () => {
      setEstado({ ...ESTADO_INICIAL })
      try {
        const duracao = usarNativoRef.current ? await montarNativo() : await montarWeb()
        if (cancelado || duracao == null) return

        offsetRef.current = 0
        duracaoRef.current = duracao
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
      liberarSono()

      // Ler `.current` aqui é intencional: liberamos os recursos de áudio
      // vigentes desta montagem (não são nós de DOM). O aviso da regra não se
      // aplica a este caso.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (usarNativoRef.current) {
        pararPollNativo()
        for (const h of nativeListenersRef.current) {
          try { h.remove() } catch { /* ignore */ }
        }
        nativeListenersRef.current = []
        NativeAudioPlayer.release().catch(() => { })
      } else {
        pararLoop()
        pararFontes()
        const stAntigo = stNodeRef.current
        if (stAntigo && metricsListenerRef.current) {
          stAntigo.removeEventListener('metrics', metricsListenerRef.current)
        }
        metricsListenerRef.current = null
        soundTouchAtivoRef.current = false
        const ctx = ctxRef.current
        ctxRef.current = null
        buffersRef.current = null
        stNodeRef.current = null
        mixGainRef.current = null
        gainsRef.current = null
        if (ctx) ctx.close().catch(() => { })
      }
      tocandoRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, id])

  // ========================================================================
  // Reflexo de tom e volumes em tempo real
  // ========================================================================

  useEffect(() => {
    if (usarNativoRef.current) {
      NativeAudioPlayer.setPitch({ semitons: tom }).catch(() => { })
      return
    }
    const st = stNodeRef.current
    if (!st) return
    st.pitchSemitones.value = tom
    aplicarRoteamento(tom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tom])

  useEffect(() => {
    if (usarNativoRef.current) {
      NativeAudioPlayer.setVolume({ stem: 'voz', volume: volumeVoz }).catch(() => { })
      return
    }
    const gains = gainsRef.current
    if (gains) gains.voz.gain.value = volumeVoz
  }, [volumeVoz])

  useEffect(() => {
    if (usarNativoRef.current) {
      NativeAudioPlayer.setVolume({ stem: 'instrumentos', volume: volumeInstrumentos }).catch(() => { })
      return
    }
    const gains = gainsRef.current
    if (gains) gains.instrumentos.gain.value = volumeInstrumentos
  }, [volumeInstrumentos])

  // ========================================================================
  // API pública
  // ========================================================================

  const play = useCallback(async () => {
    if (usarNativoRef.current) {
      try { await NativeAudioPlayer.play() } catch { return }
      tocandoRef.current = true
      setEstado((e) => ({ ...e, tocando: true }))
      iniciarPollNativo()
    } else {
      const ctx = ctxRef.current
      if (!ctx || !buffersRef.current) return
      if (ctx.state === 'suspended') await ctx.resume()
      dispararFontes(offsetRef.current)
      tocandoRef.current = true
      setEstado((e) => ({ ...e, tocando: true }))
      iniciarLoopWeb()
    }

    // Integração compartilhada: notificação de mídia + wake lock.
    if (!handlersRegistradosRef.current) {
      registrarAcao('play', () => acoesRef.current.play())
      registrarAcao('pause', () => acoesRef.current.pause())
      registrarAcao('stop', () => acoesRef.current.pause())
      registrarAcao('seekto', (d) => {
        if (d && typeof d.seekTime === 'number') acoesRef.current.seek(d.seekTime)
      })
      handlersRegistradosRef.current = true
    }
    definirMetadados({ title: metaRef.current.titulo, artist: metaRef.current.artista })
    definirEstadoReproducao('playing')
    sincronizarPosicaoMidia()
    manterAcordado()
  }, [])

  const pause = useCallback(async () => {
    if (usarNativoRef.current) {
      try {
        const { position } = await NativeAudioPlayer.getPosition()
        offsetRef.current = position
      } catch { /* mantém offset anterior */ }
      pararPollNativo()
      await NativeAudioPlayer.pause().catch(() => { })
    } else {
      const ctx = ctxRef.current
      if (!ctx) return
      const pos = posicaoWeb()
      pararLoop()
      pararFontes()
      offsetRef.current = pos
    }

    tocandoRef.current = false
    setEstado((e) => ({ ...e, tocando: false, tempoAtual: offsetRef.current }))
    definirEstadoReproducao('paused')
    sincronizarPosicaoMidia()
    liberarSono()
  }, [])

  const toggle = useCallback(() => {
    if (tocandoRef.current) pause()
    else play()
  }, [play, pause])

  const seek = useCallback(async (segundos) => {
    const dur = duracaoRef.current
    const alvo = Math.min(Math.max(0, segundos), dur || segundos)

    offsetRef.current = alvo
    setEstado((e) => ({ ...e, tempoAtual: alvo }))

    if (usarNativoRef.current) {
      await NativeAudioPlayer.seek({ position: alvo }).catch(() => { })
    } else {
      if (tocandoRef.current) dispararFontes(alvo)
      else pararFontes()
    }
    sincronizarPosicaoMidia()
  }, [])

  const reiniciar = useCallback(() => {
    seek(0)
  }, [seek])

  useEffect(() => {
    acoesRef.current = { play, pause, seek }
  }, [play, pause, seek])

  useEffect(() => {
    if (!handlersRegistradosRef.current) return
    definirMetadados({ title: titulo, artist: artista })
  }, [titulo, artista])

  useEffect(() => {
    return () => {
      definirEstadoReproducao('none')
      liberarSono()
      if (handlersRegistradosRef.current) {
        registrarAcao('play', null)
        registrarAcao('pause', null)
        registrarAcao('stop', null)
        registrarAcao('seekto', null)
        handlersRegistradosRef.current = false
      }
    }
  }, [])

  return {
    ...estado,
    play,
    pause,
    toggle,
    seek,
    reiniciar,
  }
}
