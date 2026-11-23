# NEXUS — Núcleo de Lógica e Configuração

## Estado
Arquitetura aprovada. A infraestrutura de dados e execução foi implementada na 1.0.0.85. Nesta branch, os cinco tipos recebem schemas estruturais no Core, validação sem efeitos colaterais e editores especializados iniciais no Inspector da Biblioteca. Ações e funções executáveis continuam sendo registradas por código confiável do Core/módulos.

## Organização unificada
Regras, comportamentos, fluxos e propriedades técnicas serão administrados em um único ambiente da Biblioteca chamado **Lógica**. A unificação é de navegação, descoberta, dependências e ferramentas comuns. Os conceitos continuam sendo tipos distintos, com schemas, editores e executores especializados.

A área Lógica conterá:
- **Propriedades:** definições de dados, tipos, caminhos, valores padrão, limites e metadados.
- **Regras:** condições, cálculos, validações e fórmulas reutilizáveis.
- **Comportamentos:** respostas a eventos em componentes ou entidades.
- **Fluxos:** sequências reutilizáveis de gatilhos, condições e ações.
- **Funções e expressões:** operações seguras fornecidas pelo Core e por módulos.

Configurações técnicas gerais (namespace, versão, origem, permissões, dependências e compatibilidade) ficam nos metadados comuns/avançados, não em outra categoria concorrente.

## Modelo mental
- Propriedade define quais dados existem e como são descritos.
- Regra define como avaliar, calcular ou validar algo.
- Comportamento define como um alvo reage a um evento.
- Fluxo organiza quando e em que sequência operações acontecem.
- Função/expressão fornece operações reutilizáveis aos demais elementos.

Uma regra pode ser referenciada por um fluxo; um comportamento pode iniciar um fluxo; um componente pode consumir uma propriedade. Essas relações são referências tipadas, não cópias ocultas.

## Envelope comum
Cada ativo lógico terá um envelope comum e um payload específico por tipo:
- id estável e namespace;
- type e schemaVersion;
- name e description;
- origin, versão do pacote e tags;
- enabled e dependencies;
- permissions;
- payload validado pelo schema do subtipo.

O exemplo de ID conceitual é nexus.core.rule.resource-threshold. O nome exibido pode mudar; a identidade técnica não.

## Pipeline de execução
1. Evento/solicitação identifica contexto e alvo.
2. Resolução consulta Actor, Item, componente e propriedades permitidas.
3. Avaliação resolve condições e regras.
4. Planejamento valida ações, permissões e dependências.
5. Execução realiza operações permitidas em ordem explícita.
6. Persistência grava somente alterações necessárias e autorizadas.
7. Diagnóstico retorna sucesso, falha, avisos e origem do erro.

A interface edita definições; o executor interpreta os dados independentemente da UI.

## Contratos especializados
- **Propriedades:** ID, chave técnica, tipo, valor padrão, armazenamento, permissões e metadados. Zero, false e string vazia são valores válidos quando compatíveis com o tipo; ausência deve ser explícita.
- **Regras:** expressões condicionais, fórmulas, validações e resultados declarativos. Sem acesso arbitrário a DOM, rede, filesystem ou JavaScript global.
- **Comportamentos:** associam eventos a fluxos ou operações declarativas; definem escopo, prioridade, prevenção de disparos duplicados e política de falha.
- **Fluxos:** preservam gatilhos, condições e ações com IDs próprios. Ordem e política de erro são explícitas. Instanciar um modelo gera IDs novos.
- **Funções:** registradas com namespace, assinatura, tipos, limites e declaração de efeitos. Operações com efeitos colaterais exigem autorização própria.

## Editor unificado
Uma área de trabalho com navegação por subtipo/pastas, grade/lista, busca, filtros de origem (Padrão, Pessoais, Módulos, Complementos), Inspector de metadados comuns, editor especializado, dependências, validação e simulação sem gravação real. O Inspector comum não substitui editores específicos.

## Dependências
Referências usam ID estável e namespace, nunca rótulos. O registry valida tipo, existência, versão e permissões. O grafo identifica ciclos e dependências ausentes; ciclos são rejeitados por padrão. Excluir ativos referenciados exige aviso e decisão explícita. Módulos não sobrescrevem silenciosamente ativos de outros namespaces.

## Segurança
Importações são dados inertes. Expressões usam parser controlado, nunca eval ou Function. Permissões são verificadas novamente durante a execução. Limites de profundidade, tamanho, tempo e quantidade de ações são obrigatórios.

## Migração
Coleções antigas de rules, behaviors e flows serão convertidas ao envelope comum preservando IDs e payloads válidos. Propriedades e aliases permanecem em seus domínios até que o novo registro resolva suas referências sem alterar caminhos persistidos dos Actors. Migração idempotente, backup, relatório e leitores de compatibilidade são obrigatórios.

## Critérios de aceite
- Uma única área Lógica com filtros por subtipo.
- Schemas e editores próprios para cada tipo.
- Referências sobrevivem a renomeações.
- Duplicação gera IDs novos onde necessário.
- Importação detecta dependências e conflitos.
- Execução independente da UI e sem JavaScript arbitrário.
- Dados antigos permanecem legíveis durante a migração.


## Implementação da infraestrutura — 1.0.0.85

