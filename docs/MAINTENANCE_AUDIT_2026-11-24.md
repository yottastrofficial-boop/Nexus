# Auditoria de manutenção e consolidação — 2026-11-24

## Referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch oficial: `main`
- Commit de referência da auditoria: `2573c82845473f389fa150044c55458d4dec54d1`
- Primeiro commit de consolidação: `91c54660e4a5c210e65ed988dbdbec91aff3b5af`
- Commit de alinhamento de versão: `e6409eb8c6b872c675773a8771e62c305614726a`
- Commit de validação final: `356d237504b0303ccce235b86c8a4bcc01bebdc3`
- Release publicada: `v1.0.0.96`; asset `nexus.zip` confirmado, 461.715 bytes.
- Versão de desenvolvimento declarada na main: `1.0.0.97`.
- Manifesto estável: `1.0.0.96`.
- Compatibilidade declarada: Foundry VTT 14, build 360.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.

A release 1.0.0.96 passou pela validação automatizada e foi publicada. A main foi avançada para a base de desenvolvimento 1.0.0.97, mantendo o manifesto e o download estável em 1.0.0.96. Isso não comprova a validação visual e funcional dentro do cliente Foundry VTT 14. A próxima candidata não deve ser declarada estável antes dessa rodada manual.

## Inventário do repositório

A árvore inspecionada antes da consolidação continha 136 arquivos. A consolidação anterior acrescentou um teste e um documento de auditoria; esta etapa recupera o Testing Bridge local da PR #4, acrescentando seis arquivos de ferramenta, um teste de contrato e a documentação de execução. Total após esta etapa: 146 arquivos.

| Área | Arquivos após esta manutenção |
|---|---:|
| Scripts | 63 |
| Testes | 36 |
| Documentação | 24 |
| Templates | 4 |
| Estilos | 3 |
| Assets | 2 |
| Idiomas | 1 |
| Configuração GitHub | 2 |
| Ferramentas locais | 6 |

### Arquivos que merecem refatoração por domínio

| Arquivo | Tamanho aproximado | Observação |
|---|---:|---|
| `styles/nexus-v1.0.0.css` | 560 KiB | Principal ponto de consolidação da cascata e dos estilos históricos |
| `scripts/sheets/actor-sheet-v1.0.0.js` | 251 KiB | Classe principal ainda concentra responsabilidades |
| `tests/validate-package.mjs` | 210 KiB | Contratos e validações acumulados em um único arquivo |
| `scripts/sheets/actor-sheet-listeners.js` | 146 KiB | Muitos fluxos de eventos em um só módulo |
| `templates/actors/actor-sheet.hbs` | 79 KiB | Template principal extenso |
| `scripts/sheets/library-view.js` | 64 KiB | Adaptador da Biblioteca na ficha |
| `scripts/library/logic-editors.js` | 53 KiB | Editores especializados da área Lógica |
| `scripts/library/catalog-explorer.js` | 49 KiB | Modelo e apresentação do Explorer |
| `scripts/core/interactions.js` | 48 KiB | Runtime e operações de interação |
| `scripts/sheets/canvas-interactions.js` | 47 KiB | Gestos, seleção e operações do Canvas |

O tamanho, isoladamente, não prova duplicação. A extração deve seguir contratos, dependências e testes; não se deve dividir arquivos apenas para reduzir linhas.

## Histórico, PRs e branches

### Commits

- Foram percorridos 1.142 commits da branch principal, de 09/11/2026 a 24/11/2026.
- 106 mensagens usam `[release]` como prefixo; 158 mensagens contêm o marcador de release em algum ponto.
- Há mensagens idênticas repetidas em diferentes commits — por exemplo, ciclos de publicação das versões .56 e .57. Isso indica churn de metadados e automação, mas não prova que os commits sejam vazios ou equivalentes.
- O histórico não foi reescrito, compactado ou apagado. Commits, tags e releases publicados foram preservados.


### Pull requests

Foram encontrados 80 PRs no repositório. Na abertura desta auditoria havia quatro PRs abertas. Após a revisão, as quatro foram encerradas e não restam PRs abertas:

