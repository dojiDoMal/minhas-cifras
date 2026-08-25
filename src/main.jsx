import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App.jsx'
import './App.css'
import NovaCifra from './paginas/NovaCifra.jsx'
import EdicaoRitmo from './paginas/EdicaoRitmo.jsx'
import ConsultaCifra from './paginas/ConsultaCifra.jsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/edicao-cifra', element: <NovaCifra /> },
  { path: '/edicao-cifra/edicao-ritmo', element: <EdicaoRitmo /> },
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
