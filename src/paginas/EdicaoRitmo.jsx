import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { faAngleLeft, faSearch, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { RhythmDisplay, RhythmEditor } from 'tab-sketch/react'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import Spacer from '../componentes/Spacer/Spacer'
import { RITMOS_PREDEFINIDOS } from '../ritmos'
import { TipoBloco, adicionarBloco, atualizarDadosBloco, setTituloBloco, selectBlocoPorId } from '../store/cifraSlice'

const RITMOS_POR_PAGINA = 3

export default function EdicaoRitmo() {

  const editorRef = useRef();

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()

  // Quando há `?bloco=<id>` na URL, estamos editando um bloco existente.
  const blocoId = searchParams.get('bloco')
  const blocoEmEdicao = useSelector(selectBlocoPorId(blocoId))
  const editando = Boolean(blocoEmEdicao)

  const [ritmosVisiveis, setRitmosVisiveis] = useState(RITMOS_POR_PAGINA)

  // Rascunho local do ritmo desenhado à mão. Ao editar, inicia com os dados do bloco.
  const [tituloCardRitmo, setTituloCardRitmo] = useState(blocoEmEdicao?.titulo ?? 'Ritmo 1')

  // Pattern inicial usado só para popular o editor na montagem. As edições
  // subsequentes ficam no estado interno do RhythmEditor; o valor atual é lido
  // pelo `onChange` (patternRef) na hora de salvar.
  const patternInicial = blocoEmEdicao?.dados?.pattern ?? ''
  const patternRef = useRef(patternInicial)

  const timeSignature = blocoEmEdicao?.dados?.timeSignature ?? [4, 4]

  // Adiciona o ritmo desenhado à mão como bloco (ou atualiza o existente)
  // e volta para a edição da cifra.
  const salvarRitmoManual = () => {
    const pattern = patternRef.current
    if (editando) {
      dispatch(setTituloBloco({ id: blocoId, titulo: tituloCardRitmo }))
      dispatch(atualizarDadosBloco({ id: blocoId, dados: { pattern, timeSignature } }))
    } else {
      dispatch(
        adicionarBloco({
          tipo: TipoBloco.RITMO,
          titulo: tituloCardRitmo,
          dados: { pattern, timeSignature: [4, 4] },
        }),
      )
    }
    navigate('/edicao-cifra')
  }

  // Adiciona um ritmo predefinido como bloco e volta para a edição da cifra
  const adicionarRitmoPredefinido = (ritmoPredefinido) => {
    dispatch(
      adicionarBloco({
        tipo: TipoBloco.RITMO,
        titulo: ritmoPredefinido.title,
        dados: {
          pattern: ritmoPredefinido.pattern,
          timeSignature: ritmoPredefinido.timeSignature,
        },
      }),
    )
    navigate('/edicao-cifra')
  }

  return (
    <div className="container">
      <nav className="nav-top">
        <button className="nav-icon" onClick={() => navigate('/edicao-cifra')}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <span className="nav-title">{editando ? 'Editar ritmo' : 'Edição de ritmo'}</span>
        <span className="nav-icon" />
      </nav>

      <div className="main">
        <div className='main-content'>
          <Card
            title={tituloCardRitmo}
            allowTitleChange
            action={
              <Button
                tipo={TipoBotao.AUXILIAR}
                icon={faTrash}
                label="Limpar"
                onClick={() => {
                  editorRef?.current?.clear()
                  patternRef.current = ''
                }}
              />
            }
            onTituloChange={(value) => { setTituloCardRitmo(value) }}
          >
            <RhythmEditor
              ref={editorRef}
              pattern={patternInicial}
              onChange={(value) => {
                patternRef.current = value
              }}
              timeSignature={timeSignature}
            />
            <Spacer />
            <Button
              tipo={TipoBotao.PRIMARIO}
              label={editando ? 'Salvar' : 'Adicionar'}
              textAlign='center'
              onClick={salvarRitmoManual}
            />
          </Card>

          <Card
            title={'Biblioteca de ritmos'}
            gap={1}
            action={<Button tipo={TipoBotao.AUXILIAR} icon={faSearch} label="Buscar" onClick={() => { console.log('TODO') }} />}
          >
            {RITMOS_PREDEFINIDOS.slice(0, ritmosVisiveis).map((ritmoPredefinido) => (
              <Card
                key={ritmoPredefinido.id}
                title={ritmoPredefinido.title}
                clickable
                onClick={() => adicionarRitmoPredefinido(ritmoPredefinido)}
                row
              >
                <RhythmDisplay showBpmLabel={false} pattern={ritmoPredefinido.pattern} timeSignature={ritmoPredefinido.timeSignature} />
              </Card>
            ))}
            <Spacer />
            {ritmosVisiveis < RITMOS_PREDEFINIDOS.length && (
              <Button
                tipo={TipoBotao.PRIMARIO}
                label="Exibir mais"
                textAlign='center'
                onClick={() => setRitmosVisiveis((n) => n + RITMOS_POR_PAGINA)}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