- `#8`: editor de interações antigo — encerrada como superada pela implementação atual.
- `#32`: auditoria de estabilidade antiga — encerrada após confirmar que os contratos relevantes foram incorporados em etapas posteriores.
- `#62`: documentação baseada na versão 1.0.0.91 — encerrada como desatualizada.
- `#63`: shell antigo da Biblioteca — encerrada como superada após recuperar as melhorias úteis e aprovar o CI.

Estado final: 80 PRs revisadas, 61 merged, 19 fechadas sem merge e nenhuma aberta. Não havia issues abertas na consulta final.

As PRs recentes `#73`, `#74`, `#77`, `#78`, `#79` e `#80` estão integradas. As propostas duplicadas `#75` e `#76` foram encerradas; a linha final do controle de release foi integrada pela `#77`. Entre as 19 PRs fechadas sem merge, os recursos aproveitáveis encontrados foram recuperados quando ainda eram únicos: o Testing Bridge da `#4` é incorporado nesta etapa; as demais propostas relevantes já estão representadas na main ou foram superadas.

A PR `#63` não foi mesclada integralmente: a branch estava muito atrás da main. Foram recuperados para a arquitetura atual a inserção segura de imagens da coleção de mídia, a aplicação de presets de tema e a proteção contra atualização concorrente de definições. A PR foi encerrada após a adaptação e a aprovação do CI no commit `356d237`.

A PR `#4` também foi encerrada sem merge e sua branch não existe mais. Seu harness Playwright foi recuperado e modernizado em `tools/foundry-testing/`. Ele exige o ID explícito de um mundo descartável, guarda a sessão apenas em `.auth/` ignorado pelo Git e cria/exclui somente o Actor temporário que ele próprio cria.

### Branches

- Total encontrado: 82.
- Branches com nomenclatura de versão: 40.
- Branches sem commits exclusivos em relação à main: 9.
- Branches divergentes ou com commits exclusivos em relação à main: 72.
- A contagem de commits exclusivos não equivale à quantidade de funcionalidades ausentes: merges por squash preservam a PR, mas não necessariamente a ancestralidade dos commits originais.

As nove branches sem commits exclusivos são candidatas à exclusão após confirmar que não são cabeças de PR aberta:

- `feature/foundry-chrome-design-system-2026-11-23`
- `feature/intelligent-composite-cards`
- `feature/theme-inspector-context-2026-11-24`
- `feature/1.0.0.5-editor-interactions`
- `fix/unified-properties-inspector-v1.0.0.61`
- `maintenance/v1.0.1-audit`
- `performance/phase-1`
- `performance/phase-2-canvas-runtime`
- `release/1.0.0.1`

As branches associadas a PRs já integradas também são candidatas à exclusão, depois de conferir se não servem de base a outra proposta aberta. Nenhuma branch foi apagada ou reescrita nesta etapa: a integração disponível permite inspecionar e atualizar refs, mas não expõe uma operação segura de exclusão de branch.

## Changelog e documentação

A primeira execução do CI após a consolidação detectou a necessidade de avançar a versão de desenvolvimento para `1.0.0.97` e de preservar os contratos do fluxo de release. A correção mantém os testes ativos; não houve desativação de verificações. A rodada final no commit `356d237` aprovou a suíte de regressão e o empacotamento. A recuperação do Testing Bridge no commit `44fbe49` passou novamente por 35/35 arquivos de teste, validação do pacote e integridade do ZIP. O harness local ainda precisa ser executado em uma instalação real do Foundry.

- O `CHANGELOG.md` continha duas entradas para 1.0.0.68 e duas para 1.0.0.67.
- Uma cópia antiga do README havia sido anexada ao changelog.
- As entradas repetidas foram consolidadas sem apagar as notas históricas.
- A cópia indevida do README foi retirada.
- README, visão do projeto, roadmap e política de estabilidade foram alinhados à base de desenvolvimento 1.0.0.97 e à release estável publicada 1.0.0.96.
- `system.json` na main usa a versão de desenvolvimento .97 e mantém `download` apontando para a release estável .96.
- O ZIP já publicado da .96 é imutável e ainda contém a URL antiga em seu `system.json`; o manifesto canônico aponta corretamente para .96. O workflow de release passa a sincronizar também o `system.json` nos próximos pacotes.

Os arquivos ativos `scripts/nexus-v1.0.0.js` e `styles/nexus-v1.0.0.css` são os caminhos efetivamente declarados em `system.json`; não são cópias descartáveis de releases antigas. O histórico de `CHANGELOG.md`, tags e releases deve ser preservado.

