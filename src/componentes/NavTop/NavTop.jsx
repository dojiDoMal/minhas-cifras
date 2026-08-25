import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import './NavTop.css'

export default function NavTop({
  title,
  subtitle,
  onBack,
  actionIcon,
  onAction
}) {
  return (
    <nav className="nav-top">
      <button className="nav-icon" onClick={onBack}>
        <FontAwesomeIcon icon={faAngleLeft} />
      </button>

      <div className="nav-top-titles">
        <span className="nav-title">{title}</span>
        {subtitle && <span className="nav-title nav-subtitle">{subtitle}</span>}
      </div>

      {actionIcon ? (
        <button className="nav-icon" onClick={onAction}>
          <FontAwesomeIcon icon={actionIcon} />
        </button>
      ) : (
        <span className="nav-icon nav-icon-placeholder" />
      )}
    </nav>
  )
}
