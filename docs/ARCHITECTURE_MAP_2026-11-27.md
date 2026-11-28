## Registro da etapa de bootstrap — 1.0.0.143

- `media.cache` passa a ser serviço lazy; o bootstrap não cria o objeto IndexedDB cache no init.
- `system.diagnostics` é serviço lazy e expõe `game.nexus.getDiagnostics()`.
- Diagnóstico lê apenas o estado do registry; não inicializa dependências, não lê dados de usuário e não altera documentos.
- Testes adicionados para estado, contagens e imutabilidade do snapshot.
- Release/manifesto serão confirmados após workflow; teste funcional no Foundry continua manual.

# NEXUS — Mapa arquitetural e plano integrado de revisão

**Data da revisão:** 2026-11-27  
**Repositório:** `yottastrofficial-boop/Nexus`  
**Branch de referência:** `main`  
**Commit-base:** `89e60f6ac0b202bee57cba84dea3416a99f42df5`  
**Versão em main:** `1.0.0.143` (release workflow em validação)  
**Alvo declarado:** Foundry VTT 14, build 360

> Esta é uma revisão estática do estado remoto da main e dos contratos/documentos do projeto. Não representa teste funcional dentro do Foundry. A release estável anterior é 1.0.0.142; o teste funcional dentro do Foundry VTT 14 build 360 permanece pendente.

## 1. Intenção central que orienta a revisão

NEXUS é uma plataforma modular de RPG e composição de fichas para Foundry VTT. Regras, propriedades, componentes, instâncias, grupos, layouts, aparência, mídia e ferramentas devem ter ownership separado e comunicação por contratos explícitos.

Princípios invariáveis:

- A aparência não altera dados nem regras.
- A ficha coordena a experiência de personagem; não é dona dos serviços universais.
- A Biblioteca descobre e organiza recursos; não deve conhecer a estrutura interna da ficha.
- O Canvas organiza e manipula instâncias e grupos; não define mecânicas.
- Componentes são definições reutilizáveis; instâncias são usos concretos; grupos são estruturas de composição.
- Dados persistidos, IDs, flags, schemas e APIs públicas devem permanecer compatíveis.
- Interface/documentação em pt-BR; identificadores e código em inglês.
- Migrações persistentes explícitas, idempotentes e fora de preparação/renderização.
- Código importado ou de terceiros deve permanecer inerte até passar por um contrato seguro.
- Preferir APIs públicas do Foundry V14; validar exceções contra a documentação oficial.

## 2. Mapa dos subsistemas atuais

### Bootstrap e infraestrutura

| Área | Arquivos centrais | Responsabilidade/contrato |
|---|---|---|
| Bootstrap | `scripts/nexus-v1.0.0.js` | Registra serviços, settings, documentos, fichas e API pública `game.nexus`. |
| Service registry | `scripts/core/service-registry.js` | Fábricas, dependências, resolução sync/async, diagnóstico e shutdown concorrente; espera por factories e cleanup assíncrono inverso. |
| Lifecycle | `scripts/core/resource-lifecycle.js`, `listener-scope.js`, `actor-document-lifecycle.js` | Ownership e encerramento de recursos/listeners; defaults Actor e hooks de token agora isolados com dependências injetadas. |
| Document bridge | `scripts/core/foundry-document-bridge.js` | Índice leve e resolução sob demanda de documentos Foundry. |
| Migrations | `scripts/core/migration-manager.js` | Compatibilidade e migração de dados persistidos. |

### Dados, propriedades e lógica

| Área | Arquivos centrais | Responsabilidade/contrato |
|---|---|---|
| Propriedades | `property-schema.js`, `property-catalog.js`, `actor-property-writes.js` | Identidade, validação, catálogo e escrita de propriedades. |
| Fórmulas/regras | `formula-engine.js`, `property-formulas.js`, `skills.js` | Cálculo e regras sem depender da apresentação. |
| Interações | `interactions.js`, `logic-events.js`, `logic-schemas.js`, `logic-runtime.js` | Trigger/condition/action, validação inerte e execução controlada. |
| Registro de lógica | `logic-registry.js`, `foundry-logic-integration.js`, `logic-library.js` | Descoberta, integração Foundry e armazenamento de fluxos. |

