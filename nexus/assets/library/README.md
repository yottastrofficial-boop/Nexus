# Biblioteca de Componentes NEXUS

O catálogo visual está em `catalog.js` (`NEXUS_LIBRARY_CATALOG`). Ele organiza os elementos por pastas e fornece os dados iniciais de cada instância.

## Estrutura de uma entrada

- `key`: identificador estável e único da entrada;
- `type`: tipo técnico registrado em `COMPONENTS` no renderizador;
- `label`: nome exibido na Biblioteca;
- `category`: pasta declarada em `categories`;
- `preview`: estilo da prévia visual;
- `template` (opcional): configurações iniciais copiadas para a instância;
- `keywords`: termos usados pela busca.

O catálogo não implementa os componentes. A inserção depende do registro e do renderizador em `scripts/sheets/actor-sheet-v1.0.0.js`. Por isso, entradas sem tipo funcional registrado não devem ser adicionadas à Biblioteca.

## Pastas

- **Básicos:** token e indicador de recurso genérico;
- **Elementos:** texto, valor vinculado, campo editável, imagem, anotações, medidor, tabela e estruturas;
- **Pré-configurados:** elementos da ficha com configurações iniciais úteis;
- **Temas:** paletas visuais aplicáveis à ficha.

A Biblioteca oferece busca, filtro por categoria, prévia e configuração antes da inserção. Modelos pessoais ainda são armazenados por métodos internos, mas a interface de gerenciamento não está exposta nesta versão.