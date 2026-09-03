import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { store } from './store'
import './index.css'
import App from './App.jsx'
import './App.css'

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false })
    .then(() => StatusBar.setBackgroundColor({ color: '#0f1620' }))
    .then(() => StatusBar.setStyle({ style: Style.Dark }))
    .catch((error) => console.warn('Não foi possível configurar a status bar:', error))
}
import NovaCifra from './paginas/NovaCifra.jsx'
import EdicaoRitmo from './paginas/EdicaoRitmo.jsx'
import EdicaoAcordes from './paginas/EdicaoAcordes.jsx'
import EdicaoLetra from './paginas/EdicaoLetra.jsx'
import EdicaoTablatura from './paginas/EdicaoTablatura.jsx'
import ConsultaCifra from './paginas/ConsultaCifra.jsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/edicao-cifra', element: <NovaCifra /> },
  { path: '/edicao-cifra/edicao-ritmo', element: <EdicaoRitmo /> },
  { path: '/edicao-cifra/edicao-acordes', element: <EdicaoAcordes /> },
  { path: '/edicao-cifra/edicao-letra', element: <EdicaoLetra /> },
  { path: '/edicao-cifra/edicao-tablatura', element: <EdicaoTablatura /> },
  { path: '/consulta-cifra/:id', element: <ConsultaCifra /> },
  { path: '/edicao-cifra/:id', element: <NovaCifra /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
