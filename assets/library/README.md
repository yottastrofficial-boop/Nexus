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

A Biblioteca oferece busca global, filtro dinâmico por etiquetas, visões universais de itens salvos/favoritos/recentes, pastas pessoais livres ou vinculadas a uma coleção, cartões padronizados em grade/lista e Inspector contextual. O Inspector permite editar metadados, duplicar e excluir itens salvos com proteção de dependências. A visão universal agrega dados sem alterar seu tipo semântico; inserção/aplicação de alguns tipos permanece nas áreas especializadas. A validação visual e funcional no Foundry VTT 14 build 360 continua necessária.