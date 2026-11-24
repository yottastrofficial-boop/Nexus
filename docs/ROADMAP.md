# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit: `4555715099fc678b90e606809953d3b287b144f7` (HEAD da `main` verificado em 2026-11-23)
- Versão publicada: `1.0.0.91` (release e ZIP anexado em 2026-11-23)
- CI de publicação: execução `45153746614` aprovada
- Último checkpoint funcional confirmado no Foundry: `1.0.0.70`
- Alvo: Foundry VTT 14, build 360.
- Estado: 1.0.0.91 publicada e validada automaticamente; a etapa imediata é a validação funcional manual descrita em `docs/VALIDATION_CHECKLIST_1.0.0.91.md`.

## Estado atual por domínio

### Ficha e Canvas

- A ficha Canvas e os componentes configuráveis estão implementados.
- Grupos possuem hierarquia e composição estrutural; não são apenas decoração CSS.
- A classe principal da ficha e alguns controladores ainda concentram muitas responsabilidades.
- A refatoração deve mapear dependências, leitores/escritores e eventos antes de extrair ou remover código.

### Biblioteca

- Existe armazenamento unificado com coleções, preferências, backups e compatibilidade de leitura legada.
- A interface Explorer possui navegação universal, visão de todos os itens salvos, favoritos, recentes, pastas livres, filtros de etiquetas dinâmicos, cartões padronizados, grade/lista e Inspector contextual.
- O Inspector permite editar metadados, organizar por pastas, duplicar e excluir itens salvos; exclusão de ativos lógicos com dependentes é bloqueada.
- A visão universal é agregadora; ações específicas de inserção/aplicação continuam disponíveis nas áreas especializadas correspondentes.
- Definições reutilizáveis e instâncias inseridas na ficha devem continuar isoladas.
- Os editores especializados iniciais de Lógica estão integrados ao Inspector da Biblioteca; ações de aplicação continuam dependentes dos provedores e do contexto compatível. A validação visual/funcional no Foundry real permanece pendente.
- Pastas, favoritos, recentes, metadados e operações de duplicação/exclusão/importação exigem testes de persistência em cenário real.

### Lógica

- A infraestrutura possui registry tipado, dependências, detecção de ciclos, persistência e runtime declarativo.
- Os cinco tipos permanecem distintos: Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões.
- Schemas estruturais e editores especializados dos cinco tipos estão integrados ao Inspector; Fluxos possuem editor sequencial, construtor de grafo e simulação sem execução de ações. Eventos de ciclo de vida do Foundry estão conectados ao runtime, com execução no GM ativo e executores iniciais `nexus.actor.update` e `nexus.actor.adjust` protegidos pelas permissões do usuário originador. O grafo opcional (nós start/condition/action/end, conexões next/true/false, validação de ciclos/alcançabilidade, execução e simulação do caminho) e o editor com nós arrastáveis/conectores SVG estão cobertos por testes automatizados. Ainda faltam validação ponta a ponta no cliente Foundry, refinamentos de zoom/visão geral e novos executores confiáveis.
- Payloads lógicos importados devem permanecer inertes até serem validados por um editor e contrato específico.

### Mídia

- Existe registry de formatos, serviço de capabilities, pipeline, contrato de Workers, adaptador de upload Foundry e cache IndexedDB.
- A infraestrutura não inclui, por si só, decodificadores WASM especializados.
- FFmpeg/libdav1d/libopus/libjxl, conversão efetiva e backend externo compartilhado continuam pendentes de implementação, licença, hash, distribuição e teste.
- Não declarar suporte a AV1/JXL apenas pela extensão ou pelo contêiner.

### Persistência e migrações

- Migrações explícitas e idempotentes são a regra.
- Mudanças de schema devem preservar dados desconhecidos e proteger Actors com schema futuro.
- A fila de gravações local ao cliente não equivale a transação distribuída entre usuários diferentes.
- Cenários concorrentes precisam ser testados no Foundry real.

## Prioridades aprovadas

1. **Estabilidade funcional:** reproduzir erros reportados, validar abertura/fechamento de fichas, edição, salvamento, múltiplas janelas, tokens, Biblioteca e migrações no Foundry VTT 14 build 360.
2. **Auditoria de persistência:** mapear todos os leitores e escritores de Actor, Item, layouts, Biblioteca, aliases e flags legadas antes de alterar contratos.
3. **Biblioteca:** validar CRUD, persistência, pastas, filtros, backups, importação/exportação e isolamento definição/instância.
4. **Lógica:** concluir schemas, validadores e editores específicos; integrar executores e permissões com testes de ponta a ponta.
5. **Refatoração da ficha:** extrair responsabilidades por domínio, mantendo contratos explícitos e testes de regressão; evitar reescrita integral.
6. **CSS e templates:** mapear seletores e ordem da cascata; remover duplicações somente após comparação visual e testes.
7. **Mídia:** implementar adaptadores especializados somente com inventário verificável de codecs, licenças, hashes, fallback e limites de armazenamento.
8. **Higiene do repositório:** reconciliar branches divergentes, documentar decisões e arquivar linhas antigas sem apagar histórico útil.
9. **Documentação:** manter README, arquitetura, roadmap, changelog e política de release coerentes com o código e com o pacote publicado.

