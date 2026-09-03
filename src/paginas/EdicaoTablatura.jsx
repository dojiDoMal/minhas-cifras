import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { faAngleLeft, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { TabDisplay, TabEditor } from 'tab-sketch/react'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import Spacer from '../componentes/Spacer/Spacer'
import PainelTablatura from '../componentes/PainelTablatura/PainelTablatura'
import { TipoBloco, adicionarBloco, atualizarDadosBloco, setTituloBloco, selectBlocoPorId } from '../store/cifraSlice'

// Template de tablatura vazio (6 cordas). Usado como conteúdo inicial ao criar
// um novo bloco. Espelha o EMPTY_TAB interno do TabEditor.
const TAB_VAZIA = [
  'e|-------------------------|',
  'B|-------------------------|',
  'G|-------------------------|',
  'D|-------------------------|',
  'A|-------------------------|',
  'E|-------------------------|',
].join('\n')

export default function EdicaoTablatura() {

  const editorRef = useRef()

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()

  // Quando `?bloco=<id>` está presente, estamos editando um bloco existente.
  const blocoId = searchParams.get('bloco')
  const blocoEmEdicao = useSelector(selectBlocoPorId(blocoId))
  const editando = Boolean(blocoEmEdicao)

  const [tituloCardTab, setTituloCardTab] = useState(blocoEmEdicao?.titulo ?? 'Tablatura 1')

  // Tab inicial usada só para popular o editor na montagem. Novos blocos já
  // começam com o template vazio de 6 cordas. As edições subsequentes ficam no
  // estado interno do TabEditor; o valor atual é lido pelo `onChange` (tabRef)
  // na hora de salvar.
  const tabInicial = blocoEmEdicao?.dados?.tab || TAB_VAZIA
  const tabRef = useRef(tabInicial)

  // Estado usado apenas para a pré-visualização. Diferente do tabRef, alterar
  // este estado dispara re-render, então o TabDisplay acompanha as edições.
  const [tabPreview, setTabPreview] = useState(tabInicial)

  // Persiste a tablatura montada e volta para a edição da cifra.
  // Se estamos editando um bloco existente, atualiza; senão, cria um novo.
  const salvarTablatura = () => {
    const tab = editorRef.current?.getTab() ?? tabRef.current
    if (editando) {
      dispatch(setTituloBloco({ id: blocoId, titulo: tituloCardTab }))
      dispatch(atualizarDadosBloco({ id: blocoId, dados: { tab } }))
    } else {
      dispatch(
        adicionarBloco({
          tipo: TipoBloco.TABLATURA,
          titulo: tituloCardTab,
          dados: { tab },
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
        <span className="nav-title">{editando ? 'Editar tablatura' : 'Edição de tablatura'}</span>
        <span className="nav-icon" />
      </nav>

      <div className="main">
        <div className='main-content'>
          <Card
            title={tituloCardTab}
            allowTitleChange
            action={
              <Button
                tipo={TipoBotao.AUXILIAR}
                icon={faTrash}
                label="Limpar"
                onClick={() => {
                  editorRef?.current?.clear()
                  tabRef.current = TAB_VAZIA
                  setTabPreview(TAB_VAZIA)
                }}
              />
            }
            onTituloChange={(value) => { setTituloCardTab(value) }}
          >
            <TabEditor
              ref={editorRef}
              tab={tabInicial}
              showPreview={false}
              onChange={(value) => {
                tabRef.current = value
                setTabPreview(value)
              }}
            />
            <Card
              subtitle={"Pré-visualização"}
            >
              <TabDisplay tab={tabPreview} />
            </Card>
            <Spacer />
            <Button
              tipo={TipoBotao.PRIMARIO}
              label={editando ? 'Salvar' : 'Adicionar'}
              textAlign='center'
              onClick={salvarTablatura}
            />
          </Card>
        </div>
      </div>

      <PainelTablatura editorRef={editorRef} />
    </div>
  )
}
