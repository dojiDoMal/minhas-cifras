import { aguardarProcessamento, enviarUpload, lerJobPendente, limparJobPendente, salvarJobPendente } from "./helper";
import { extrairStems, removerStems, salvarStems, tituloPadraoDoArquivo } from "../../js/playbackImport";
import { faGear, faTrash } from "@fortawesome/free-solid-svg-icons"
import { FILE_SYSTEM_TYPE } from "../../js/FileSystem";
import { getArquivoSeguro, getSeguro, postArquivoSeguro } from "../../requests";
import { getFileSystem } from "../../js/FileSystemFactory";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid';
import AppFooter from "../../componentes/AppFooter/AppFooter";
import Button, { TipoBotao } from "../../componentes/Button/Button";
import Card from "../../componentes/Card/Card";
import NavTop from "../../componentes/NavTop/NavTop"
import './Playback.css'


const Playback = () => {

  const navigate = useNavigate()

  const fs = getFileSystem();
  const inputRef = useRef(null)

  const [playbacks, setPlaybacks] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [temJobPendente, setTemJobPendente] = useState(() => !!lerJobPendente()?.jobId)

  const processandoRef = useRef(false)

  const marcarJobPendente = (jobId, nomeArquivo) => {
    salvarJobPendente(jobId, nomeArquivo)
    setTemJobPendente(true)
  }
  const descartarJobPendente = () => {
    limparJobPendente()
    setTemJobPendente(false)
  }

  // Caminho de conclusão único, usado tanto pelo fluxo de importação quanto pela 
  // retomada ao voltar ao app. Recebe jobId e nomeArquivo (este último necessário 
  // para montar o playback, inclusive numa retomada a frio em que o arquivo 
  // original não está mais em mãos).
  const concluirJob = async (jobId, nomeArquivo) => {
    const zipBlob = await aguardarProcessamento(jobId)
    const stems = await extrairStems(zipBlob)

    const id = uuidv4()
    await salvarStems(fs, id, stems)

    const playback = {
      titulo: tituloPadraoDoArquivo(nomeArquivo),
      artista: '',
      tom: '0',
      volumeVoz: '0.5',
      volumeInstrumentos: '0.5',
      nomeArquivo,
    }
    await fs.salvar(id, playback, FILE_SYSTEM_TYPE.PLAYBACK)

    descartarJobPendente()
    navigate(`/edicao-playback/${id}`)
  }

  useEffect(() => {
    fs.listar(FILE_SYSTEM_TYPE.PLAYBACK)
      .then(res => { setPlaybacks(res) })
      .catch(() => { /** TODO: tratar erro de listagem */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sempre que o app volta ao primeiro plano, verifica se
  // há um job pendente e, se houver, retoma o polling. 
  useEffect(() => {
    const retomarSePendente = async () => {
      const pendente = lerJobPendente()
      // Trava síncrona: se já há um processamento em curso, ignora.
      if (!pendente?.jobId || processandoRef.current) return

      processandoRef.current = true
      setCarregando(true)
      try {
        await concluirJob(pendente.jobId, pendente.nomeArquivo)
      } catch (erro) {
        console.error('Falha ao retomar o processamento do playback:', erro)
        // O job não vai mais concluir (expirou, falhou ou tempo limite):
        descartarJobPendente()
        alert('Não foi possível concluir o processamento da música. Tente novamente.')
      } finally {
        processandoRef.current = false
        setCarregando(false)
      }
    }

    const aoVoltar = () => {
      if (document.visibilityState === 'visible') retomarSePendente()
    }

    // Roda uma vez ao montar (cobre a reabertura "a frio" do app).
    retomarSePendente()
    document.addEventListener('resume', aoVoltar)
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      document.removeEventListener('resume', aoVoltar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importarArquivo = async (arquivo) => {
    // Não inicia novo upload se já há um processando ou um job pendente por concluir.
    if (!arquivo || processandoRef.current || lerJobPendente()?.jobId) return

    processandoRef.current = true
    setCarregando(true)

    try {
      const formData = new FormData()
      formData.append('file', arquivo, arquivo.name)
      const jobId = await enviarUpload(formData)
      marcarJobPendente(jobId, arquivo.name)
      await concluirJob(jobId, arquivo.name)
    } catch (erro) {
      console.error('Falha ao processar o playback:', erro)
      // Não limpamos o job pendente aqui de propósito: a falha pode ser apenas
      // o app ter sido suspenso durante o polling. A retomada ao voltar decide
      // se ainda há algo a fazer (e limpa se o backend indicar falha/expiração).
      alert('Não foi possível processar a música. Tente novamente.')
    } finally {
      processandoRef.current = false
      setCarregando(false)
    }
  }

  const handleChange = (e) => {
    const arquivo = e.target.files?.[0]
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
          {(carregando || temJobPendente) && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexDirection: 'column', alignItems: 'center' }}>
              <div className="loader"></div>
              <p>{"Seu playback ficará pronto em alguns minutos..."}</p>
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
            label={(carregando || temJobPendente) ? 'Processando música...' : 'Importar música'}
            onClick={() => inputRef.current?.click()}
            disabled={carregando || temJobPendente}
          />
        }
      />
    </div>
  )
}

export default Playback;
