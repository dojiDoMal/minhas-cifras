import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { faAngleLeft, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ChordEditor, ChordLib, Section } from 'tab-sketch/react'
import { chords as todosAcordes } from 'tab-sketch'
import Button, { TipoBotao } from '../componentes/Button/Button'
import Card from '../componentes/Card/Card'
import Spacer from '../componentes/Spacer/Spacer'
import { TipoBloco, adicionarBloco, atualizarDadosBloco, setTituloBloco, selectBlocoPorId } from '../store/cifraSlice'

export default function EdicaoAcordes() {

  const editorRef = useRef()

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()

  // Quando `?bloco=<id>` está presente, estamos editando um bloco existente.
  const blocoId = searchParams.get('bloco')
  const blocoExistente = useSelector(selectBlocoPorId(blocoId))
  const editando = Boolean(blocoExistente)

  // O store guarda { nome, shapeVariant }; o ChordEditor usa { chord, shapeVariant }.
  const acordesIniciais = blocoExistente?.dados?.acordes?.map((ac) => ({
    chord: typeof ac === 'string' ? ac : ac.nome,
    shapeVariant: typeof ac === 'string' ? 0 : (ac.shapeVariant ?? 0),
  })) ?? []

  // Rascunho local dos acordes. Só vira bloco ao clicar em "Adicionar"/"Salvar".
  const [tituloCardAcordes, setTituloCardAcordes] = useState(blocoExistente?.titulo || 'Acordes 1')
  const [acordes, setAcordes] = useState(acordesIniciais)
  const [buscaAcorde, setBuscaAcorde] = useState('')

  const todosNomesAcordes = Object.keys(todosAcordes)
  const nomesFiltrados = buscaAcorde
    ? todosNomesAcordes.filter((nome) => nome.toLowerCase().includes(buscaAcorde.toLowerCase()))
    : undefined // undefined = ChordLib mostra todos por padrão

  // Adiciona um acorde da biblioteca ao editor (via clique no "+").
  const adicionarAcordeAoEditor = (entry) => {
    editorRef.current?.addChord(entry)
  }

  // Persiste o conjunto de acordes montado e volta para a edição da cifra.
  // O editor usa { chord, shapeVariant }; o store guarda { nome, shapeVariant }.
  // Se estamos editando um bloco existente, atualiza; senão, cria um novo.
  const salvarAcordes = () => {
    const lista = editorRef.current?.getChords() ?? acordes
    const acordesStore = lista.map(({ chord, shapeVariant }) => ({
      nome: chord,
      shapeVariant: shapeVariant ?? 0,
    }))

    if (editando) {
      dispatch(atualizarDadosBloco({ id: blocoId, dados: { acordes: acordesStore } }))
      dispatch(setTituloBloco({ id: blocoId, titulo: tituloCardAcordes }))
    } else {
      dispatch(
        adicionarBloco({
          tipo: TipoBloco.ACORDES,
          titulo: tituloCardAcordes,
          dados: { acordes: acordesStore },
        }),
      )
    }
    navigate('/edicao-cifra')
  }

  return (
    <div className="container">
      <nav className="nav-top">
        <button className="nav-icon" onClick={() => navigate('/edicao-cifra')}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <span className="nav-title">{editando ? 'Editar acordes' : 'Edição de acordes'}</span>
        <span className="nav-icon" />
      </nav>

      <div className="main">
        <div className='main-content'>
          <Section chordTitleColor="#78aee0">
            <Card
              title={tituloCardAcordes}
              allowTitleChange
              action={
                <Button
                  tipo={TipoBotao.AUXILIAR}
                  icon={faTrash}
                  label="Limpar"
                  onClick={() => {
                    editorRef?.current?.clear()
                    setAcordes([])
                  }}
                />
              }
              onTituloChange={(value) => { setTituloCardAcordes(value) }}
            >
              <ChordEditor
                ref={editorRef}
                chords={acordesIniciais}
                onChange={(value) => { setAcordes(value) }}
              />
              <Spacer />
              <Button
                tipo={TipoBotao.PRIMARIO}
                label={editando ? 'Salvar' : 'Adicionar'}
                textAlign='center'
                onClick={salvarAcordes}
              />
            </Card>

            <Card title={'Biblioteca de acordes'}>
              <input
                type="text"
                placeholder="Buscar acorde..."
                value={buscaAcorde}
                onChange={(e) => setBuscaAcorde(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-1)',
                  color: 'var(--color-white)',
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                }}
              />
              <ChordLib chordNames={nomesFiltrados} onAdd={adicionarAcordeAoEditor} />
            </Card>
          </Section>
        </div>
      </div>
    </div>
  )
}
