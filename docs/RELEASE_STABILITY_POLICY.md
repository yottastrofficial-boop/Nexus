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

## Estado de referência — 2026-11-25 (publicação da 1.0.0.111 para teste)

- **Versão atual na main:** `1.0.0.111`; publicação autorizada para teste antes da validação manual.
- **Última versão estável anterior:** `1.0.0.107`; release, ZIP e manifesto confirmados antes da sincronização da .108.
- **Teste manual pendente:** `1.0.0.111` corrige o chat lateral com base no DOM real (OL.chat-log, FORM.chat-form), expandindo histórico, controles e compositor de 300 px para a largura disponível e compactando os cartões. CI e testes de contrato passaram; a validação manual no Foundry VTT 14 build 360 ainda é necessária e não promove automaticamente a versão a checkpoint funcional.
- **Manutenção em main:** commit `34c114539e04e67151dbcf806283503e91c3cdf0` isola o sidebar das regras globais de tipografia, consolida estilos e amplia os testes de regressão; CI e empacotamento aprovados.
- **Limitação explícita:** a validação visual/funcional no Foundry 14 build 360 continua pendente. A captura enviada mostrou abas verticais, conteúdo sobreposto e ícones incorretos. A correção tipográfica dos ícones foi identificada e integrada na PR #97, mas ainda não foi verificada no cliente real; o layout horizontal segue pendente. O checkpoint funcional permanece em `1.0.0.70`.
- **Distribuição:** a `1.0.0.111` foi autorizada para publicação antecipada. O manifesto estável só será sincronizado após CI, empacotamento e confirmação do asset; o checkpoint funcional permanece em `1.0.0.70` até validação no Foundry real.
- **Sincronização:** o workflow só atualiza o manifesto original depois de aprovar os testes, gerar o ZIP e confirmar o asset `nexus.zip`.
- **Último checkpoint funcional confirmado no Foundry:** `1.0.0.70`.
- **Ambiente-alvo:** Foundry VTT 14, build 360.
- A aprovação do CI e a publicação de um ZIP demonstram que o artefato foi validado automaticamente e disponibilizado; não demonstram, por si só, que ficha, Biblioteca, Lógica, Mídia e persistência funcionam corretamente no cliente.

## Regras obrigatórias de versionamento e migração

- Toda mudança no formato persistido incrementa `NEXUS_PROPERTY_SCHEMA_VERSION` quando aplicável.
- Toda nova versão de schema recebe migração explícita, idempotente e coberta por testes com Actors antigos.
- Migrações preservam propriedades desconhecidas, layouts, componentes, grupos, aliases e dados personalizados que não estejam diretamente envolvidos na mudança.
- Um sistema antigo nunca deve rebaixar um Actor com versão de schema superior.
- Mudanças distribuídas ao Foundry exigem nova versão e novo pacote; não reutilizar a mesma versão para forçar atualização do cliente.
- `system.json.download` aponta para o pacote da versão declarada em `system.json`; `manifest.json` aponta para a última versão estável confirmada.
- Uma versão só é declarada funcionalmente estável após validação no Foundry real.

## Publicação no GitHub Actions

- O workflow executa validação e empacotamento em pushes e pull requests.
- Uma release estável só é publicada por um commit na branch `main` cuja mensagem contenha o marcador exato `[release]`.
- Antes da publicação, a suíte automatizada e o ZIP são validados.
- Depois de confirmar o asset `nexus.zip`, o workflow atualiza o `manifest.json` original para a release estável publicada.
- Se validação, empacotamento, publicação ou verificação do ZIP falhar, o manifesto não avança.
- O manifesto e o pacote devem apontar para versões coerentes; a base de desenvolvimento pode avançar sem alterar o download estável.

## Estabilidade funcional

A publicação de uma release estável não equivale a checkpoint funcional. A evidência visual enviada após a instalação da 1.0.0.106 confirma que o sidebar permanece defeituoso. A promoção do checkpoint depende da execução e do registro dos testes no Foundry VTT 14 build 360, conforme os critérios desta política.

## O que é preservado

- Releases e tags publicadas são preservadas como histórico.
- O histórico Git é o registro permanente das alterações, inclusive protótipos e etapas instáveis.
- Branches antigas podem ser arquivadas ou excluídas somente após comparação com a main e confirmação de que commits exclusivos foram preservados ou deliberadamente descartados.
- A limpeza remove duplicações e código obsoleto da árvore ativa, não reescreve o histórico do projeto.

## Próximo checkpoint

A próxima versão funcionalmente estável deve passar por uma rodada de validação documentada no Foundry VTT 14 build 360. O relatório deve registrar: ambiente, versão instalada, Actors novos e antigos, fluxos testados, resultado, erros de console e evidências de persistência. Até essa validação, manter 1.0.0.70 como último checkpoint funcional confirmado.
