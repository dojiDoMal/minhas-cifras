import { faSheetPlastic, faTrash } from '@fortawesome/free-solid-svg-icons';
import { getFileSystem } from './js/FileSystemFactory';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Button, { TipoBotao } from './componentes/Button/Button';
import Card from './componentes/Card/Card'
import Navbar from './componentes/Navbar/Navbar';

export default function App() {
  const navigate = useNavigate()

  const fs = getFileSystem();
  const id = uuidv4()
  //fs.salvarCifra(id, { titulo: "teste", conteudo: "lorem ipsum" })

  const [cifras, setCifras] = useState([])

  useEffect(() => {
    fs.listarCifras()
      .then(res => { console.log(res); setCifras(res) })
      .catch(err => { /** TODO */ })
  }, [])

  return (
    <div className="container">
      <Navbar tab="home" onNovaCifra={() => navigate('/edicao-cifra')} />

      <div className="main">
        <div className='main-content'>
          {cifras.map(c => (
            <Card
              action={
                <Button
                  icon={faTrash}
                  tipo={TipoBotao.AUXILIAR}
                  label={'Excluir'}
                  onClick={(e) => {
                    e.stopPropagation()
                    const currentId = c.id;
                    fs.removerCifra(currentId)
                    setCifras(prev => prev.filter(i => i.id !== currentId))
                  }}
                />
              }
              clickable
              onClick={() => navigate(`/consulta-cifra/${c.id}`)}
              title={c.titulo}
              subtitle={c.artista}
            />
          ))}
        </div>
      </div>
    </div >
  )
}
