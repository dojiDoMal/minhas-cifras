import { ChordDisplay, LyricsDisplay, RhythmDisplay, Section } from "tab-sketch/react";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { getFileSystem } from "../js/FileSystemFactory";
import { TipoBloco } from "../store/cifraSlice";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../componentes/Card/Card";
import NavTop from "../componentes/NavTop/NavTop";
import BotaoTopo from "../componentes/BotaoTopo/BotaoTopo";
import { FILE_SYSTEM_TYPE } from "../js/FileSystem";


const ConsultaPlayback = () => {

  const fs = getFileSystem();
  const { id } = useParams();
  const navigate = useNavigate();
  const [playback, setPlayback] = useState({})

  useEffect(() => {
    if (id) {
      fs.ler(id, FILE_SYSTEM_TYPE.PLAYBACK)
        .then(res => { setPlayback(res) })
        .catch(err => { /** TODO */ })
    }
  }, [id])

  return (
    <div className="container">
      <NavTop
        title={playback?.titulo}
        subtitle={playback?.artista}
        onBack={() => navigate('/')}
        actionIcon={faPen}
        onAction={() => navigate(`/edicao-playback/${id}`)}
      />
      <div className="main">
        <div className="main-content">
          {/** TODO: implementar */}
        </div>
      </div>
      <BotaoTopo />
    </div>
  )
}

export default ConsultaPlayback;
