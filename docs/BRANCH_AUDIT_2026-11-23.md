# Auditoria de branches — 2026-11-23

## Referência e método

- Repositório: `yottastrofficial-boop/Nexus`
- Base de comparação: `main`
- Commit de `main`: `335db5149ede0d595bb69a3f3102d1f4495c6ff7`
- Versão: `1.0.0.88`
- Método: comparação GitHub de cada branch com `main`, registrando commits exclusivos à frente/atrás e quantidade de arquivos alterados no diff.
- Esta é uma triagem estrutural, não uma revisão linha a linha de todos os commits. Não prova que um commit exclusivo seja útil, correto ou seguro para cherry-pick.

## Resultado executivo

A maioria das branches está divergente e parte de bases muito antigas. Não fazer merge em lote nem rebase destrutivo. Para reaproveitar algo, comparar o arquivo e o comportamento atual da `main`, portar somente a correção necessária e adicionar regressão.

Foram identificadas branches sem commits exclusivos (apenas atrás da main). Elas são candidatas a arquivamento/remoção depois de verificar PRs e referências. Não foram excluídas nesta auditoria.

Uma comparação de `performance/phase-2-canvas-runtime` falhou por desconexão do serviço remoto; seu estado permanece não verificado.

## Branches sem commits exclusivos

| Branch | À frente | Atrás | Arquivos no diff | Encaminhamento |
|---|---:|---:|---:|---|
| `feature/1.0.0.5-editor-interactions` | 0 | 843 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |
| `feature/intelligent-composite-cards` | 0 | 867 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |
| `fix/formulas-inspector-visual-1.0.0.60` | 0 | 409 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |
| `fix/unified-properties-inspector-1.0.0.61` | 0 | 391 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |
| `maintenance/v1.0.1-audit` | 0 | 901 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |
| `performance/phase-1` | 0 | 728 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |
| `release/1.0.0.1` | 0 | 901 | 0 | Candidata a arquivamento; commits já alcançáveis pela main |

## Branches divergentes

| Branch | À frente | Atrás | Arquivos no diff | Encaminhamento |
|---|---:|---:|---:|---|
| `feat/behavior-editor-groups-visual-2026-11-21` | 13 | 84 | 8 | Comparar visual e testes; não mesclar diretamente |
| `feat/behavior-editor-logic-expressions-2026-11-21` | 25 | 82 | 9 | Comparar com motor atual; portar somente lacunas comprovadas |
| `feat/library-explorer-model-instance-2026-11-21` | 41 | 79 | 16 | Revisar contratos de definição/instância; base divergente |
| `feat/library-explorer-unified-window` | 44 | 75 | 12 | Revisar seletivamente; UI e CSS divergiram |
| `feat/library-foundation-and-behavior-polish-2026-11-21` | 22 | 79 | 16 | Comparar com Biblioteca e Comportamentos atuais |
| `feat/library-rebuild-persistence-2026-11-22` | 22 | 73 | 11 | Não substituir o store atual; revisar somente diferenças pontuais |
| `feature/canvas-library-window-fixes` | 30 | 105 | 12 | Revisar por arquivo; alto risco de conflito na ficha |
| `feature/interaction-editor-v1.0.1` | 13 | 777 | 6 | Base muito antiga; extrair apenas correção isolada |
| `feature/interaction-editor-v1.1.0` | 32 | 777 | 10 | Base muito antiga; não mesclar |
| `feature/1.0.0.13-editor-workspaces` | 14 | 762 | 8 | Histórico antigo; manter como referência |
| `feature/1.0.0.14-editor-ux-polish` | 17 | 761 | 7 | Histórico antigo; manter como referência |
| `feature/1.0.0.16-flow-tabs-editor-ux` | 11 | 759 | 7 | Histórico antigo; manter como referência |
| `feature/1.0.0.18-unified-editor-design` | 15 | 757 | 9 | Histórico antigo; manter como referência |
| `feature/1.0.0.19-library-layout-repair` | 7 | 756 | 6 | Histórico antigo; manter como referência |
| `feature/1.0.0.20-editor-theme-system` | 14 | 755 | 8 | Histórico antigo; manter como referência |
| `feature/1.0.0.21-visual-consistency` | 6 | 754 | 6 | Histórico antigo; manter como referência |
| `feature/1.0.0.22-behavior-library-rebuild` | 13 | 753 | 7 | Histórico antigo; manter como referência |
| `feature/1.0.0.23-property-expressions` | 13 | 750 | 7 | Histórico antigo; comparar parser atual antes de portar |
| `feature/1.0.0.24-library-property-system` | 24 | 749 | 8 | Histórico antigo; comparar contratos atuais |
| `fix/behavior-editor-layout-inputs-2026-11-21` | 14 | 80 | 8 | Comparar interface atual e regressões |
| `fix/comprehensive-stability-audit` | 26 | 390 | 15 | Revisão seletiva; contém histórico de auditoria antigo |
| `fix/critical-high-priority-2026-11-21` | 47 | 91 | 15 | Parte já integrada; não mesclar a branch inteira |
| `fix/full-sheet-dependency-audit-1.0.0.71` | 3 | 96 | 2 | Revisar os poucos arquivos exclusivos |
| `fix/inspector-namespace-tdz-1.0.0.75` | 6 | 91 | 6 | Confirmar se a correção já está presente antes de fechar PR |
| `fix/library-navigation-visual-consistency-2026-11-22` | 31 | 72 | 9 | Comparar com a Biblioteca atual |
| `fix/library-property-picker-v1.0.0.25` | 3 | 748 | 3 | Base antiga; revisão isolada apenas |
| `fix/media-behavior-inspector-1.0.0.73` | 28 | 94 | 13 | Comparar contratos de mídia e comportamento atuais |
| `fix/media-inspector-triggers-1.0.0.73` | 14 | 93 | 8 | Comparar contratos atuais; não mesclar diretamente |
| `fix/modular-sheet-runtime-1.0.0.27` | 7 | 745 | 5 | Base antiga; usar como referência histórica |
| `fix/property-library-canvas-performance-v1.0.0.33` | 5 | 706 | 15 | Revisar benchmarks e regressões antes de portar |
| `fix/property-picker-themes-viewport-1.0.0.28` | 9 | 743 | 8 | Base antiga; revisar isoladamente |
| `fix/skill-group-layout` | 1 | 103 | 1 | Um arquivo exclusivo; comparar com implementação atual |
| `fix/token-link-library-1.0.0.3` | 33 | 895 | 10 | Base muito antiga; não mesclar |
| `fix/1.0.0.15-behavior-panel-icons` | 10 | 760 | 8 | Histórico antigo; manter como referência |
| `fix/1.0.0.17-match-library-window-size` | 8 | 758 | 6 | Histórico antigo; manter como referência |
| `release/1.0.0.1-audit-fix` | 12 | 901 | 10 | Histórico de release antigo; não mesclar |
| `release/1.0.0.2-stabilization` | 31 | 896 | 12 | Histórico de release antigo; não mesclar |
| `refactor/audit-1.0.0.70` | 128 | 103 | 26 | Contém extrações importantes; revisar commits/arquivos individualmente |
| `refactor/rulebook-property-schema-lazy-canvas` | 43 | 708 | 14 | Base antiga; conferir regras e schema antes de portar |

