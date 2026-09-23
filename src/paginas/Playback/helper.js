import { getArquivoSeguro, getSeguro, postArquivoSeguro } from '../../requests'

// Intervalo entre consultas de status do processamento (ms).
export const INTERVALO_POLLING_MS = 5 * 60 * 1000 // 5 min

// Tempo máximo aguardando o processamento antes de desistir (ms).
export const TIMEOUT_POLLING_MS = 60 * 60 * 1000 // 60 min

// Chave em localStorage onde guardamos o job em andamento, para retomar o
// polling caso o usuário saia e volte ao app antes de o processamento acabar.
export const CHAVE_JOB_PENDENTE = 'playbackJobPendente'

export const salvarJobPendente = (jobId, nomeArquivo) => {
  try {
    localStorage.setItem(CHAVE_JOB_PENDENTE, JSON.stringify({ jobId, nomeArquivo }))
  } catch { /* storage indisponível: seguimos sem persistência */ }
}

export const lerJobPendente = () => {
  try {
    const bruto = localStorage.getItem(CHAVE_JOB_PENDENTE)
    return bruto ? JSON.parse(bruto) : null
  } catch { return null }
}

export const limparJobPendente = () => {
  try { localStorage.removeItem(CHAVE_JOB_PENDENTE) } catch { /* ignore */ }
}

export const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const enviarUpload = (formData) =>
  new Promise((resolve, reject) => {
    postArquivoSeguro(
      'upload',
      formData,
      async (res) => {
        try {
          const dados = await res.json()
          if (!dados?.jobId) {
            throw new Error('Resposta do upload não contém jobId.')
          }
          resolve(dados.jobId)
        } catch (erro) {
          reject(erro)
        }
      },
      reject,
    )
  })

export const consultarStatus = (jobId) =>
  new Promise((resolve, reject) => {
    getSeguro(`upload/status/${jobId}`, resolve, reject)
  })

export const baixarResultado = (jobId) =>
  new Promise((resolve, reject) => {
    getArquivoSeguro(
      `upload/result/${jobId}`,
      async (res) => {
        try {
          resolve(await res.blob())
        } catch (erro) {
          reject(erro)
        }
      },
      reject,
    )
  })

// Faz polling do status até concluir (DONE), falhar (ERROR/FAILED) 
// ou estourar o tempo limite. Resolve com o Blob do resultado.
export const aguardarProcessamento = async (jobId) => {
  const inicio = Date.now()

  while (Date.now() - inicio < TIMEOUT_POLLING_MS) {
    const resposta = await consultarStatus(jobId)
    const status = String(resposta?.status ?? '').toUpperCase()

    if (status === 'DONE' || status === 'COMPLETED' || status === 'SUCCESS') {
      return baixarResultado(jobId)
    }
    if (status === 'ERROR' || status === 'FAILED') {
      throw new Error(resposta?.error || `Processamento falhou (status: ${status}).`)
    }

    await dormir(INTERVALO_POLLING_MS)
  }

  throw new Error('Tempo limite excedido aguardando o processamento da música.')
}