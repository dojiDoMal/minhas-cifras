import './AppFooter.css'

export default function AppFooter({ primario, secundario }) {
  return (
    <div className="app-footer">
      {secundario}
      {primario}
    </div>
  )
}