## Melhorias recuperadas da PR #63

1. A Biblioteca da ficha aceita mídia apenas quando `getLibraryMediaInsertionSource` confirma uma fonte de imagem segura; o recurso é inserido como componente `asset-image`.
2. Presets de tema nativos podem ser aplicados pela Biblioteca da ficha.
3. Atualizações de definições reutilizáveis usam a fila atômica do Library Store e verificam a versão esperada.
4. Antes de substituir a instância selecionada, o adaptador relê o layout e compara o snapshot; se a instância mudou, preserva-a e avisa o usuário.

## Pendências priorizadas

### P0 — validação real

- Executar `tools/foundry-testing/` em uma instalação local do Foundry VTT 14, com mundo descartável e `FOUNDRY_TEST_WORLD_ID` explícito; o smoke test cobre inicialização, sessão GM e criação/renderização/remoção de Actor temporário.
- Expandir o harness para validar instalação limpa, persistência, Biblioteca, Lógica, Mídia, Canvas e janelas no Foundry VTT 14 build 360.
- Repetir os fluxos em cliente GM e jogador quando aplicável.
- Não promover a release .96 a checkpoint funcional apenas com base no CI.

### P1 — reduzir concentração de responsabilidades

- Extrair a ficha e seus listeners por domínio, mantendo contratos públicos e formatos persistidos.
- Consolidar a cascata CSS, removendo regras redundantes somente após identificar seletores ativos e consumidores.
- Dividir a suíte de validação por domínio; manter `tests/run-all.mjs` como entrada única de CI.

### P1 — completar sistemas parcialmente implementados

- Biblioteca: concluir editores especializados e aplicação contextual de todos os tipos de recurso.
- Lógica: concluir o editor visual de fluxos, conectores, operações e contratos de execução; testar dependências e ciclos.
- Mídia: concluir adaptadores de armazenamento e decodificação especializada; manter conteúdo importado inerte.
- Fichas: revisar a diferenciação de fichas de personagem e NPC sem presumir que um tipo registrado já representa uma experiência especializada.
- Dados: testar migrações e concorrência entre clientes, além da fila local de gravação.

### P2 — organização do histórico

- Encerrar PRs antigas somente depois de recuperar suas melhorias úteis.
- Excluir branches já integradas ou sem commits exclusivos após confirmar que não são usadas como base de outra PR.
- Manter tags, releases e changelog como histórico; não apagar versões publicadas para reduzir a lista.

## Critério de conclusão desta auditoria

Uma pendência só pode ser marcada como concluída quando houver implementação verificável, teste automatizado adequado e, para fluxos de Foundry, validação funcional no cliente real. Esta auditoria não altera regras mecânicas do RPG.

## Atualização de interface — 2026-11-24

Após a auditoria, a main recebeu uma rodada integrada de refinamento visual e simplificação da Biblioteca:

- O Estúdio de Aparência passou a alternar Paleta, Tipografia, Layout e Acessibilidade dentro da própria janela, sem links âncora que alterem a navegação do navegador.
- A prévia do tema passou a representar painel, container, botões com rótulos, tipografia, input e barra de rolagem.
- O Design System passou a aplicar a família tipográfica como herança nas superfícies gerais do Foundry e a unificar fundos e bordas do Chat. Os controles de janela foram normalizados para manter os ícones sem blocos quadrados.
- Foram removidas as regras específicas que davam aparência de botões flutuantes aos controles nativos da barra do Foundry; o posicionamento e os handlers nativos permanecem sob responsabilidade do Foundry.
- A ficha agora abre a Biblioteca Universal compartilhada. O painel embutido e seu adaptador antigo foram removidos, junto com o contrato de teste correspondente, substituído por um contrato de integração com a aplicação universal.
- O texto selecionado na interface passa a usar o acento do tema, em vez do destaque padrão inconsistente do navegador.

A alteração é visual e de navegação; não altera schemas mecânicos de Actors/Items nem dados de campanha. A validação estática/CI ainda precisa ser confirmada após esta atualização, e o teste funcional real no Foundry VTT 14 build 360 continua pendente. O link de referência visual do usuário não pôde ser carregado nesta sessão; uma captura anexada diretamente é necessária para comparar detalhes pixel a pixel.
