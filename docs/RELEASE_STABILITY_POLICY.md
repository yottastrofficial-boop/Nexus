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
**A versão 1.0.0.70 permanece como último checkpoint de distribuição.** A versão 1.0.0.71 está preparada na branch principal de desenvolvimento, com validação automatizada de pacote, sintaxe, regressões e empacotamento aprovada, mas ainda não foi publicada como release nem declarada estável. A revisão #35 corrige a duplicidade de interações, organiza o ciclo de vida dos listeners, reforça a persistência local e centraliza a compatibilidade de aliases. Permanecem obrigatórios os testes funcionais e visuais no Foundry VTT 14, inclusive cenários com múltiplas janelas e usuários, antes de distribuir a nova versão.
