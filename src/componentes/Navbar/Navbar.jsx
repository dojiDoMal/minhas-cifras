import { faAngleLeft, faBars, faClover, faFilter, faGear, faGears, faGuitar, faListUl, faMusic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import './Navbar.css'

export default function Navbar({ tab, setTab }) {
  return (
    <>
      <nav className="nav-top">
        {tab === 'resultados'
          ? <button className="nav-icon" onClick={() => setTab('filtros')}><FontAwesomeIcon icon={faAngleLeft} /></button>
          : <button className="nav-icon"><FontAwesomeIcon icon={faBars} /></button>
        }
        <span className="nav-title">{tab === 'resultados' ? 'Resultados' : (<span><FontAwesomeIcon className="icone-titulo" icon={faMusic} /> Minhas cifras</span>)}</span>
        <button className="nav-icon"><FontAwesomeIcon icon={faGear} /></button>
      </nav>
      <nav className="nav-bottom">
        <button className={tab === 'filtros' ? 'active' : ''} onClick={() => setTab('filtros')}><div className="content-nav-bottom"><FontAwesomeIcon icon={faFilter} /><span>Filtros</span></div></button>
        <button className={tab === 'resultados' ? 'active' : ''} onClick={() => setTab('resultados')}><div className="content-nav-bottom"><FontAwesomeIcon icon={faListUl} /><span>Resultados</span></div></button>
      </nav>
    </>
  )
}
