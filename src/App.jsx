import { useNavigate } from 'react-router-dom'
import Navbar from './componentes/Navbar/Navbar'

export default function App() {
  const navigate = useNavigate()

  return (
    <div className="container">
      <Navbar tab="home" onNovaCifra={() => navigate('/edicao-cifra')} />

      <div className="main">
        {/* Lista de cifras (home) */}
      </div>
    </div>
  )
}
