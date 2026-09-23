import { WakeLock } from 'wake-lock'

/**
 * Camada fina sobre o plugin nativo WakeLock (local-plugins/wake-lock).
 *
 * Mantém a CPU acordada (PARTIAL_WAKE_LOCK) durante a reprodução, para que o
 * processamento de áudio em tempo real (SoundTouch/AudioWorklet) não seja
 * estrangulado quando a tela apaga. Na web o plugin é no-op.
 *
 * Chamadas best-effort: falham silenciosamente para nunca derrubar o player.
 */

const seguro = async (fn) => {
  try {
    await fn()
  } catch (erro) {
    console.warn('WakeLock indisponível ou falhou:', erro)
  }
}

/** Adquire o wake lock parcial (CPU ligada, tela pode apagar). Idempotente. */
export const manterAcordado = () => seguro(() => WakeLock.keepAwake())

/** Libera o wake lock, deixando o dispositivo dormir. Idempotente. */
export const liberarSono = () => seguro(() => WakeLock.allowSleep())
