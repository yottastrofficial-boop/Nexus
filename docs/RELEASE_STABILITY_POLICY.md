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
- **Estado da main:** base de versão declarada `1.0.0.100` (desenvolvimento pós-release); a última versão estável publicada permanece `1.0.0.98`.
- **Último checkpoint funcional confirmado:** `1.0.0.70`, dentro do Foundry. A publicação da .96 não substitui esse checkpoint.
- **Metadados de distribuição:** `manifest.json` e `system.json.download` devem apontar para a mesma release estável. O workflow sincroniza os dois somente após confirmar o asset `nexus.zip`.
- **Próxima candidata prevista:** `1.0.0.100-rc.1` ou superior, gerada manualmente a partir da main quando a rodada de testes estiver pronta e a versão base for confirmada.
- **Manifesto estável:** aponta para a `1.0.0.98`, cujo ZIP foi anexado e verificado. `system.json.download` e `manifest.json.download` usam a mesma URL do asset publicado.
- **Interpretação correta:** aprovação do CI e publicação de um ZIP demonstram que o artefato foi validado automaticamente e disponibilizado; não demonstram, por si só, que ficha, Biblioteca, Lógica, Mídia e persistência funcionam corretamente no cliente.
- **Rotação após release estável:** depois que o workflow atualizar `manifest.json` e `system.json.download`, incremente `system.version` para a próxima base de desenvolvimento e atualize README, CHANGELOG, roadmap e visão do projeto antes do próximo commit funcional. `system.json.download` deve continuar igual à versão estável em `manifest.json`.

A ausência de confirmação funcional posterior não é prova de que versões intermediárias estejam defeituosas. Significa apenas que ainda não há evidência suficiente para substituir o checkpoint confirmado.

## Regras obrigatórias de versionamento e migração

- Toda mudança no formato persistido incrementa `NEXUS_PROPERTY_SCHEMA_VERSION` quando aplicável.
- Toda nova versão de schema recebe migração explícita, idempotente e coberta por testes com Actors antigos.
- Migrações preservam propriedades desconhecidas, layouts, componentes, grupos, aliases e dados personalizados que não estejam diretamente envolvidos na mudança.
- Um sistema antigo nunca deve rebaixar um Actor com versão de schema superior.
- Mudanças distribuídas ao Foundry exigem nova versão e novo pacote; não reutilizar a mesma versão para forçar atualização do cliente.
- O manifesto de instalação só deve apontar para uma release depois de confirmar que o ZIP correspondente está anexado e acessível.
- Uma release só é declarada funcionalmente estável após validação no Foundry real.

## Canais de publicação no GitHub Actions

O workflow `.github/workflows/release.yml` separa validação, candidata e release estável:

### 1. Validação comum

- Pull requests, pushes de desenvolvimento e execução manual com a opção `validate` executam a suíte unificada e empacotam um artefato temporário.
- O artefato de validação não cria uma GitHub Release e não altera `manifest.json`.
- O artefato temporário expira conforme a retenção configurada no workflow.

### 2. Release candidata

- Executar manualmente o workflow na branch `main`, escolhendo `candidate` e informando uma versão no formato `MAJOR.MINOR.PATCH.BUILD-rc.N`, por exemplo `1.0.0.100-rc.1`.
- A versão candidata precisa avançar o núcleo numérico da versão atualmente declarada em `system.json`.
- Depois que a suíte passa, o workflow ajusta `system.json`, README e changelog somente no ambiente temporário de CI usado para gerar o ZIP; nenhum arquivo da `main` é modificado.
- A release é publicada como *pre-release*, com tag própria e sem se tornar a versão mais recente.
- O manifesto estável não é atualizado. Instalações normais do Foundry continuam recebendo a última release estável.

### 3. Release estável

- Primeiro, atualizar `system.json` para a nova versão estável e integrar essa alteração à `main`.
- A publicação exige um commit na `main` cuja mensagem contenha o marcador exato `[release]`; variações como `[release-candidate]` não publicam uma versão estável.
- O workflow valida novamente a suíte e gera o ZIP. Tags que apontem para outro commit ou releases sem ZIP verificado são recusadas; uma reexecução do mesmo commit pode continuar sem sobrescrever assets. Releases e tags permanecem imutáveis.
- Depois de confirmar que `nexus.zip` está anexado e acessível, o workflow atualiza `manifest.json` para a nova versão.
- Se a validação, o empacotamento, a publicação ou a verificação do ZIP falhar, o manifesto estável não avança.

### 4. Estabilidade funcional

Candidata ou release estável não equivale a checkpoint funcional. A promoção do checkpoint continua dependendo da execução e do registro dos testes no Foundry VTT 14 build 360, conforme os critérios desta política.

## O que é preservado

- Releases e tags antigas não são apagadas automaticamente.
- O histórico Git é o registro permanente das alterações, inclusive protótipos e etapas instáveis.
- Branches antigas podem ser arquivadas ou excluídas somente após comparação com a main e confirmação de que commits exclusivos foram preservados ou deliberadamente descartados.
- A limpeza remove duplicações e código obsoleto da árvore ativa, não reescreve o histórico do projeto.

## Próximo checkpoint

A próxima versão funcional candidata deve partir da main atual e passar por uma rodada de validação funcional documentada no Foundry VTT 14 build 360. O relatório deve registrar: ambiente, versão instalada, Actors novos e antigos, fluxos testados, resultado, erros de console e evidências de persistência. Até essa validação, manter 1.0.0.70 como último checkpoint funcional confirmado.


A versão 1.0.0.98 inclui a correção dos tokens semânticos de seleção e inspeção de grupos, além da integração visual do Design System. A publicação do ZIP e a aprovação do CI não promovem o checkpoint funcional: a promoção depende do roteiro de `docs/FOUNDRY_THEME_VALIDATION.md` ser executado e documentado no Foundry real.