### Componentes, grupos e Canvas

| Área | Arquivos centrais | Responsabilidade/contrato |
|---|---|---|
| Componentes | `component-types.js`, `library-models.js` | Tipos, definições, instâncias e dimensões normalizadas. |
| Grupos | `group-hierarchy.js`, `group-composition.js` | Hierarquia, ownership, validação e modos de layout. |
| Canvas | `canvas-geometry.js`, `canvas-interactions.js`, `canvas-viewport.js`, `canvas-group-rendering.js` | Geometria, gestos, seleção, viewport e renderização de grupos. |
| Ficha | `scripts/sheets/actor-sheet-*.js` | Coordenação da ficha e ligação de serviços ao Actor/Canvas. |

### Fichas e janelas

A classe principal atual é `scripts/sheets/actor-sheet-v1.0.0.js`; existem controladores e renderizadores especializados, incluindo listeners, renderização, media, viewport, interação de play, propriedades, aliases, recursos, skills e grupos.

A refatoração deve manter a classe como fachada/coordenadora até que os serviços extraídos estejam testados. A ficha de NPC especializada é uma evolução separada: compartilhar infraestrutura, não duplicar a ficha completa nem descartar dados.

### Biblioteca Universal

| Área | Arquivos centrais | Responsabilidade/contrato |
|---|---|---|
| Registry/providers | `library-resource-registry.js` | Metadados, busca, filtros, paginação, resolução e ações por provider. |
| Store/preferences | `library-store.js`, `library-preferences.js` | Definições pessoais, pastas, favoritos, recentes e coleções. |
| Transfer | `library-transfer-registry.js`, `library-backup-service.js` | Adaptadores, validação, preview, conflitos e confirmação. |
| Application | `library-application.js` | Lifecycle ApplicationV2, navegação e janela. |
| Explorer/Inspector | `catalog-explorer.js`, `logic-editors.js` | Catálogo, cartões/lista, seleção, Inspector e editores. |
| Sheet adapter | `scripts/sheets/library-view.js` | Integração contextual com a ficha; não é fonte de verdade do catálogo. |

### Design System e mídia

| Área | Arquivos centrais | Responsabilidade/contrato |
|---|---|---|
| Tokens/temas | `theme.js`, `design-profile.js`, `design-system.js` | Tokens semânticos, perfil validado, precedência e aplicação. |
| Design Studio | `apps/design-studio.js`, `design-library.js` | Editor ApplicationV2, preview local e persistência de perfis. |
| Media | `media-format-registry.js`, `media-service.js`, `media-storage.js` | Capacidades, pipeline, adapters, cache e armazenamento. |
| CSS | `styles/nexus-v1.0.0.css`, `nexus-universal-library.css`, `nexus-design-system.css` | Cascata da ficha/Foundry, Biblioteca e Design System. |

### Cards, compêndios e documentos Foundry

O NEXUS utiliza documentos nativos do Foundry (Actor, Item, Cards, RollTable, JournalEntry, Scene, compêndios etc.) por APIs e UUIDs. A Biblioteca deve operar via providers e bridge, sem reimplementar o armazenamento dos documentos. A revisão de cada tipo precisa identificar se o recurso é um documento nativo, uma definição NEXUS, uma instância ou apenas um asset de apresentação.

## 3. Comunicação entre subsistemas — contratos desejados

1. **Bootstrap → Service Registry → serviços:** dependências declaradas; inicialização por domínio; APIs de fachada mantidas durante migração.
2. **Property/Logic → Component/Sheet:** schemas e operações de domínio; sem dependência de DOM.
3. **Component Definition → Instance → Renderer:** definição versionada, dados da instância e renderizador especializado; não misturar com Actor data.
4. **Canvas → Sheet coordinator:** eventos/operações tipadas; Canvas não escreve diretamente em dados mecânicos.
5. **Library Registry → Providers → Explorer/Inspector:** metadados leves, resolução completa sob demanda e ações anunciadas pelo provider.
6. **Library → Sheet/Canvas:** adaptadores explícitos de origem/destino, payload validado, preview e confirmação; sem dependência circular.
7. **Design Profile → tokens/CSS:** tema efetivo por escopo; preview isolado e sem persistência até salvar.
8. **Media Registry → pipeline → storage adapters:** identificação/decodificação separada do backend de armazenamento.
9. **Foundry documents → Document Bridge:** UUID e API nativa; não manter cópia de dados completos sem necessidade.
10. **Lifecycle → UI/controllers:** cada janela/controlador é dono de seus listeners, observers, timers e abort signals; dispose idempotente.

