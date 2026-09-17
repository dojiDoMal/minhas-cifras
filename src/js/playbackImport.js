import JSZip from 'jszip'
import { chavesStems } from './FileSystem'

// Nomes dos arquivos que o backend coloca dentro do .zip.
const NOME_VOZ = 'vocals.mp3'
const NOME_INSTRUMENTOS = 'no_vocals.mp3'

// Extrai só o nome do arquivo, ignorando eventuais pastas dentro do zip.
const nomeBase = (caminho) => caminho.split('/').pop().toLowerCase()

/**
 * A partir do .zip devolvido pelo backend, extrai os dois stems como Blobs.
 *
 * O backend nomeia os arquivos internos como `vocals.mp3` (voz) e
 * `no_vocals.mp3` (instrumentos). A identificação usa esses nomes; se não
 * encontrar, cai numa heurística e, por fim, na ordem dos arquivos.
 *
 * @param {Blob} zipBlob  conteúdo binário do .zip
 * @returns {Promise<{ voz: Blob, instrumentos: Blob }>}
 */
export const extrairStems = async (zipBlob) => {
    const zip = await JSZip.loadAsync(zipBlob)

    const arquivosMp3 = Object.values(zip.files)
        .filter((f) => !f.dir && /\.mp3$/i.test(f.name))

    if (arquivosMp3.length < 2) {
        throw new Error(`Esperados 2 arquivos .mp3 no zip, encontrados ${arquivosMp3.length}.`)
    }

    // 1) Nomes exatos do backend.
    let arquivoVoz = arquivosMp3.find((f) => nomeBase(f.name) === NOME_VOZ)
    let arquivoInstrumentos = arquivosMp3.find((f) => nomeBase(f.name) === NOME_INSTRUMENTOS)

    // 2) Heurística: "no_vocals" é instrumentos; um "vocals/voz" isolado é voz.
    //    Cuidado: "no_vocals" contém "vocals", por isso o instrumentos vem primeiro.
    if (!arquivoInstrumentos) {
        arquivoInstrumentos = arquivosMp3.find((f) => /no[_-]?voc|instrument|karaoke|accompan/i.test(nomeBase(f.name)))
    }
    if (!arquivoVoz) {
        arquivoVoz = arquivosMp3.find((f) => f !== arquivoInstrumentos && /voc|voz|voice/i.test(nomeBase(f.name)))
    }

    // 3) Fallback final: usa a ordem dos arquivos no zip.
    if (!arquivoVoz || !arquivoInstrumentos) {
        const [a, b] = arquivosMp3
        arquivoVoz = arquivoVoz ?? (a !== arquivoInstrumentos ? a : b)
        arquivoInstrumentos = arquivoInstrumentos ?? (b !== arquivoVoz ? b : a)
    }

    const [voz, instrumentos] = await Promise.all([
        arquivoVoz.async('blob'),
        arquivoInstrumentos.async('blob'),
    ])

    return {
        voz: new Blob([voz], { type: 'audio/mpeg' }),
        instrumentos: new Blob([instrumentos], { type: 'audio/mpeg' }),
    }
}

/**
 * Persiste os stems de um playback no FileSystem (armazenamento binário).
 * @param {import('./FileSystem').FileSystem} fs
 * @param {string} id  id do playback
 * @param {{ voz: Blob, instrumentos: Blob }} stems
 * @returns {Promise<void>}
 */
export const salvarStems = async (fs, id, stems) => {
    const chaves = chavesStems(id)
    await Promise.all([
        fs.salvarArquivo(chaves.voz, stems.voz),
        fs.salvarArquivo(chaves.instrumentos, stems.instrumentos),
    ])
}

/**
 * Remove os stems de um playback do FileSystem.
 * @param {import('./FileSystem').FileSystem} fs
 * @param {string} id  id do playback
 * @returns {Promise<void>}
 */
export const removerStems = async (fs, id) => {
    const chaves = chavesStems(id)
    await Promise.all([
        fs.removerArquivo(chaves.voz),
        fs.removerArquivo(chaves.instrumentos),
    ])
}

/**
 * Deriva um título "amigável" a partir do nome do arquivo mp3, para
 * pré-preencher o formulário de configuração.
 * @param {string} nomeArquivo
 * @returns {string}
 */
export const tituloPadraoDoArquivo = (nomeArquivo) =>
    (nomeArquivo || '')
        .replace(/\.mp3$/i, '')
        .replace(/[_]+/g, ' ')
        .trim()
