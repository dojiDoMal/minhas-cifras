import { FileSystemMobile, FileSystemWeb } from './FileSystem'
import { isNativeApp } from './platform'

let instancia = null

/**
 * Retorna a implementação de FileSystem adequada à plataforma atual,
 * criando-a uma única vez (singleton).
 * @returns {import('./FileSystem').FileSystem}
 */
export const getFileSystem = () => {
    if (instancia) return instancia

    instancia = isNativeApp ? new FileSystemMobile() : new FileSystemWeb()

    return instancia
}
