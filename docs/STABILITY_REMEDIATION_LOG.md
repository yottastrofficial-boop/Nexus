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

4. **Ciclo de vida dos painéis flutuantes**
   - Operações assíncronas de abertura de painéis verificam a geração da interface antes de continuar.
   - Uma renderização antiga não pode abrir uma janela depois que o Floating UI foi substituído ou fechado.
   - O timer de troca de página é cancelado durante a limpeza.

5. **Hierarquias e snapshots de grupos**
   - Detecção de ciclos, coleta de descendentes, achatamento de linhas e construção de snapshots foram convertidos para percursos iterativos.
   - A profundidade dos grupos é calculada uma vez e reutilizada na composição visual.
   - Foram adicionados testes com 2.500 níveis, além de um teste de ciclo corrompido.

6. **Inicialização de atributos/perícias entre múltiplas fichas**
   - A Promise de inicialização agora é compartilhada por Actor, não apenas por instância de ficha.
   - Duas fichas abertas para o mesmo Actor aguardam a mesma operação e não iniciam gravações duplicadas.
   - Falhas continuam permitindo nova tentativa; somente uma inicialização concluída marca a ficha como pronta.

7. **Renderização de grupos do Canvas**
   - A renderização usa o índice de profundidade pré-calculado pela hierarquia, eliminando percursos repetidos pelos ancestrais.
   - O cálculo da profundidade máxima usa redução, evitando o limite de argumentos de `Math.max(...array)` em layouts grandes.
   - Foi adicionado teste de regressão executado no CI.

8. **Geometria de contato entre superfícies do Canvas**
   - Substitui a comparação incondicional de todos os pares por uma varredura espacial ordenada pelo eixo horizontal.
   - Descarta pares cujas caixas não podem se tocar, preservando candidatos de contato lateral, vertical e de canto.
   - Mantém o pior caso quadrático quando muitas superfícies realmente se sobrepõem, mas evita comparar todas as superfícies distantes em layouts dispersos.
   - Adiciona testes de contato e de 2.000 superfícies dispersas.

9. **Rejeições de persistência na interface**
   - Os listeners de edição de propriedades e de valores de recursos capturam a rejeição após o helper registrar o erro e notificar o usuário.
   - A fila continua recuperando-se de operações anteriores rejeitadas.
   - A causa raiz de falhas de gravação específicas ainda depende de reprodução no Foundry com os dados reais do Actor.
   - Falhas ao atualizar prévias visuais agora são registradas separadamente e não devem ser confundidas com falhas de persistência.

## Preservação

- Nenhuma migração foi executada contra dados de usuários durante esta alteração.
- Nenhum campo persistido foi removido ou renomeado.
- Nenhuma fórmula ou regra de jogo foi alterada.
- Manifesto e versão distribuída permanecem em 1.0.0.74.
- Nenhuma release foi publicada.

## Validação

- A primeira execução de CI da PR #42 passou na validação de regressões, sintaxe, manifesto, templates, estilos e geração do pacote.
- A execução posterior à última alteração precisa confirmar o estado integral desta branch.
- Testes automatizados também cobrem a preservação de atributos aninhados, a separação entre persistência e atualização visual e hierarquias de grupos profundas.
- As regressões de renderização de grupos e inicialização compartilhada passaram no CI do commit `d7393bd`.
- A regressão da varredura espacial foi adicionada depois e aguarda a execução do CI mais recente.
- Em 2026-11-21, os workflows `Validate NEXUS` e `Validate and Release` passaram no commit `d7393bd`; o pacote foi construído como artefato de validação, mas a publicação da release foi ignorada.
- Teste manual no Foundry VTT 14 build 360 continua pendente: abertura/fechamento de fichas, edição de propriedades, migração de Actors antigos, múltiplas fichas do mesmo Actor, tokens e layouts grandes.

## Próximas verificações de prioridade alta

- Reproduzir a falha de salvamento do Inspector com um Actor real e registrar a exceção original.
- Verificar o comportamento de `setFlag` durante a migração e o número efetivo de renderizações.
- Testar ciclos de fórmulas, aliases e interações com limites de profundidade.
- Testar ciclos de vida dos listeners, timers, observers e janelas flutuantes.
- Testar layouts com grande número de componentes e medir a performance no Foundry em execução.
- Comparar APIs efetivamente utilizadas com o Foundry VTT 14.360.

Este registro descreve somente mudanças já realizadas e verificações ainda pendentes; não declara a release pronta.
