# Política de versões e checkpoints estáveis

## Objetivo

Manter a branch `main` utilizável e auditável, sem confundir publicação de pacote, CI verde e estabilidade funcional. O histórico Git e as releases preservam versões anteriores; a limpeza deve atuar na árvore e nas branches ativas, não apagar o histórico.

## Ciclo recomendado

1. Desenvolver correções em incrementos pequenos e isolados.
2. Adicionar testes de regressão antes ou junto da alteração.
3. A cada 3 a 5 atualizações relevantes, ou antes de uma mudança estrutural, revisar estabilidade.
4. Escolher como checkpoint somente uma versão que cumpra todos os critérios abaixo.
5. Registrar o checkpoint e as limitações antes de iniciar a etapa seguinte.
6. Remover protótipos da árvore ativa apenas depois de identificar consumidores e registrar sua função/resultado em `docs/archive/`.

## Critérios mínimos para declarar uma versão funcionalmente estável

- Workflows de validação e empacotamento aprovados.
- Nenhum defeito conhecido bloqueia fluxos essenciais.
- Os fluxos afetados foram testados dentro do Foundry VTT 14, não apenas por testes estáticos.
- Persistência, migração e compatibilidade de dados existentes foram verificadas quando aplicáveis.
- Changelog registra mudanças, limitações e testes pendentes.
- A versão é adequada como base para uma etapa futura sem depender de correções urgentes conhecidas.

## Estado de referência — 2026-11-24

- **Último checkpoint funcional confirmado no Foundry:** `1.0.0.70`, conforme o histórico de validação registrado neste documento.
- **Última release estável publicada:** `1.0.0.98`, com `nexus.zip` publicado e asset confirmado após CI; continua sem validação funcional completa no Foundry VTT 14 build 360.
- **Estado da main:** base de versão declarada `1.0.0.101` (desenvolvimento pós-release); a última versão estável publicada permanece `1.0.0.98`.
- **Último checkpoint funcional confirmado:** `1.0.0.70`, dentro do Foundry. A publicação da .96 não substitui esse checkpoint.
- **Metadados de distribuição:** `manifest.json` e `system.json.download` devem apontar para a mesma release estável. O workflow sincroniza os dois somente após confirmar o asset `nexus.zip`.
- **Manifesto original:** `manifest.json` é o único endereço de instalação/atualização e deve apontar para a última release estável publicada, com ZIP confirmado.
- **Interpretação correta:** aprovação do CI e publicação de um ZIP demonstram que o artefato foi validado automaticamente e disponibilizado; não demonstram, por si só, que ficha, Biblioteca, Lógica, Mídia e persistência funcionam corretamente no cliente.
- **Rotação após release estável:** depois que o workflow atualizar `manifest.json` e `system.json.download`, incremente `system.version` para a próxima base de desenvolvimento e atualize README, CHANGELOG, roadmap e visão do projeto antes do próximo commit funcional. `system.json.download` deve continuar igual à versão estável em `manifest.json`.

A ausência de confirmação funcional posterior não é prova de que versões intermediárias estejam defeituosas. Significa apenas que ainda não há evidência suficiente para substituir o checkpoint confirmado.

## Regras obrigatórias de versionamento e migração

- Toda mudança no formato persistido incrementa `NEXUS_PROPERTY_SCHEMA_VERSION` quando aplicável.
- Toda nova versão de schema recebe migração explícita, idempotente e coberta por testes com Actors antigos.
- Migrações preservam propriedades desconhecidas, layouts, componentes, grupos, aliases e dados personalizados que não estejam diretamente envolvidos na mudança.
- Um sistema antigo nunca deve rebaixar um Actor com versão de schema superior.
- Mudanças distribuídas ao Foundry exigem nova versão e novo pacote; não reutilizar a mesma versão para forçar atualização do cliente.
- O `manifest.json` original só deve apontar para uma release estável depois de confirmar que o ZIP correspondente está anexado e acessível.
- Uma release só é declarada funcionalmente estável após validação no Foundry real.

## Publicação no GitHub Actions

- O workflow executa validação e empacotamento em pushes e pull requests.
- Uma release só é publicada por um commit na branch `main` cuja mensagem contenha o marcador exato `[release]`.
- Não há canal de candidata, pré-release ou publicação manual de versões experimentais.
- Antes da publicação, a suíte automatizada e o ZIP são validados.
- Depois de confirmar o asset `nexus.zip`, o workflow atualiza o `manifest.json` original para a release estável publicada.
- Se validação, empacotamento, publicação ou verificação do ZIP falhar, o manifesto não avança.
- O manifesto e o pacote devem apontar para a mesma versão estável. A versão-base de desenvolvimento em `system.json` pode avançar sem alterar o download estável.

## Estabilidade funcional

A publicação de uma release estável não equivale a checkpoint funcional. A promoção do checkpoint depende da execução e do registro dos testes no Foundry VTT 14 build 360, conforme os critérios desta política.

## O que é preservado

- Releases e tags estáveis antigas são preservadas como histórico; pré-releases antigas precisam ser removidas manualmente quando a ferramenta de administração permitir.
- O histórico Git é o registro permanente das alterações, inclusive protótipos e etapas instáveis.
- Branches antigas podem ser arquivadas ou excluídas somente após comparação com a main e confirmação de que commits exclusivos foram preservados ou deliberadamente descartados.
- A limpeza remove duplicações e código obsoleto da árvore ativa, não reescreve o histórico do projeto.

## Próximo checkpoint

A próxima versão estável deve partir da main atual e passar por uma rodada de validação funcional documentada no Foundry VTT 14 build 360. O relatório deve registrar: ambiente, versão instalada, Actors novos e antigos, fluxos testados, resultado, erros de console e evidências de persistência. Até essa validação, manter 1.0.0.70 como último checkpoint funcional confirmado.


A versão 1.0.0.98 inclui a correção dos tokens semânticos de seleção e inspeção de grupos, além da integração visual do Design System. A publicação do ZIP e a aprovação do CI não promovem o checkpoint funcional: a promoção depende do roteiro de `docs/FOUNDRY_THEME_VALIDATION.md` ser executado e documentado no Foundry real.
