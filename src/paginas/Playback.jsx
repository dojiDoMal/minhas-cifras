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
import { postArquivoSeguro } from "../requests";

const Playback = () => {

  const navigate = useNavigate()

  const fs = getFileSystem();
  const inputRef = useRef(null)

  const [playbacks, setPlaybacks] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    fs.listar(FILE_SYSTEM_TYPE.PLAYBACK)
      .then(res => { setPlaybacks(res) })
      .catch(() => { /** TODO: tratar erro de listagem */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importarArquivo = (arquivo) => {
    if (!arquivo || carregando) return

    setCarregando(true)

    const formData = new FormData()
    formData.append('file', arquivo, arquivo.name)

    postArquivoSeguro(
      'upload',
      formData,
      async (res) => {
        try {
          // O backend devolve um .zip com 2 mp3 (voz e instrumentos).
          const zipBlob = await res.blob()
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
      },
      (err) => {
        console.error('Falha no upload do playback:', err)
        alert('Não foi possível enviar a música. Tente novamente.')
        setCarregando(false)
      }
    )
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
              onClick={() => navigate(`/consulta-playback/${c.id}`)}
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
            label={carregando ? 'Processando música' : 'Importar música'}
            onClick={() => inputRef.current?.click()}
            disabled={carregando}
          />
        }
      />
    </div>
  )
}

export default Playback;
