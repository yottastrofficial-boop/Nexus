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
- O armazenamento da Biblioteca passou ao schema 2, com coleções próprias para propriedades e funções. Backups da Biblioteca incluem essas coleções.

### Limitações restantes

- A interface ainda não apresenta Propriedades, Regras, Comportamentos, Fluxos e Funções em uma única área visual Lógica.
- Os schemas específicos de cada subtipo precisam ser registrados pelo Core ou por módulos; o registry fornece o contrato e a validação plugável.
- A execução de ações depende de executores registrados e de um verificador de permissões configurado pelo sistema/módulo.


## Implementação dos editores — Biblioteca universal

- `scripts/core/logic-schemas.js` registra validadores estruturais para Propriedades, Regras, Comportamentos, Fluxos e Funções.
- O parser seguro do Core valida expressões; regras aceitam resultados booleanos, numéricos ou textuais conforme o tipo declarado.
- `LogicRegistry.validateAsset()` permite validar rascunhos sem registrar ou persistir o ativo. O salvamento valida antes de gravar.
- `scripts/library/logic-editors.js` fornece editores especializados para os cinco subtipos. Fluxos possuem construtor visual declarativo para gatilhos, condições e ações, preservando IDs e payloads JSON; a configuração específica de cada executor continua em JSON. Funções editam assinatura/referência, nunca código executável.
- O Inspector da janela independente integra esses editores e preserva o contrato de provedores.
- Limitação restante: um construtor visual avançado de nós/ações e executores padrão do Core ainda exigem contratos específicos e testes ponta a ponta. Tipos de ação/função desconhecidos permanecem inertes até que um módulo confiável registre a implementação.
