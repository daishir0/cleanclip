// Import an import-free TypeScript module from Node tests by transpiling it
// with the project's local `typescript` package. Only works for modules that
// have no import statements (pure logic files).
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

export async function importTs(path) {
  const src = await readFile(path, 'utf8');
  if (/^\s*import\s/m.test(src)) {
    throw new Error(`importTs only supports import-free modules: ${path}`);
  }
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const dataUrl = 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64');
  return import(dataUrl);
}