## 4. Riscos e hotspots confirmados na main-base

Tamanho é um indicador de concentração, não prova isolada de defeito.

| Arquivo | Tamanho aproximado | Revisão necessária |
|---|---:|---|
| `styles/nexus-v1.0.0.css` | 594 KB | Cascata histórica, seletores repetidos, overrides e fronteira entre Foundry e NEXUS. |
| `scripts/sheets/actor-sheet-v1.0.0.js` | 259 KB | Coordenador muito grande; identificar métodos residuais e extrair lógica pura/serviços. |
| `scripts/sheets/actor-sheet-listeners.js` | 81 KB | Ownership de eventos, cleanup e dependências entre controladores. |
| `scripts/library/catalog-explorer.js` | 90 KB | Explorer concentra apresentação e interação; separar modelos de view/renderers. |
| `scripts/library/library-application.js` | 84 KB | Lifecycle, navegação e composição da janela. |
| `styles/nexus-universal-library.css` | 131 KB | Cascata específica da Biblioteca e regras duplicadas. |
| `styles/nexus-design-system.css` | 84 KB | Precedência de tokens, preview isolado e overrides. |
| `scripts/core/library-resource-registry.js` | 40 KB | Verificar limites do registry/provider e manter UI fora do core. |
| `scripts/core/interactions.js` | 48 KB | Separar contratos, avaliação e adapters sem duplicar runtime. |

O grafo atual tem teste que verifica imports locais resolvidos e ausência de ciclos estáticos. Ele ainda não equivale a uma verificação completa de direção arquitetural, ownership de dados ou dependências de runtime.

## 5. Plano de execução por etapas

### Etapa 0 — Baseline e mapa (em execução)
- Registrar commit/version e arquivos fonte.
- Reconciliar documentos históricos e separar estado atual de histórico.
- Inventariar imports, APIs públicas, stores, flags, schemas e consumidores.
- Rodar CI e registrar os limites do teste estático.

### Etapa 1 — Contratos e comunicação (P0; iniciada)
- Revisar service registry e bootstrap por subsistema.
- Definir API pública, ownership, lifecycle e eventos de cada serviço.
- Extração inicial concluída: `actor-document-lifecycle.js` concentra defaults de Actor e sincronização de textura de token; o bootstrap instala o adapter e o disposer remove hooks de forma idempotente.
- Testes cobrem defaults, preservação de textura personalizada, mudança de retrato e cleanup; contratos de pacote atualizados.
- Próximo: auditar e migrar bootstrap por subsistema e adicionar regras de direção de dependências após inventariar todos os imports.

### Etapa 2 — Propriedades e Lógica
- Auditar leitores/escritores, fórmulas, aliases, schemas e migrações.
- Separar funções puras de Foundry adapters e UI.
- Garantir zero válido, negativos preservados e migrations idempotentes.
- Testar alterações imediatas e persistência.

### Etapa 3 — Componentes, grupos e Canvas
- Consolidar definição/instância/grupo/layout.
- Revisar geometria, seleção, drag/resize, grupos e renderização.
- Preservar IDs e dados existentes; evitar reconstrução completa por gesto.
- Adicionar testes de comportamento e performance.

### Etapa 4 — Fichas
- Mapear métodos e listeners da ficha por domínio.
- Extrair rendering/context builders e operações puras primeiro.
- Uniformizar lifecycle e cleanup.
- Especializar NPC usando a base comum e mantendo campos antigos.
- Testar múltiplas fichas/janelas e persistência.

### Etapa 5 — Biblioteca Universal
- Revisar provider → registry → Explorer → Inspector → adapters.
- Separar estado da UI, renderizadores por tipo e ações.
- Corrigir Grid/List, previews responsivos, filtros e favoritos em uma camada de estilos autoritativa.
- Preservar import/export com validação, preview, conflitos e confirmação.
- Garantir que não haja dependência da ficha dentro do catálogo.

