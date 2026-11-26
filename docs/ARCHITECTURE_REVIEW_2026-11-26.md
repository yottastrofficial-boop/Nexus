# Revisão arquitetural de ponta a ponta — 2026-11-26

## Base e escopo

- Repositório: `yottastrofficial-boop/Nexus`
- Base auditada: `main`, commit `5ca0fe6623959b6f399f55452dfae2592fed311e`
- Versão base: `1.0.0.123`
- Alvo declarado: Foundry VTT 14, build 360.
- Inventário: 165 arquivos; 67 scripts, 49 arquivos de teste, 25 documentos, 4 templates, 3 folhas CSS e 2 arquivos em assets.
- A revisão foi estática, baseada na árvore, módulos, contratos, imports, inicialização, testes e documentação do repositório. Não foi executada dentro de uma instância real do Foundry.

## Resultado executivo

O NEXUS já tem uma arquitetura modular significativa: registries, stores, schemas, bridges, adapters, serviços de ciclo de vida e controladores separados. O problema principal não é ausência total de módulos; é que algumas áreas ainda concentram responsabilidades e o bootstrap mantém referências diretas entre subsistemas. Reescrever tudo de uma vez aumentaria o risco de quebrar dados persistidos e a integração com o Foundry.

A direção escolhida é **modularização por contratos e dependências explícitas**, preservando IDs, schemas e APIs existentes. A primeira etapa implementada nesta branch estabelece um registro de serviços compartilhados e reduz uma dependência cruzada real no domínio de Lógica. As próximas etapas devem migrar os consumidores gradualmente, não criar uma segunda implementação paralela.

## Hotspots confirmados por tamanho

| Arquivo | Bytes aproximados | Responsabilidade/risco |
|---|---:|---|
| `styles/nexus-v1.0.0.css` | 601.038 | Cascata histórica, muitas regras e sobrescritas; maior risco de regressão visual |
| `scripts/sheets/actor-sheet-v1.0.0.js` | 259.565 | Fachada da ficha ainda concentra resolução de propriedades, contexto, renderização e operações |
| `tests/validate-package.mjs` | 208.888 | Contratos de pacote e verificações estruturais acumulados |
| `scripts/sheets/actor-sheet-listeners.js` | 81.415 | Controlador de eventos central; exige mapa de ownership e cleanup |
| `templates/actors/actor-sheet.hbs` | 65.445 | Template principal extenso |
| `scripts/library/catalog-explorer.js` | 55.814 | Catálogo, cards, seleção e Inspector em um módulo grande |
| `scripts/library/logic-editors.js` | 53.849 | Editores especializados de Lógica |
| `scripts/library/library-application.js` | 51.014 | Aplicação da Biblioteca e ciclo de vida da janela |
| `scripts/core/interactions.js` | 49.101 | Normalização/runtime e partes de edição de interações |
| `scripts/sheets/canvas-interactions.js` | 46.914 | Seleção, gestos e operações do Canvas |

Tamanho não é, por si só, defeito. A extração deve ocorrer quando houver uma fronteira funcional clara, dependências menores e teste de contrato.

## Fluxos e fronteiras revisados

### Inicialização e serviços

`scripts/nexus-v1.0.0.js` inicializa diretamente Design System, Biblioteca, Mídia, Lógica e registro de ficha dentro do hook `init`. A API pública `game.nexus` é útil, mas alguns consumidores ainda dependem de objetos concretos diretamente.

**Implementado nesta revisão:** `scripts/core/service-registry.js` adiciona `game.nexus.services`, com registro de fábricas, dependências, resolução sob demanda, deduplicação de inicialização, detecção de ciclos, publicação de serviços existentes, diagnóstico de estado e encerramento reverso. Os serviços centrais existentes foram publicados nesse catálogo, mantendo compatibilidade com `game.nexus.*`.

**Limite desta etapa:** os serviços ainda são inicializados pelo bootstrap antigo e publicados no registro. O próximo ciclo deve migrar subsistemas para fábricas e dependências do container, uma área por vez; não se declara que a injeção de dependências foi concluída em todo o sistema.

### Lógica e eventos

`logic-schemas.js` dependia de constantes exportadas por `interactions.js` e pelo adaptador `foundry-logic-integration.js`. Isso fazia um schema de validação depender de módulos de runtime/UI e integração de hooks.

