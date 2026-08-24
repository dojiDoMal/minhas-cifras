import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import './App.css'
import EdicaoRitmo from './paginas/EdicaoRitmo.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/edicao-cifra" replace /> },
  { path: '/edicao-cifra', element: <App /> },
  { path: '/edicao-cifra/edicao-ritmo', element: <EdicaoRitmo /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
