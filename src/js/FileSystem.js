import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

export const FILE_SYSTEM_TYPE = {
    CIFRA: 'cifra:',
    PLAYBACK: 'playback:'
}

/**
 * Chaves dos arquivos binários (stems de áudio) de um playback.
 * Usadas com salvarArquivo/lerArquivo/removerArquivo.
 * @param {string} id  id do playback
 */
export const chavesStems = (id) => ({
    voz: `playback-voz:${id}`,
    instrumentos: `playback-instrumentos:${id}`,
})

/**
 *
 * Cada cifra é identificada por um `id` (string) e persistida como um
 * documento JSON. 
 *
 * @typedef {Object} ResumoCifra
 * @property {string} id
 * @property {string} titulo
 * @property {string} artista
 *
 * @typedef {Object} Bloco
 * @property {string} id
 * @property {'ritmo'|'acordes'|'tablatura'|'letra'} tipo
 * @property {string} titulo
 * @property {Object} dados  dados específicos do tipo do bloco
 *
 * @typedef {Object} Secao
 * @property {string} id
 * @property {string} titulo
 * @property {number} capo    casa do capotraste
 * @property {number} tuning  afinação (offset em semitons)
 * @property {number} bpm     batidas por minuto
 * @property {Bloco[]} blocos
 *
 * @typedef {Object} Cifra
 * @property {string} titulo
 * @property {string} artista
 * @property {Secao[]} secoes
 */
export class FileSystem {
    /**
     * Salva (cria ou sobrescreve) uma cifra.
     * @param {string} id
     * @param {Cifra} cifra
     * @returns {Promise<void>}
     */
    async salvar() {
        throw new Error('salvar() não implementado')
    }

    /**
     * Lê uma cifra pelo id.
     * @param {string} id
     * @returns {Promise<Cifra | null>} a cifra, ou null se não existir
     */
    async ler() {
        throw new Error('ler() não implementado')
    }

    /**
     * Lista as cifras salvas (apenas metadados).
     * @returns {Promise<ResumoCifra[]>}
     */
    async listar() {
        throw new Error('listar() não implementado')
    }

    /**
     * Remove uma cifra pelo id.
     * @param {string} id
     * @returns {Promise<void>}
     */
    async remover() {
        throw new Error('remover() não implementado')
    }

    /**
     * Salva o conteúdo binário de um arquivo (ex.: stems de áudio do playback).
     * @param {string} chave  identificador único do arquivo
     * @param {Blob} blob     conteúdo binário
     * @returns {Promise<void>}
     */
    async salvarArquivo() {
        throw new Error('salvarArquivo() não implementado')
    }

    /**
     * Lê o conteúdo binário de um arquivo.
     * @param {string} chave
     * @returns {Promise<Blob | null>}
     */
    async lerArquivo() {
        throw new Error('lerArquivo() não implementado')
    }

    /**
     * Remove o conteúdo binário de um arquivo.
     * @param {string} chave
     * @returns {Promise<void>}
     */
    async removerArquivo() {
        throw new Error('removerArquivo() não implementado')
    }
}

// Pasta onde ficam os arquivos binários (stems de áudio dos playbacks).
const PASTA_ARQUIVOS = 'arquivos'

/**
 * Deriva o nome da pasta (dentro do diretório de dados do app) a partir do
 * fileSystemType. Ex.: 'cifra:' -> 'cifra', 'playback:' -> 'playback'.
 * @param {string} fileSystemType
 * @returns {string}
 */
const pastaDoTipo = (fileSystemType) => {
    if (fileSystemType != FILE_SYSTEM_TYPE.CIFRA
        && fileSystemType != FILE_SYSTEM_TYPE.PLAYBACK) {
        throw new Error('FileSystem type inválido!')
    }
    return fileSystemType.replace(/:$/, '')
}

const nomeArquivo = (id, fileSystemType) => `${pastaDoTipo(fileSystemType)}/${id}.json`
const caminhoArquivoBinario = (chave) => `${PASTA_ARQUIVOS}/${chave}`