## Verificações pontuais já realizadas

- `scripts/core/group-hierarchy.js` na branch `fix/critical-high-priority-2026-11-21` é idêntico ao arquivo da main.
- `scripts/core/migration-manager.js` na mesma branch também é idêntico ao arquivo da main.
- `scripts/core/formula-engine.js` na branch `fix/stability-media-conditions-empty-values-2026-11-21` é diferente, mas a versão da main contém mais linhas; não substituir a implementação atual pela branch antiga.
- `scripts/core/interactions.js` nessa branch também é diferente e menor que a versão atual da main; exige comparação semântica antes de qualquer reaproveitamento.
- `scripts/core/library-store.js` e `scripts/sheets/library-view.js` na branch `feat/library-rebuild-persistence-2026-11-22` são versões menores e diferentes das atuais; não substituir o código da main.
- Os resultados acima demonstram por que o número de commits exclusivos não é um indicador de que a branch seja mais nova ou melhor.

## Pull requests

A busca de PRs listou propostas abertas antigas relacionadas à correção do Inspector, estabilidade das fórmulas/propriedades e motor de interações. Antes de fechar qualquer PR, verificar seu head branch, arquivos exclusivos, comentários/revisões e se cada correção já está na main. PRs fechados e históricos não precisam ser reabertos apenas para limpar a lista.

## Política recomendada daqui em diante

1. Uma branch de trabalho por objetivo, criada a partir da main atual.
2. PRs pequenos, com um domínio e um conjunto de testes identificável.
3. Não usar branches de release antigas como base.
4. Antes de portar: comparar arquivo, comportamento e testes; verificar se a main já contém a correção.
5. Nunca apagar branch com commits exclusivos antes de arquivar ou portar o conteúdo útil.
6. Não fazer force-push/rebase de branches compartilhadas sem necessidade explícita.
7. Depois do merge, fechar a tarefa e arquivar a branch quando a plataforma permitir.
8. Manter a main como base de referência e evitar branches permanentes divergentes.

## Próximas ações

- Confirmar o estado de `performance/phase-2-canvas-runtime` em nova tentativa.
- Revisar PRs antigos ainda abertos e fechar somente os que estiverem integralmente superseded pela main.
- Revisar commits exclusivos de `refactor/audit-1.0.0.70` e das branches recentes de estabilidade, priorizando correções ainda ausentes.
- Fazer a limpeza de código em PRs separados, com testes de regressão e sem alterar formatos persistidos sem migração.
