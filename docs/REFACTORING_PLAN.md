# NEXUS — Plano de modernização estrutural

## Estado da revisão integrada — 2026-11-27

A revisão está sendo conduzida sobre a main atual; a release estável é `1.0.0.141`, que acrescenta a correção de lifecycle do Service Registry. Foundry VTT 14 build 360. O mapa atual, ownership dos subsistemas, contratos de comunicação, hotspots, ferramentas e plano por etapas estão em [ARCHITECTURE_MAP_2026-11-27.md](ARCHITECTURE_MAP_2026-11-27.md).

Esta é uma revisão estática remota. O teste funcional completo dentro do Foundry continua sendo um gate separado.

## Diretrizes invariáveis

- Interface/documentação em português; código e identificadores internos em inglês.
- GitHub `main` é a fonte oficial; verificar seu HEAD antes de cada conjunto de alterações.
- Refatorar por domínios e contratos, não reescrever toda a ficha ou CSS de uma vez.
- Não manter duas implementações completas em paralelo.
- Biblioteca é Explorador Universal; a ficha é consumidora/adaptadora, não dona do catálogo.
- Regras, propriedades, componentes, instâncias, grupos, aparência e mídia têm ownership separado.
- Preservar IDs, schemas, flags, dados persistidos e APIs públicas; qualquer alteração incompatível exige migração explícita.
- Preparação/renderização não realiza gravações persistentes.
- Cada controlador/serviço possui lifecycle e cleanup idempotentes.
- Preferir APIs públicas documentadas do Foundry V14.
- Manifesto estável só é sincronizado após pacote ZIP publicado e confirmado.

## Etapas de trabalho

| Etapa | Escopo | Estado |
|---|---|---|
| 0 | Baseline, mapa de arquitetura, inventário e riscos | Mapa inicial registrado; auditoria de consumidores/leitores/escritores continua |
| 1 | Bootstrap, service registry, contratos entre serviços e lifecycle | Em andamento; shutdown concorrente corrigido e testado; próximo: classificar inicialização eager/lazy no bootstrap e preservar APIs `game.nexus.*` |
| 2 | Propriedades, fórmulas, regras, aliases, schemas e migrações | A iniciar após contratos P0 |
| 3 | Componentes, instâncias, grupos e Canvas | A iniciar após baseline de dados |
| 4 | Fichas, renderização, listeners, persistência e ficha NPC | A iniciar por extrações pequenas |
| 5 | Biblioteca Universal: providers, Explorer, Inspector, Grid/List e transfer | A iniciar com ownership UI separado |
| 6 | Cards/documentos/compêndios e adaptadores Foundry | Revisar por tipo e UUID/API nativa |
| 7 | Design System, temas, mídia e armazenamento | Revisar tokens, preview isolado e adapters |
| 8 | CSS, templates, acessibilidade e layering | Consolidar cascata por domínio, sem reescrita global |
| 9 | Testes, Testing Bridge, instalação/atualização e release | Gate obrigatório antes de declarar estabilidade |

## Como cada etapa será executada

1. Confirmar o HEAD da main e as alterações recentes.
2. Mapear consumidores, produtores, leitores/escritores e lifecycle da área.
3. Definir contrato de entrada/saída e ownership antes de mover código.
4. Extrair funções puras primeiro; depois serviços/adapters; UI por último.
5. Manter uma fachada compatível enquanto consumidores migram.
5a. No bootstrap, não converter registros em lazy por regra geral: identificar serviços que instalam hooks, registram settings/classes ou são consumidos imediatamente; deferir somente factories sem side effects e provar com testes de ordem de init/ready.
6. Adicionar testes de comportamento e arquitetura, não apenas assertions textuais.
7. Rodar sintaxe, suite, validação de pacote e CI.
8. Para UI, persistência, permissões ou lifecycle, testar no Foundry V14 real.
9. Atualizar mapa, overview e changelog com o estado verdadeiro.

## Ferramentas

- GitHub Actions: `.github/workflows/validate.yml` e `release.yml`.
- Test runner: `tests/run-all.mjs`, que descobre testes `tests/*.mjs`.
- Grafo estático: `tests/module-graph-contract.test.mjs` verifica imports locais e ciclos.
- Foundry Testing Bridge/Playwright: `tools/foundry-testing/`; exige instalação local, mundo descartável, sessão GM e `FOUNDRY_TEST_WORLD_ID`.
- Documentação oficial V14: https://foundryvtt.com/api/v14/
- ApplicationV2: https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
- Hooks: https://foundryvtt.com/api/v14/modules/hookEvents.html

## Restrições de segurança da refatoração

- Não reescrever a classe da ficha ou a folha CSS global em um único passo.
- Não remover arquivos, campos, flags, IDs ou listeners sem mapear consumidores e migrar.
- Não alterar mecânicas dos livros durante uma refatoração de UI/arquitetura.
- Não transformar tema ou layout em dado de Actor.
- Não executar conteúdo importado como código confiável.
- Não declarar teste real no Foundry com base apenas no CI.
- Não publicar uma versão estável enquanto o pacote/manifesto não estiverem alinhados e confirmados.
