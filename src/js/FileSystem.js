import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

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
    async salvarCifra() {
        throw new Error('salvarCifra() não implementado')
    }

    /**
     * Lê uma cifra pelo id.
     * @param {string} id
     * @returns {Promise<Cifra | null>} a cifra, ou null se não existir
     */
    async lerCifra() {
        throw new Error('lerCifra() não implementado')
    }

    /**
     * Lista as cifras salvas (apenas metadados).
     * @returns {Promise<ResumoCifra[]>}
     */
    async listarCifras() {
        throw new Error('listarCifras() não implementado')
    }

    /**
     * Remove uma cifra pelo id.
     * @param {string} id
     * @returns {Promise<void>}
     */
    async removerCifra() {
        throw new Error('removerCifra() não implementado')
    }
}

// Pasta (dentro do diretório de dados do app) onde as cifras ficam.
const PASTA_CIFRAS = 'cifras'

const nomeArquivo = (id) => `${PASTA_CIFRAS}/${id}.json`

/**
 * Implementação nativa (Android/iOS via Capacitor).
 * Cada cifra é um arquivo JSON real dentro de Directory.Data/cifras.
 */
export class FileSystemMobile extends FileSystem {
    #diretorio = Directory.Data

    async #garantirPasta() {
        try {
            await Filesystem.mkdir({
                path: PASTA_CIFRAS,
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

    async salvarCifra(id, cifra) {
        await this.#garantirPasta()
        await Filesystem.writeFile({
            path: nomeArquivo(id),
            data: JSON.stringify(cifra),
            directory: this.#diretorio,
            encoding: Encoding.UTF8,
            recursive: true,
        })
    }

    async lerCifra(id) {
        try {
            const { data } = await Filesystem.readFile({
                path: nomeArquivo(id),
                directory: this.#diretorio,
                encoding: Encoding.UTF8,
            })
            return JSON.parse(data)
        } catch {
            // Arquivo inexistente ou JSON inválido.
            return null
        }
    }

    async listarCifras() {
        await this.#garantirPasta()

        let arquivos = []
        try {
            const { files } = await Filesystem.readdir({
                path: PASTA_CIFRAS,
                directory: this.#diretorio,
            })
            arquivos = files
        } catch {
            return []
        }

        const cifras = await Promise.all(
            arquivos
                .map((f) => (typeof f === 'string' ? f : f.name))
                .filter((nome) => nome.endsWith('.json'))
                .map(async (nome) => {
                    const id = nome.replace(/\.json$/, '')
                    const cifra = await this.lerCifra(id)
                    if (!cifra) return null
                    return { id, titulo: cifra.titulo ?? '', artista: cifra.artista ?? '' }
                }),
        )

        return cifras.filter(Boolean)
    }

    async removerCifra(id) {
        try {
            await Filesystem.deleteFile({
                path: nomeArquivo(id),
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
    #prefixo = 'cifra:'

    #chave(id) {
        return `${this.#prefixo}${id}`
    }

    async salvarCifra(id, cifra) {
        localStorage.setItem(this.#chave(id), JSON.stringify(cifra))
    }

    async lerCifra(id) {
        const bruto = localStorage.getItem(this.#chave(id))
        if (bruto == null) return null
        try {
            return JSON.parse(bruto)
        } catch {
            return null
        }
    }

    async listarCifras() {
        const cifras = []
        for (let i = 0; i < localStorage.length; i++) {
            const chave = localStorage.key(i)
            if (!chave || !chave.startsWith(this.#prefixo)) continue
            const id = chave.slice(this.#prefixo.length)
            const cifra = await this.lerCifra(id)
            if (cifra) cifras.push({ id, titulo: cifra.titulo ?? '', artista: cifra.artista ?? '' })
        }
        return cifras
    }

    async removerCifra(id) {
        localStorage.removeItem(this.#chave(id))
    }
}