/**
 * Converte um Blob em string base64 (sem o prefixo data:).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
const blobParaBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const resultado = String(reader.result)
            // resultado vem no formato "data:<mime>;base64,<dados>"
            resolve(resultado.slice(resultado.indexOf(',') + 1))
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })

/**
 * Implementação nativa (Android/iOS via Capacitor).
 * Cada item é um arquivo JSON real dentro de Directory.Data, numa pasta
 * derivada do fileSystemType (ex.: cifra/, playback/).
 */
export class FileSystemMobile extends FileSystem {
    #diretorio = Directory.Data

    async #garantirPasta(fileSystemType) {
        try {
            await Filesystem.mkdir({
                path: pastaDoTipo(fileSystemType),
                directory: this.#diretorio,
                recursive: true,
            })
        } catch (erro) {
            // mkdir lança se a pasta já existir; isso é esperado e pode ser ignorado.
            if (!String(erro?.message ?? erro).toLowerCase().includes('exist')) {
                throw erro
            }
        }
    }

    async salvar(id, dados, fileSystemType) {
        await this.#garantirPasta(fileSystemType)
        await Filesystem.writeFile({
            path: nomeArquivo(id, fileSystemType),
            data: JSON.stringify(dados),
            directory: this.#diretorio,
            encoding: Encoding.UTF8,
            recursive: true,
        })
    }

    async ler(id, fileSystemType) {
        try {
            const { data } = await Filesystem.readFile({
                path: nomeArquivo(id, fileSystemType),
                directory: this.#diretorio,
                encoding: Encoding.UTF8,
            })
            return JSON.parse(data)
        } catch {
            // Arquivo inexistente ou JSON inválido.
            return null
        }
    }

    async listar(fileSystemType) {
        await this.#garantirPasta(fileSystemType)

        let arquivos = []
        try {
            const { files } = await Filesystem.readdir({
                path: pastaDoTipo(fileSystemType),
                directory: this.#diretorio,
            })
            arquivos = files
        } catch {
            return []
        }

        const itens = await Promise.all(
            arquivos
                .map((f) => (typeof f === 'string' ? f : f.name))
                .filter((nome) => nome.endsWith('.json'))
                .map(async (nome) => {
                    const id = nome.replace(/\.json$/, '')
                    const dados = await this.ler(id, fileSystemType)
                    if (!dados) return null
                    return { id, titulo: dados.titulo ?? '', artista: dados.artista ?? '' }
                }),
        )

        return itens.filter(Boolean)
    }

    async remover(id, fileSystemType) {
        try {
            await Filesystem.deleteFile({
                path: nomeArquivo(id, fileSystemType),
                directory: this.#diretorio,
            })
        } catch {
            // Se já não existe, não há o que remover.
        }
    }

    async #garantirPastaArquivos() {
        try {
            await Filesystem.mkdir({
                path: PASTA_ARQUIVOS,
                directory: this.#diretorio,
                recursive: true,
            })
        } catch (erro) {
            if (!String(erro?.message ?? erro).toLowerCase().includes('exist')) {
                throw erro
            }
        }
    }

    async salvarArquivo(chave, blob) {
        await this.#garantirPastaArquivos()
        const base64 = await blobParaBase64(blob)
        await Filesystem.writeFile({
            path: caminhoArquivoBinario(chave),
            data: base64,
            directory: this.#diretorio,
            recursive: true,
        })
    }

    async lerArquivo(chave) {
        try {
            const { data } = await Filesystem.readFile({
                path: caminhoArquivoBinario(chave),
                directory: this.#diretorio,
            })
            // Em plataforma nativa, `data` é base64. Reconstrói o Blob.
            if (typeof data === 'string') {
                const binario = atob(data)
                const bytes = new Uint8Array(binario.length)
                for (let i = 0; i < binario.length; i++) {
                    bytes[i] = binario.charCodeAt(i)
                }
                return new Blob([bytes])
            }
            return data
        } catch {
            return null
        }
    }

    async removerArquivo(chave) {
        try {
            await Filesystem.deleteFile({
                path: caminhoArquivoBinario(chave),
                directory: this.#diretorio,
            })
        } catch {
            // Se já não existe, não há o que remover.
        }
    }
}

