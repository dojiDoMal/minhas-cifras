// Dispara o gradlew assembleRelease injetando as credenciais de assinatura.
// As senhas vem do ambiente (carregadas via `node --env-file=.env`), entao
// nada sensivel fica no package.json nem na linha de comando versionada.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const { KEYSTORE_PASSWORD, KEY_PASSWORD } = process.env;

if (!KEYSTORE_PASSWORD || !KEY_PASSWORD) {
  console.error('[gradle-release] ERRO: defina KEYSTORE_PASSWORD e KEY_PASSWORD no arquivo .env');
  process.exit(1);
}

if (!existsSync('minhas-cifras.jks')) {
  console.error('[gradle-release] ERRO: minhas-cifras.jks nao encontrado na raiz do projeto.');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const gradlew = isWindows ? 'gradlew.bat' : './gradlew';

// A propriedade store.file e resolvida relativa ao modulo app/, o que torna
// caminhos relativos frageis. Usamos o caminho absoluto do keystore na raiz.
const keystorePath = resolve(process.cwd(), 'minhas-cifras.jks');

const args = [
  'assembleRelease',
  `-Pandroid.injected.signing.store.file=${keystorePath}`,
  `-Pandroid.injected.signing.store.password=${KEYSTORE_PASSWORD}`,
  '-Pandroid.injected.signing.key.alias=minhas-cifras',
  `-Pandroid.injected.signing.key.password=${KEY_PASSWORD}`,
];

// No Windows, spawnSync precisa de shell:true para executar arquivos .bat.
const result = spawnSync(gradlew, args, {
  cwd: 'android',
  stdio: 'inherit',
  shell: isWindows,
});

if (result.error) {
  console.error('[gradle-release] Falha ao iniciar o gradlew:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
