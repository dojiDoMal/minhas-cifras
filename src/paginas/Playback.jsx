import { faGear, faTrash } from "@fortawesome/free-solid-svg-icons"
import Button, { TipoBotao } from "../componentes/Button/Button";
import { useNavigate } from 'react-router-dom'
import AppFooter from "../componentes/AppFooter/AppFooter";
import Card from "../componentes/Card/Card";
import NavTop from "../componentes/NavTop/NavTop"
import { useEffect, useRef, useState } from "react";
import { FILE_SYSTEM_TYPE } from "../js/FileSystem";
import { getFileSystem } from "../js/FileSystemFactory";
import { extrairStems, removerStems, salvarStems, tituloPadraoDoArquivo } from "../js/playbackImport";
import { v4 as uuidv4 } from 'uuid';
import './Playback.css'
import { getArquivoSeguro, getSeguro, postArquivoSeguro } from "../requests";
import { FRASES_STATUS } from "./constantes";

// Intervalo entre consultas de status do processamento (ms).
const INTERVALO_POLLING_MS = 15000
// Tempo máximo aguardando o processamento antes de desistir (ms).
const TIMEOUT_POLLING_MS = 10 * 60 * 1000

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Envia o arquivo e resolve com o jobId retornado pelo backend.
const enviarUpload = (formData) =>
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

// Consulta uma vez o status do processamento de um job.
const consultarStatus = (jobId) =>
  new Promise((resolve, reject) => {
    getSeguro(`upload/status/${jobId}`, resolve, reject)
  })

// Baixa o resultado (.zip) de um job concluído e resolve com o Blob.
const baixarResultado = (jobId) =>
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

// Faz polling do status até concluir (DONE), falhar (ERROR/FAILED) ou estourar
// o tempo limite. Resolve com o Blob do resultado.
// O callback recebe o índice atual da frase de status, para feedback ao usuário.
const aguardarProcessamento = async (jobId, callback = () => { }) => {
  const inicio = Date.now()
  let contadorStatus = 0
  const interval = setInterval(() => {
    if (contadorStatus < FRASES_STATUS.length - 1) contadorStatus++
    callback(contadorStatus)
  }, 4000)

  while (Date.now() - inicio < TIMEOUT_POLLING_MS) {
    const resposta = await consultarStatus(jobId)
    const status = String(resposta?.status ?? '').toUpperCase()

    if (status === 'DONE' || status === 'COMPLETED' || status === 'SUCCESS') {
      contadorStatus = FRASES_STATUS.length - 1
      callback(contadorStatus)
      clearInterval(interval)
      return baixarResultado(jobId)
    }
    if (status === 'ERROR' || status === 'FAILED') {
      clearInterval(interval)
      throw new Error(resposta?.error || `Processamento falhou (status: ${status}).`)
    }

    await dormir(INTERVALO_POLLING_MS)
  }

  clearInterval(interval)
  throw new Error('Tempo limite excedido aguardando o processamento da música.')
}

const Playback = () => {

  const navigate = useNavigate()

  const fs = getFileSystem();
  const inputRef = useRef(null)

  const [playbacks, setPlaybacks] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [contadorStatus, setContadorStatus] = useState(0);

  useEffect(() => {
    fs.listar(FILE_SYSTEM_TYPE.PLAYBACK)
      .then(res => { setPlaybacks(res) })
      .catch(() => { /** TODO: tratar erro de listagem */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importarArquivo = async (arquivo) => {
    if (!arquivo || carregando) return

    setCarregando(true)
    setContadorStatus(0)

    try {
      const formData = new FormData()
      formData.append('file', arquivo, arquivo.name)

      // Novo fluxo assíncrono: envia o arquivo, recebe um jobId, faz polling
      // do status e só então baixa o .zip com os 2 mp3 (voz e instrumentos).
      const jobId = await enviarUpload(formData)
      const zipBlob = await aguardarProcessamento(jobId, (v) => setContadorStatus(v))
      const stems = await extrairStems(zipBlob)

      const id = uuidv4()
      await salvarStems(fs, id, stems)

      const playback = {
        titulo: tituloPadraoDoArquivo(arquivo.name),
        artista: '',
        tom: '0',
        volumeVoz: '0.5',
        volumeInstrumentos: '0.5',
        nomeArquivo: arquivo.name,
      }
      await fs.salvar(id, playback, FILE_SYSTEM_TYPE.PLAYBACK)

      setCarregando(false)
      // Segue para a tela de configuração (título, artista, tom, volumes).
      navigate(`/edicao-playback/${id}`)
    } catch (erro) {
      console.error('Falha ao processar o playback:', erro)
      alert('Não foi possível processar a música. Tente novamente.')
      setCarregando(false)
    }
  }

  const handleChange = (e) => {
    const arquivo = e.target.files?.[0]
    // Permite reimportar o mesmo arquivo depois (o change não dispara com o
    // mesmo value duas vezes seguidas).
    e.target.value = ''
    importarArquivo(arquivo)
  }

  const excluirPlayback = async (e, currentId) => {
    e.stopPropagation()
    await removerStems(fs, currentId)
    await fs.remover(currentId, FILE_SYSTEM_TYPE.PLAYBACK)
    setPlaybacks(prev => prev.filter(i => i.id !== currentId))
  }

  return (
    <div className="container container-com-footer">
      <NavTop
        title={'Meus playbacks'}
        onBack={() => navigate('/')}
        actionIcon={faGear}
        onAction={() => { /* TODO: abrir configurações */ }}
      />

      <input
        ref={inputRef}
        className="input-invisivel"
        type="file"
        id="playback"
        name="playback"
        accept=".mp3,audio/mpeg"
        onChange={handleChange}
      />

      <div className="main">
        <div className='main-content'>
          {!!carregando && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexDirection: 'column', alignItems: 'center' }}>
              <div className="loader"></div>
              <p>{FRASES_STATUS[contadorStatus]}</p>
            </div>
          )}
          {playbacks.map(c => (
            <Card
              key={c.id}
              action={
                <Button
                  icon={faTrash}
                  tipo={TipoBotao.AUXILIAR}
                  label={'Excluir'}
                  onClick={(e) => excluirPlayback(e, c.id)}
                />
              }
              clickable
              onClick={() => navigate(`/edicao-playback/${c.id}`)}
              title={c.titulo}
              subtitle={c.artista}
            />
          ))}
        </div>
      </div>
      <AppFooter
        primario={
          <Button
            tipo={TipoBotao.PRIMARIO}
            label={carregando ? 'Processando música...' : 'Importar música'}
            onClick={() => inputRef.current?.click()}
            disabled={carregando}
          />
        }
      />
    </div>
  )
}

export default Playback;