/**
 * Implementação web (browser/PWA no desktop).
 * Usa localStorage: uma chave por cifra, prefixada, contendo o JSON.
 */
export class FileSystemWeb extends FileSystem {
    // Configuração do IndexedDB usado para guardar os arquivos binários (stems).
    static #DB_NOME = 'minhas-cifras'
    static #DB_VERSAO = 1
    static #STORE_ARQUIVOS = 'arquivos'

    #chave(id, fileSystemType) {
        if (fileSystemType != FILE_SYSTEM_TYPE.CIFRA
            && fileSystemType != FILE_SYSTEM_TYPE.PLAYBACK) {
            throw new Error('FileSystem type inválido!');
        }
        return `${fileSystemType}${id}`
    }

    /**
     * Abre (e cria/atualiza se necessário) o banco IndexedDB.
     * @returns {Promise<IDBDatabase>}
     */
    #abrirBanco() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(FileSystemWeb.#DB_NOME, FileSystemWeb.#DB_VERSAO)
            req.onupgradeneeded = () => {
                const db = req.result
                if (!db.objectStoreNames.contains(FileSystemWeb.#STORE_ARQUIVOS)) {
                    db.createObjectStore(FileSystemWeb.#STORE_ARQUIVOS)
                }
            }
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
    }

    async salvarArquivo(chave, blob) {
        const db = await this.#abrirBanco()
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(FileSystemWeb.#STORE_ARQUIVOS, 'readwrite')
                tx.objectStore(FileSystemWeb.#STORE_ARQUIVOS).put(blob, chave)
                tx.oncomplete = () => resolve()
                tx.onerror = () => reject(tx.error)
                tx.onabort = () => reject(tx.error)
            })
        } finally {
            db.close()
        }
    }

    async lerArquivo(chave) {
        const db = await this.#abrirBanco()
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(FileSystemWeb.#STORE_ARQUIVOS, 'readonly')
                const req = tx.objectStore(FileSystemWeb.#STORE_ARQUIVOS).get(chave)
                req.onsuccess = () => resolve(req.result ?? null)
                req.onerror = () => reject(req.error)
            })
        } finally {
            db.close()
        }
    }

    async removerArquivo(chave) {
        const db = await this.#abrirBanco()
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(FileSystemWeb.#STORE_ARQUIVOS, 'readwrite')
                tx.objectStore(FileSystemWeb.#STORE_ARQUIVOS).delete(chave)
                tx.oncomplete = () => resolve()
                tx.onerror = () => reject(tx.error)
                tx.onabort = () => reject(tx.error)
            })
        } finally {
            db.close()
        }
    }

    async salvar(id, dados, fileSystemType) {
        localStorage.setItem(this.#chave(id, fileSystemType), JSON.stringify(dados))
    }

    async ler(id, fileSystemType) {
        const bruto = localStorage.getItem(this.#chave(id, fileSystemType))
        if (bruto == null) return null
        try {
            return JSON.parse(bruto)
        } catch {
            return null
        }
    }

    async listar(fileSystemType) {
        const res = []
        for (let i = 0; i < localStorage.length; i++) {
            const chave = localStorage.key(i)
            if (!chave || !chave.startsWith(fileSystemType)) continue
            const id = chave.slice(fileSystemType.length)
            const dados = await this.ler(id, fileSystemType)
            if (dados) res.push({ id, titulo: dados.titulo ?? '', artista: dados.artista ?? '' })
        }
        return res
    }

    async remover(id, fileSystemType) {
        localStorage.removeItem(this.#chave(id, fileSystemType))
    }
}