## Biblioteca universal — integração publicada na 1.0.0.91

- **PR #58 / `feature/universal-library-resource-foundation-2026-11-23`:** ciclo de vida em RAM e ponte UUID para documentos nativos do Foundry.
- **PR #59 / `feature/universal-library-catalog-2026-11-23`:** catálogo de recursos com provedores para coleções NEXUS, os cinco tipos de Lógica e documentos Foundry; paginação por provedor, metadados leves e resolução sob demanda.
- **PR #60 / `feature/library-explorer-catalog-integration-2026-11-23`:** primeira integração do Explorer existente com o catálogo universal.
- **Branch de conclusão / `feature/library-universal-completion-2026-11-23`:** janela independente ApplicationV2, filtros por categoria/tipo/origem/etiqueta, favoritos/recentes/pastas/coleções mistas por referência, ações contextuais declaradas por provedores e backup completo com prévia e confirmação.
- **Estado:** a cadeia foi consolidada na `main`, a CI de publicação `45153746614` passou e o ZIP foi anexado à release `v1.0.0.91`.
- **Próxima etapa imediata:** executar o roteiro de validação manual em `docs/VALIDATION_CHECKLIST_1.0.0.91.md`. Não criar uma nova release nem declarar estabilidade funcional antes de registrar os resultados no Foundry VTT 14 build 360.
- **Importação integrada inspirada no Plutonium:** o backup interno da Biblioteca já possui validação/prévia/mesclagem e o Core agora define o registro de adaptadores de origem/destino com limites, validação de dados inertes, prévia e confirmação. Ainda faltam adaptadores concretos para formatos externos e destinos compatíveis (documentos Foundry, compêndios, fichas e coleções NEXUS). Não importar conteúdo sem direitos de uso nem executar payloads automaticamente.
- **Lógica:** evoluir o construtor visual de Fluxos (nós, ramificações e simulação), registrar executores confiáveis e integrar eventos e ações de aplicação para Propriedades, Regras, Comportamentos, Fluxos e Funções, sem colapsar seus schemas.
- **Tema:** estabelecer tokens e componentes visuais NEXUS para interfaces próprias; depois avaliar integrações escopadas com Sidebar, Combat Tracker e outras interfaces nativas sem sobrescrever DOM interno de terceiros.
- **Preparação de sessão:** implementar manifesto de recursos, prioridades e reservas sobre o gerenciador de RAM; nunca pré-carregar conteúdo pesado no init.

A etapa foi publicada como 1.0.0.91 e passou pela CI. A validação funcional no cliente Foundry 14 build 360 continua sendo um bloqueio para declarar estabilidade e iniciar uma nova etapa de mudanças estruturais.

## Critérios para concluir uma etapa

- Escopo pequeno e explícito.
- Arquivos e contratos afetados identificados.
- Testes de regressão para comportamento anterior e novo.
- Nenhuma alteração mecânica sem referência ao livro oficial correspondente.
- Migração idempotente quando houver mudança persistida.
- CI e pacote aprovados.
- Teste real no Foundry quando a mudança afetar interface, ciclo de vida, permissões, persistência ou APIs do Foundry.
- Limitações e cenários não testados registrados sem declarar sucesso antecipadamente.

## Não objetivos

- Não mesclar branches antigas em bloco.
- Não remover arquivos ou flags legadas antes de mapear consumidores.
- Não publicar uma versão como funcionalmente estável apenas porque o ZIP foi gerado.
- Não prometer suporte literal a qualquer formato de mídia.
- Não armazenar originais grandes em flags/JSON de Actor ou Item.
- Não converter originais silenciosamente.
- Não introduzir fórmulas mecânicas implícitas ou universais para todos os módulos.


## Biblioteca universal e editor de Fluxos — atualização de 2026-11-23

- O editor de Fluxos agora apresenta um canvas de nós arrastáveis com conectores SVG, organização automática por camadas e conexões editáveis.
- Coordenadas de layout são metadados limitados do editor; não participam da avaliação nem alteram os dados do Actor.
- O próximo refinamento visual deverá focar em ligação direta por portas, zoom/visão geral e testes em Foundry VTT 14 build 360. A movimentação dos nós já possui alternativas por teclado e controles direcionais.
- Permanecem pendentes os adaptadores externos concretos, ampliação dos executores confiáveis do Core e validação funcional no cliente Foundry.

- Refinamento do Flow Builder: inclusão de criação de nós pela barra superior, conexão guiada por seleção de origem/destino, prevenção de conexões incompatíveis/ciclos e campos dedicados para o executor Core de atualização de Actor.

- Executor Core genérico `nexus.actor.adjust` adicionado para incrementar/decrementar propriedades numéricas `system.*`, com limites opcionais e permissão OWNER, sem assumir que todo módulo usa PV/PM/PE.

- Flow Builder: Inspector dedicado ao nó selecionado e schemas visuais declarativos opcionais para executores, com validação pelo runtime e fallback JSON para módulos legados.

- Fluxos sequenciais e grafos agora compartilham os campos visuais dos schemas dos executores; o runtime expõe pré-validação para os editores e mensagens acessíveis por campo.
- Contrato público de `configSchema` documentado para módulos, incluindo tipos, limites, valores padrão, compatibilidade e preservação de dados sem schema.