### Etapa 6 — Cards, documentos e compêndios
- Inventariar cada tipo nativo e seu provider/adaptador.
- Respeitar UUID e APIs Foundry.
- Verificar permissões, índice leve, resolução on-demand e ações contextuais.
- Não duplicar documento nativo no armazenamento NEXUS.

### Etapa 7 — Design System e mídia
- Consolidar tokens semânticos e precedência system/world/user.
- Isolar previews sem alterar o tema ativo.
- Separar media format, capability, pipeline, cache e storage.
- Auditar CSS e templates por domínio, preservando ordem da cascata.

### Etapa 8 — CSS, templates e acessibilidade
- Inventariar seletores duplicados, tokens, IDs, data attributes e estados.
- Migrar um domínio por vez mantendo a cascata efetiva.
- Extrair partials por região funcional após contratos de DOM estáveis.
- Testar responsividade, foco, teclado, contraste e layering.

### Etapa 9 — Testes, pacote e release
- CI estático/unitário; Testing Bridge/Playwright em Foundry real; validação visual manual.
- Instalação limpa e atualização sobre a versão anterior em mundo descartável.
- Verificar preservação de Actors/layouts e funcionamento dos principais fluxos.
- Publicar release/ZIP; somente então sincronizar manifest estável.

## 6. Ferramentas de validação disponíveis

- **GitHub Actions:** workflows `.github/workflows/validate.yml` e `release.yml`; suíte única `tests/run-all.mjs`.
- **Node test runner:** testes `tests/*.test.mjs` e contratos puros.
- **Module graph contract:** resolve imports locais e detecta ciclos estáticos.
- **Foundry Testing Bridge + Playwright:** `tools/foundry-testing/`; exige Foundry V14 local, mundo descartável, sessão GM e `FOUNDRY_TEST_WORLD_ID`.
- **Foundry V14 API docs:** https://foundryvtt.com/api/v14/
- **ApplicationV2:** https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
- **Hooks:** https://foundryvtt.com/api/v14/modules/hookEvents.html
- **System development/manifest:** https://foundryvtt.com/article/system-development/
- **Release API:** https://foundryvtt.com/article/package-release-api/

## 7. Registro das implementações 1.0.0.140–1.0.0.142

- Main e manifesto estável: 1.0.0.142 publicada.
- CI, pacote ZIP, release e asset foram confirmados pelo workflow 46099909950.
- 1.0.0.140 extraiu o lifecycle de Actor para adapter com dependências injetadas.
- 1.0.0.141 corrigiu shutdown concorrente do Service Registry, espera por factories em andamento e cleanup assíncrono em ordem inversa.
- 1.0.0.142 adicionou `defineAccessor()` e deferiu serviços puros de recursos, Biblioteca, mídia e lógica, preservando propriedades object-shaped em `game.nexus.*`. Design System, registry da Biblioteca e classes de janela continuam eager por exigirem disponibilidade durante `init`.
- Testes cobrem shutdown concorrente, factories em andamento, cleanup assíncrono, resolução sob demanda e contrato de classificação eager/lazy.
- Próxima subetapa: auditar outros efeitos de init e a abertura/fechamento de janelas; depois avançar para ownership de dados de Propriedades/Regras.
- Essas implementações são passos de lifecycle/arquitetura, não uma refatoração concluída de toda a ficha.

## 8. Gates e definição de concluído

Uma etapa só está concluída quando:
1. O contrato e ownership estão documentados.
2. Consumidores e escritores foram identificados.
3. A mudança não altera dados ou IDs sem migração.
4. Testes de regressão cobrem o comportamento relevante.
5. Imports, sintaxe, suite e package validation passam.
6. CI confirma o commit.
7. Fluxos UI/persistência/lifecycle são testados no Foundry real, ou permanecem explicitamente marcados como pendentes.

Não executar uma reescrita global, não remover código por ser legado sem identificar consumidores e não declarar uma arquitetura concluída apenas porque seus serviços foram registrados.
