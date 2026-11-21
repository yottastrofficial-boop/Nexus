# Registro de estabilização — 2026-11-21

## Escopo desta rodada

Correções críticas e de alta prioridade realizadas na branch `fix/critical-high-priority-2026-11-21`, sem alterar a `main`, publicar release ou modificar regras do NEXUS.

## Correções implementadas

1. **Inicialização dos listeners do Inspector**
   - `inspectorNamespace` é inicializado antes do primeiro listener delegado.
   - A limpeza do namespace anterior ocorre antes do novo registro.
   - Foi adicionada uma regressão automatizada para a ordem de inicialização.

2. **Migração por Actor**
   - Migrações simultâneas para a mesma instância de Actor compartilham uma única Promise por cliente.
   - A entrada é removida da WeakMap após a conclusão ou falha, permitindo novas tentativas.
   - A migração continua idempotente e preserva a proteção contra esquemas futuros.

3. **Atualizações e renderização**
   - Atualizações de sistema feitas pela migração e pela inicialização de atributos/perícias usam `{ render: false }`.
   - A ficha solicita uma atualização visual explícita após a migração.
   - Solicitações de atualização visual são coalescidas por instância.
   - A inicialização de atributos/perícias compartilha a operação em andamento por instância da ficha.

4. **Rejeições de persistência na interface**
   - Os listeners de edição de propriedades e de valores de recursos capturam a rejeição após o helper registrar o erro e notificar o usuário.
   - A fila continua recuperando-se de operações anteriores rejeitadas.
   - A causa raiz de falhas de gravação específicas ainda depende de reprodução no Foundry com os dados reais do Actor.

## Preservação

- Nenhuma migração foi executada contra dados de usuários durante esta alteração.
- Nenhum campo persistido foi removido ou renomeado.
- Nenhuma fórmula ou regra de jogo foi alterada.
- Manifesto e versão distribuída permanecem em 1.0.0.74.
- Nenhuma release foi publicada.

## Validação

- A primeira execução de CI da PR #42 passou na validação de regressões, sintaxe, manifesto, templates, estilos e geração do pacote.
- A execução posterior à última alteração precisa confirmar o estado integral desta branch.
- Teste manual no Foundry VTT 14 build 360 continua pendente: abertura/fechamento de fichas, edição de propriedades, migração de Actors antigos, múltiplas fichas do mesmo Actor, tokens e layouts grandes.

## Próximas verificações de prioridade alta

- Reproduzir a falha de salvamento do Inspector com um Actor real e registrar a exceção original.
- Verificar o comportamento de `setFlag` durante a migração e o número efetivo de renderizações.
- Testar ciclos de fórmulas, aliases e interações com limites de profundidade.
- Testar ciclos de vida dos listeners, timers, observers e janelas flutuantes.
- Testar hierarquias extensas de grupos e layouts com grande número de componentes.
- Comparar APIs efetivamente utilizadas com o Foundry VTT 14.360.

Este registro descreve somente mudanças já realizadas e verificações ainda pendentes; não declara a release pronta.