- `scripts/core/logic-registry.js` normaliza ativos com envelope comum, IDs/namespace estáveis, payload JSON inerte, validação de schemas registrada por tipo, referências tipadas e origem.
- O grafo de dependências identifica referências ausentes, incompatibilidade de tipo e ciclos; a remoção de ativos referenciados exige decisão explícita.
- `scripts/core/logic-library.js` carrega coleções legadas sem persistir migrações automaticamente, grava ativos nas coleções canônicas e preserva compatibilidade com as flags antigas.
- `scripts/core/logic-runtime.js` executa fluxos declarativos em sequência, avalia condições pelo parser seguro existente, aplica permissões por callback, limita ações/condições/tempo e retorna diagnóstico por ação.
- Funções e ações são registradas explicitamente por código confiável; o runtime não interpreta JavaScript importado.
- `game.nexus.logic.registerAction()` e `registerFunction()` expõem o registro de executores confiáveis a módulos; `runFlow()` e `dispatch()` expõem execução e despacho, e `getExecutors()` lista os IDs disponíveis. Nenhum executor padrão é presumido até que o Core defina operações e permissões específicas.
- `simulateFlow()` avalia condições, executores registrados e permissões sem executar ações. O editor de Fluxos oferece o comando **Simular sem salvar**, usando o personagem atribuído ao usuário quando disponível; o resultado informa ações prontas, bloqueadas ou não registradas. `runFlow()` e `simulateFlow()` validam também payloads transitórios contra os schemas antes de executar ou simular.
- `foundry-logic-integration.js` conecta Hooks de criação/atualização/remoção de Actors, Items, Tokens e Combats, além de início/rodada/turno de combate, aos eventos `actor.*`, `item.*`, `token.*` e `combat.*` dos Comportamentos.
- O despacho de eventos de ciclo de vida ocorre somente no GM ativo para evitar execução duplicada entre clientes. A verificação de permissões usa o usuário que originou o Hook, nunca os privilégios do GM executor. O executor inicial `nexus.actor.update` grava exclusivamente em caminhos `system.*`, exige propriedade OWNER do usuário originador e aceita somente valores JSON inertes.
- O bridge limita reentrada por documento/evento, profundidade de encadeamento e captura falhas por Comportamento para que um fluxo defeituoso não interrompa os demais.
- O armazenamento da Biblioteca passou ao schema 2, com coleções próprias para propriedades e funções. Backups da Biblioteca incluem essas coleções.

### Limitações restantes

- A interface ainda não apresenta Propriedades, Regras, Comportamentos, Fluxos e Funções em uma única área visual Lógica.
- Os schemas específicos de cada subtipo precisam ser registrados pelo Core ou por módulos; o registry fornece o contrato e a validação plugável.
- O Core fornece o executor `nexus.actor.update`; demais ações continuam dependendo de executores confiáveis registrados pelo Core ou por módulos. Eventos de ciclo de vida rodam apenas no GM ativo; interações locais de componentes continuam no mecanismo próprio da ficha.


## Implementação dos editores — Biblioteca universal

- `scripts/core/logic-schemas.js` registra validadores estruturais para Propriedades, Regras, Comportamentos, Fluxos e Funções.
- O parser seguro do Core valida expressões; regras aceitam resultados booleanos, numéricos ou textuais conforme o tipo declarado.
- `LogicRegistry.validateAsset()` permite validar rascunhos sem registrar ou persistir o ativo. O salvamento valida antes de gravar.
- `scripts/library/logic-editors.js` fornece editores especializados para os cinco subtipos. Fluxos possuem construtor visual declarativo para gatilhos, condições e ações, preservando IDs e payloads JSON; a configuração específica de cada executor continua em JSON. Funções editam assinatura/referência, nunca código executável.
- O Inspector da janela independente integra esses editores e preserva o contrato de provedores.
- Limitação restante: um construtor visual avançado de nós/ações e executores padrão do Core ainda exigem contratos específicos e testes ponta a ponta. Tipos de ação/função desconhecidos permanecem inertes até que um módulo confiável registre a implementação.


## Grafo visual de Fluxos — núcleo inicial

O payload de Fluxo aceita, opcionalmente, `graph`, mantendo o formato sequencial legado (`triggers`, `conditions`, `actions`) válido para ativos existentes. Quando `graph` está presente, o runtime usa o grafo como caminho de execução; os campos sequenciais permanecem preservados para compatibilidade, mas não são executados em paralelo.

Contrato inicial:

- `entryNodeId` identifica o único nó `start`.
- `nodes` aceita até 64 nós dos tipos `start`, `condition`, `action` e `end`.
- `edges` aceita até 128 conexões com origem, destino e saída `next`, `true` ou `false`.
- Nós `condition` exigem exatamente uma saída `true` e uma `false`; nós `start` e `action` exigem uma saída `next`; nós `end` não possuem saídas.
- Todos os nós devem ser alcançáveis, referências precisam existir e ciclos são rejeitados.
- Nós `action` guardam um executor registrado e configuração declarativa inerte; as permissões do executor e do ativo continuam obrigatórias.

`runFlow()` percorre somente o caminho selecionado pelas condições, executando ações encontradas no caminho. `simulateFlow()` percorre o mesmo caminho, informa nós visitados, ações disponíveis e permissões, sem chamar executores. O percurso possui limite de 128 nós por execução.

**Estado da interface:** o Inspector de Fluxos oferece um canvas com nós posicionáveis por arrastar e soltar, conectores SVG, organização automática por camadas, conexões configuráveis e campos específicos para condições e ações. As coordenadas são metadados visuais limitados e não alteram o runtime. O editor mantém o modelo de conexões explícitas e valida o grafo antes de salvar ou simular. A interface ainda precisa de validação real em Foundry VTT 14 build 360 e de melhorias posteriores de acessibilidade, zoom/visão geral e ligação direta por portas.
