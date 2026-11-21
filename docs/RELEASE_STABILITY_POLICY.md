# Política de versões e checkpoints estáveis

## Objetivo
Manter a branch `main` enxuta e utilizável, sem perder o histórico técnico das versões anteriores nem confundir validação automatizada com estabilidade funcional.

## Ciclo recomendado
1. Desenvolver correções e melhorias em incrementos pequenos, cada um com testes de regressão.
2. A cada 3 a 5 atualizações relevantes, ou antes de iniciar uma melhoria estrutural, realizar uma revisão de estabilidade.
3. Escolher como checkpoint a versão mais recente que cumpra todos os critérios abaixo. Se nenhuma cumprir, não declarar uma versão estável.
4. Registrar o checkpoint neste documento e utilizá-lo como base de referência para a próxima etapa.
5. Remover da árvore ativa protótipos e artefatos experimentais que já não sejam necessários, após registrar objetivo, resultado e limitações em `docs/archive/`.

## Critérios mínimos para declarar uma versão estável
- Todos os workflows de validação e empacotamento estão verdes.
- Não há defeitos conhecidos que impeçam fluxos essenciais da ficha.
- Os fluxos afetados pela atualização foram testados dentro do Foundry VTT 14, não apenas por testes estáticos.
- Persistência, migração e compatibilidade de dados existentes foram verificadas quando aplicáveis.
- O changelog registra mudanças, limitações e testes pendentes.
- A versão é adequada como base para uma melhoria futura, sem depender de correções urgentes já conhecidas.

## O que é preservado
- Releases e tags antigas não são apagadas automaticamente: elas permitem recuperar pacotes distribuídos e comparar regressões.
- O changelog e o histórico Git são o registro permanente das versões, inclusive as instáveis.
- A limpeza remove arquivos obsoletos da árvore atual, não reescreve o histórico do repositório.

## Checkpoint atual
**A versão 1.0.0.70 permanece como último checkpoint funcional confirmado no Foundry VTT.** A versão 1.0.0.71 foi publicada, mas sua validação automatizada não substitui a validação funcional/visual no Foundry. O pacote distribuído deve ser gerado a partir do commit validado da `main`; atualizar o código sem incrementar a versão não garante que o Foundry solicite outro pacote.

A versão 1.0.0.72 prepara uma atualização de compatibilidade: consolida a correção do contrato de dependências dos listeners, registra a versão do esquema de propriedades por Actor e protege dados de Actors gravados por uma versão mais nova do sistema. Ela ainda precisa passar por testes reais de abertura, navegação, edição e persistência no Foundry VTT 14 antes de ser declarada estável.

### Regra obrigatória para futuras atualizações
- Toda mudança no formato persistido incrementa `NEXUS_PROPERTY_SCHEMA_VERSION` quando aplicável.
- Toda versão nova do esquema recebe uma migração explícita, idempotente e coberta por testes com Actors antigos.
- Migrações preservam propriedades desconhecidas, layouts, componentes, grupos, aliases e dados personalizados que não estejam diretamente envolvidos na mudança.
- Um sistema antigo nunca deve rebaixar um Actor com versão de esquema superior.
- Mudanças distribuídas ao Foundry exigem nova versão e novo pacote; não reutilizar a mesma versão para forçar atualização do cliente.
- Uma release só é declarada estável após validação funcional no Foundry, não apenas CI verde.
