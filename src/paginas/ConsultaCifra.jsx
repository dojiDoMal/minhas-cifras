import { ChordDisplay, LyricsDisplay, RhythmDisplay, Section } from "tab-sketch/react";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { getFileSystem } from "../js/FileSystemFactory";
import { TipoBloco } from "../store/cifraSlice";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../componentes/Card/Card";
import NavTop from "../componentes/NavTop/NavTop";
import BotaoTopo from "../componentes/BotaoTopo/BotaoTopo";


const ConsultaCifra = () => {

  const fs = getFileSystem();
  const { id } = useParams();
  const navigate = useNavigate();
  const [cifra, setCifra] = useState({})

  useEffect(() => {
    if (id) {
      fs.lerCifra(id)
        .then(res => { setCifra(res) })
        .catch(err => { /** TODO */ })
    }
  }, [id])

  const secoes = cifra?.secoes ?? [];

  const renderBloco = (b, i) => {
    if (b.tipo == TipoBloco.ACORDES) {
      return (
        <div key={`chord-${i}`} style={{ display: 'flex', gap: '8px' }}>
          <Card hideHeader row>
            {b.dados.acordes.map((ac, j) => {
              const nome = typeof ac === 'string' ? ac : ac.nome
              const shapeVariant = typeof ac === 'string' ? 0 : (ac.shapeVariant ?? 0)
              return <ChordDisplay key={j} chord={nome} shapeVariant={shapeVariant} />
            })}
          </Card>
        </div>
      )
    }
    if (b.tipo == TipoBloco.RITMO) {
      return (
        <Card key={`rhythm-${i}`} title={b.titulo} row>
          <RhythmDisplay pattern={b.dados.pattern} timeSignature={b.dados.timeSignature} />
        </Card>
      )
    }
    if (b.tipo == TipoBloco.LETRA) {
      return (
        <Card hideHeader key={`lyrics-${i}`}>
          <LyricsDisplay raw={true}>{`[${b.titulo}]`}</LyricsDisplay>
          <LyricsDisplay>{b.dados.texto}</LyricsDisplay>
        </Card>
      )
    }
    return null
  }

  return (
    <div className="container">
      <NavTop
        title={cifra?.titulo}
        subtitle={cifra?.artista}
        onBack={() => navigate('/')}
        actionIcon={faPen}
        onAction={() => navigate(`/edicao-cifra/${id}`)}
      />
      <div className="main">
        <div className="main-content">
          {secoes.map((secao, s) => (
            <Section
              key={secao.id ?? `secao-${s}`}
              capo={secao.capo}
              tuning={secao.tuning}
              bpm={secao.bpm}
              chordTitleColor="#78aee0"
            >
              {secao.blocos?.map((b, i) => renderBloco(b, i))}
            </Section>
          ))}
        </div>
      </div>
      <BotaoTopo />
    </div>
  )
}

export default ConsultaCifra;
