import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const styles = readFileSync(new URL("../styles/nexus-universal-library.css", import.meta.url), "utf8");
const libraryTemplate = readFileSync(new URL("../templates/library/library.hbs", import.meta.url), "utf8");

assert.ok(manifest.styles.includes("styles/nexus-universal-library.css"),
  "A camada complementar deve ser carregada depois do stylesheet legado.");
assert.match(styles, /\.nexus-library-application \.nexus-library-workspace[\s\S]*?grid-template-columns: minmax\(0, 1fr\) var\(--nexus-library-inspector-width\)/,
  "A Biblioteca independente deve manter o Inspector lateral em desktop.");
assert.match(styles, /\.nexus-library-application \.nexus-library-details[\s\S]*?overflow: auto/,
  "O Inspector deve ter rolagem independente e não ser recortado.");
assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.nexus-library-details/,
  "Em telas estreitas, o Inspector deve continuar acessível em painel responsivo.");
assert.match(styles, /#sidebar \.tab\.sidebar-tab\.nexus-themed-application\.active/,
  "Abas especializadas do Foundry devem receber estado ativo explícito.");
assert.match(styles, /#ui-left, #ui-top\) \.ui-control/,
  "Controles nativos de UI devem compartilhar a superfície visual flutuante do NEXUS.");
assert.match(libraryTemplate, /<option value="tables">RollTables<\/option>/,
  "O filtro de RollTables deve usar a chave declarada pelo Foundry Document Bridge.");
assert.doesNotMatch(libraryTemplate, /<option value="rolltables">RollTables<\/option>/,
  "A chave legada rolltables não deve impedir a filtragem do tipo tables.");\nassert.match(styles, /:focus-visible/,
  "Os controles devem preservar foco visível para navegação por teclado.");

console.log("NEXUS universal library UI contract: OK");
