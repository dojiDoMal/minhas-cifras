import { faBars, faGear, faHome, faMusic, faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import './Navbar.css'

export default function Navbar({ tab = 'home', onNovaCifra }) {
  return (
    <>
      <nav className="nav-top">
        <button className="nav-icon"><FontAwesomeIcon icon={faBars} /></button>
        <span className="nav-title"><span><FontAwesomeIcon className="icone-titulo" icon={faMusic} /> Minhas cifras</span></span>
        <button className="nav-icon"><FontAwesomeIcon icon={faGear} /></button>
      </nav>
      <nav className="nav-bottom">
        <button className={tab === 'home' ? 'active' : ''}><div className="content-nav-bottom"><FontAwesomeIcon icon={faHome} /><span>Início</span></div></button>
        <button onClick={onNovaCifra}><div className="content-nav-bottom"><FontAwesomeIcon icon={faPen} /><span>Criar</span></div></button>
      </nav>
    </>
  )
}
