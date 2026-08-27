import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Section } from 'tab-sketch/react'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import Spacer from '../componentes/Spacer/Spacer'
import PainelAcordes from '../componentes/PainelAcordes/PainelAcordes'
import EditorLetra from '../componentes/EditorLetra/EditorLetra'
import { TipoBloco, adicionarBloco, atualizarDadosBloco, setTituloBloco, selectBlocoPorId } from '../store/cifraSlice'

export default function EdicaoLetra() {

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()

  // Quando `?bloco=<id>` está presente, estamos editando um bloco existente.
  const blocoId = searchParams.get('bloco')
  const blocoExistente = useSelector(selectBlocoPorId(blocoId))
  const editando = Boolean(blocoExistente)

  // Rascunho local. Só vira bloco ao clicar em "Adicionar"/"Salvar".
  const [tituloCardLetra, setTituloCardLetra] = useState(blocoExistente?.titulo || 'Letra 1')
  const [texto, setTexto] = useState(blocoExistente?.dados?.texto ?? '')

  const textareaRef = useRef(null)

  // Insere o acorde escolhido no painel na posição do cursor.
  // O acorde é gravado no formato [Acorde], reconhecido pelo LyricsDisplay
  // e destacado como chip azul no EditorLetra.
  const inserirAcorde = (acorde) => {
    const marcador = `[${acorde}]`
    const el = textareaRef.current
    if (!el) {
      setTexto((atual) => atual + marcador)
      return
    }

    const inicio = el.selectionStart ?? texto.length
    const fim = el.selectionEnd ?? texto.length
    const novoTexto = texto.slice(0, inicio) + marcador + texto.slice(fim)
    setTexto(novoTexto)

    // Reposiciona o cursor logo após o acorde inserido.
    requestAnimationFrame(() => {
      const pos = inicio + marcador.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  // Persiste a letra e volta para a edição da cifra.
  // Se estamos editando um bloco existente, atualiza; senão, cria um novo.
  const salvarLetra = () => {
    if (editando) {
      dispatch(atualizarDadosBloco({ id: blocoId, dados: { texto } }))
      dispatch(setTituloBloco({ id: blocoId, titulo: tituloCardLetra }))
    } else {
      dispatch(
        adicionarBloco({
          tipo: TipoBloco.LETRA,
          titulo: tituloCardLetra,
          dados: { texto },
        }),
      )
    }
    navigate('/edicao-cifra')
  }

  return (
    <div className="container container-com-footer">
      <nav className="nav-top">
        <button className="nav-icon" onClick={() => navigate('/edicao-cifra')}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <span className="nav-title">{editando ? 'Editar letra' : 'Edição de letra'}</span>
        <span className="nav-icon" />
      </nav>

      <div className="main">
        <div className='main-content'>
          <Section chordTitleColor="#78aee0">
            <Card
              title={tituloCardLetra}
              allowTitleChange
              onTituloChange={(value) => { setTituloCardLetra(value) }}
            >
              <EditorLetra
                ref={textareaRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite a letra da música..."
                rows={12}
              />
              <Spacer />
              <Button
                tipo={TipoBotao.PRIMARIO}
                label={editando ? 'Salvar' : 'Adicionar'}
                textAlign='center'
                onClick={salvarLetra}
              />
            </Card>
          </Section>
        </div>
      </div>

      <PainelAcordes onSelecionarAcorde={inserirAcorde} />
    </div>
  )
}