**Implementado:** contratos de eventos foram movidos para `scripts/core/logic-events.js`. Os módulos antigos reexportam os mesmos identificadores, preservando compatibilidade, enquanto schemas, engine de interação e adaptador Foundry consomem o contrato compartilhado.

### Imports e dependências

Foi adicionado `tests/module-graph-contract.test.mjs`, que verifica todos os imports relativos em `scripts/` e `assets/` e falha se houver caminho não resolvido ou ciclo de import estático. No primeiro CI desta etapa, os 70 scripts/assets foram validados por sintaxe e o grafo estático passou sem ciclos ou imports locais quebrados.

### Biblioteca

A arquitetura documentada de Registry → Provider → Explorer → Inspector → Transfer Adapter está bem separada em vários arquivos. A principal continuação não é reescrever a Biblioteca, mas reduzir a concentração do Explorer e manter provedores/ações/transferências sem conhecimento direto da ficha ou de schemas mecânicos. Os documentos Foundry devem continuar sendo manipulados por UUID e APIs nativas.

### Dados, migrações e regras

A base já separa migração, merge de layouts, aliases, schema de propriedades e armazenamento da Biblioteca. Essa separação deve ser preservada. Nenhuma refatoração pode converter aparência em regra, recalcular dados mecânicos automaticamente ou descartar campos desconhecidos. Preparação de contexto/renderização deve continuar sem gravações persistentes.

### Ciclo de vida e eventos

Há escopos de listeners e controladores especializados, mas a classe/listener principal continua grande. Próxima extração: inventário por domínio de listeners, observers, timers, promessas pendentes e cleanup. Cada controlador deve ter um proprietário e um único método de encerramento; não adicionar uma segunda camada de listeners sobre a existente.

### CSS e templates

A folha principal continua sendo um arquivo legado grande, acompanhada por CSS da Biblioteca e Design System. A consolidação deve ser gradual: inventariar seletores, precedência e estados; capturar comparações no Foundry; mover um domínio mantendo a ordem da cascata; remover duplicatas somente após prova de equivalência. Templates devem ser divididos em partials por regiões funcionais sem mudar IDs, data attributes ou handlers.

### Testes

`tests/run-all.mjs` já descobre os testes automaticamente, o que é uma boa base. `validate-package.mjs` continua concentrando contratos estáticos e deve ser dividido em validadores por domínio, mantendo a entrada única de CI e a cobertura. Não substituir testes de comportamento por assertions textuais mais frágeis.

## Sequência de modernização

| Fase | Escopo | Estado |
|---|---|---|
| 0 | Inventário, baseline e contratos de imports | Concluída nesta revisão |
| 1 | Registro de serviços e contratos de eventos compartilhados | Implementada nesta branch |
| 2 | Modularizar bootstrap por subsistema e migrar factories para DI | Próxima |
| 3 | Extrair resolução de propriedades e schema para serviço puro | Planejada |
| 4 | Extrair listeners da ficha por domínio e lifecycle uniforme | Planejada |
| 5 | Separar catálogo/Inspector/editores da Biblioteca por contratos | Planejada |
| 6 | CSS por domínio com auditoria de cascata e estados visuais | Planejada |
| 7 | Templates em partials, mantendo seletores públicos | Planejada |
| 8 | Dividir o validador de pacote por domínio e manter CI única | Planejada |
| 9 | Testes de instalação/atualização e aceite no Foundry V14 | Pendente de sessão real |

## Critérios para cada extração

1. Identificar consumidores e todos os leitores/escritores dos dados afetados.
2. Definir contrato de entrada/saída e ownership.
3. Extrair primeiro lógica pura; depois efeitos e UI.
4. Manter adaptador/fachada compatível com os contratos existentes.
5. Adicionar teste de regressão e atualizar documentação.
6. Rodar sintaxe, suíte, validação do pacote e CI.
7. Para interface, persistência, permissões ou lifecycle, manter a validação real no Foundry como gate.

## Não fazer

- Não substituir a ficha inteira em um único commit.
- Não remover o código legado apenas por nome/versão; verificar consumidores e migração.
- Não renomear IDs persistidos, flags, tipos de documento ou data attributes públicos sem migração.
- Não reescrever a cascata CSS de uma vez.
- Não declarar toda a arquitetura “concluída” porque existe um container de serviços.
- Não declarar validação real no Foundry com base apenas no CI.
