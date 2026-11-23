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

## Estado de referência — 2026-11-23

- **Último checkpoint funcional confirmado no Foundry:** `1.0.0.70`, conforme o histórico de validação registrado neste documento.
- **Última versão publicada:** `1.0.0.90`. O pacote foi construído, validado pelo CI e anexado à Release. A versão permanece sem confirmação funcional no cliente Foundry; o último checkpoint funcional continua sendo `1.0.0.70`.
- **Interpretação correta:** 1.0.0.90 reúne alterações funcionais na Biblioteca e correções de interface, mas ainda depende de validação no Foundry VTT 14 build 360; não é checkpoint funcional confirmado. O último checkpoint confirmado continua sendo 1.0.0.70.
- A confirmação do ZIP/release demonstra que o artefato foi produzido e publicado; não demonstra, por si só, que todos os fluxos da ficha, Biblioteca, Lógica, Mídia e persistência funcionam corretamente no cliente.

A ausência de confirmação funcional posterior não é prova de que versões intermediárias estejam defeituosas. Significa apenas que ainda não há evidência suficiente para substituir o checkpoint confirmado.

## Regras obrigatórias de versionamento e migração

- Toda mudança no formato persistido incrementa `NEXUS_PROPERTY_SCHEMA_VERSION` quando aplicável.
- Toda nova versão de schema recebe migração explícita, idempotente e coberta por testes com Actors antigos.
- Migrações preservam propriedades desconhecidas, layouts, componentes, grupos, aliases e dados personalizados que não estejam diretamente envolvidos na mudança.
- Um sistema antigo nunca deve rebaixar um Actor com versão de schema superior.
- Mudanças distribuídas ao Foundry exigem nova versão e novo pacote; não reutilizar a mesma versão para forçar atualização do cliente.
- O manifesto de instalação só deve apontar para uma release depois de confirmar que o ZIP correspondente está anexado e acessível.
- Uma release só é declarada funcionalmente estável após validação no Foundry real.

## O que é preservado

- Releases e tags antigas não são apagadas automaticamente.
- O histórico Git é o registro permanente das alterações, inclusive protótipos e etapas instáveis.
- Branches antigas podem ser arquivadas ou excluídas somente após comparação com a main e confirmação de que commits exclusivos foram preservados ou deliberadamente descartados.
- A limpeza remove duplicações e código obsoleto da árvore ativa, não reescreve o histórico do projeto.

## Próximo checkpoint

A próxima versão funcional candidata deve partir da main atual e passar por uma rodada de validação funcional documentada no Foundry VTT 14 build 360. O relatório deve registrar: ambiente, versão instalada, Actors novos e antigos, fluxos testados, resultado, erros de console e evidências de persistência. Até essa validação, manter 1.0.0.70 como último checkpoint funcional confirmado.
