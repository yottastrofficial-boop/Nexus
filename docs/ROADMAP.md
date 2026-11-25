# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit de referência: `HEAD da main`
- Distribuição: o manifesto original é a fonte única de instalação/atualização e só avança após CI, publicação e confirmação do asset.
- Versão de código proposta para integração: `1.0.0.101`.
- Manifesto estável permanece em `1.0.0.100` até validação visual/funcional no Foundry 14 build 360 e publicação confirmada.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A publicação da 1.0.0.98 concluiu CI (37/37 arquivos de teste), geração do pacote e confirmação do asset; a validação funcional no Foundry real permanece pendente.
- Alvo: Foundry VTT 14, build 360.
- Estado: projeto em desenvolvimento pós-release; CI automatizado por commit; a validação funcional/visual no Foundry real permanece pendente.

## Atualização proposta 1.0.0.101

Refina a distribuição do Estúdio de Aparência, inclui catálogo de elementos com prévias individuais, restaura o tratamento tipográfico de ícones e corrige molduras redundantes nos diretórios Foundry. O CI automatizado passou; a validação visual/funcional no Foundry 14 build 360 ainda é necessária.

## Atualização integrada 1.0.0.100

A atualização integrada concentra a estabilização visual, o tema Foundry VTT, as categorias de estilo, a tipografia de dados e o acesso à Biblioteca. O CI passou; a validação visual/funcional no Foundry 14 build 360 ainda é necessária antes da publicação estável.

## Estado atual por domínio

### Ficha e Canvas

- A ficha Canvas e os componentes configuráveis estão implementados.
- A navegação de ferramentas usa trilhos flutuantes externos e painéis independentes ApplicationV2; a ficha não mantém um menu lateral permanente durante a edição. O acesso à Biblioteca Universal permanece integrado à ficha.
- Grupos possuem hierarquia e composição estrutural; não são apenas decoração CSS.
- A classe principal da ficha e alguns controladores ainda concentram muitas responsabilidades.
- A refatoração deve mapear dependências, leitores/escritores e eventos antes de extrair ou remover código.

### Biblioteca

- Existe armazenamento unificado com coleções, preferências, backups e compatibilidade de leitura legada.
- A interface Explorer possui navegação universal, visão de todos os itens salvos, favoritos, recentes, pastas livres, filtros de etiquetas dinâmicos, cartões padronizados, grade/lista e Inspector contextual.\n- O Inspector permite editar metadados, organizar por pastas, duplicar e excluir itens salvos; exclusão de ativos lógicos com dependentes é bloqueada.\n- A visão universal é agregadora; ações específicas de inserção/aplicação continuam disponíveis nas áreas especializadas correspondentes.
- Definições reutilizáveis e instâncias inseridas na ficha devem continuar isoladas.
- Editores especializados completos para todos os tipos e aplicação direta de qualquer tipo a partir da visão universal ainda não estão concluídos; a validação visual/funcional no Foundry real permanece pendente.
- Pastas, favoritos, recentes, metadados e operações de duplicação/exclusão/importação exigem testes de persistência em cenário real.

### Lógica

- A infraestrutura possui registry tipado, dependências, detecção de ciclos, persistência e runtime declarativo.
- Os cinco tipos permanecem distintos: Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões.
- Schemas estruturais e editores especializados dos cinco tipos estão integrados ao Inspector; Fluxos possuem construtor visual inicial e simulação sem execução de ações. Eventos de ciclo de vida do Foundry estão conectados ao runtime, com execução no GM ativo e executor inicial `nexus.actor.update` protegido pelas permissões do usuário originador. O núcleo inicial de grafo opcional para Fluxos (nós start/condition/action/end, conexões next/true/false, validação de ciclos/alcançabilidade, execução e simulação do caminho) está implementado e coberto por testes. O editor estruturado de nós/conexões e campos específicos já está integrado ao Inspector; arrastar/soltar e canvas com conectores gráficos, mais executores e testes ponta a ponta no cliente Foundry ainda estão pendentes.
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

## Biblioteca universal — integração incorporada à main (histórico das PRs #58–#61)

- **Origem da fundação (PRs #58–#60):** ciclo de vida em RAM, ponte UUID para documentos nativos, catálogo extensível e primeira integração do Explorer.
- **Consolidação (PR #61, integrada):** janela independente ApplicationV2, filtros por categoria/tipo/origem/etiqueta, favoritos/recentes/pastas/coleções mistas por referência, ações contextuais declaradas por provedores e backup completo com prévia e confirmação.
- **Estado atual:** esses serviços estão na `main`; as branches originais não devem ser usadas como base para novas integrações.
- **Próxima etapa:** validar a implementação atual no Foundry VTT 14 build 360 e concluir adaptadores externos/destinos especializados; não reabrir a cadeia antiga de PRs.
- **Importação integrada inspirada no Plutonium:** o backup interno da Biblioteca já possui validação/prévia/mesclagem e o Core agora define o registro de adaptadores de origem/destino com limites, validação de dados inertes, prévia e confirmação. Ainda faltam adaptadores concretos para formatos externos e destinos compatíveis (documentos Foundry, compêndios, fichas e coleções NEXUS). Não importar conteúdo sem direitos de uso nem executar payloads automaticamente.
- **Lógica:** o construtor visual inicial de Fluxos, os schemas e os editores estruturados já estão na `main`. Permanecem pendentes conectores gráficos, arrastar/soltar, mais executores confiáveis e testes ponta a ponta no Foundry, sem colapsar os cinco schemas.
- **Tema:** a integração do Design System está na `main` (PR #80), com perfis tipados, Estúdio ApplicationV2, prévia local, validação de contraste, importação/exportação versionada e persistência world/user. A integração visual nativa continua escopada por allowlist. Validação real no Foundry V14 build 360 e refinamento dos adaptadores nativos permanecem pendentes.
- **Preparação de sessão:** implementar manifesto de recursos, prioridades e reservas sobre o gerenciador de RAM; nunca pré-carregar conteúdo pesado no init.

A integração está na `main` e o CI está aprovado; ainda não está pronta para promoção funcional até concluir a revisão de compatibilidade e a validação real no Foundry VTT 14 build 360.

## Biblioteca de Aparências — integração inicial

- Perfis visuais completos reutilizam a coleção `themes` do `libraryStore`, identificados por `kind: "design-profile"`.
- O Estúdio oferece salvar rascunho, carregar, aplicar ao escopo atual, duplicar, renomear, excluir e exportar perfis salvos.
- A importação/exportação utiliza o envelope `NEXUS-DESIGN/2`, com leitura compatível de `NEXUS-DESIGN/1`; o backup universal preserva o objeto completo e mantém compatibilidade com temas legados que armazenam somente paletas.
- A coleção continua pessoal; o perfil ativo da campanha continua em configuração `world`. Aplicar um perfil ao mundo compartilha a aparência efetiva, não a biblioteca privada do usuário.
- Próximas evoluções: integração de preview e ação contextual no Inspector da Biblioteca, coleções compartilhadas de campanha somente após definir ownership/permissões e teste real de sincronização entre clientes.

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


## Inspector de Aparências — etapa de 2026-11-24

- Criado modelo de prévia para perfis completos da coleção `themes`, com paleta semântica, tipografia, layout, acessibilidade e diagnóstico de contraste.
- Inspector mostra uma amostra visual isolada e não altera o tema efetivo durante a seleção.
- Ações contextuais distinguem aplicação à campanha (GM + confirmação) e preferência pessoal (se permitida pelo mundo), ambas passando pelo serviço de Design System.
- O mesmo adaptador de aplicação é usado pela Biblioteca independente e pelo Inspector embutido na ficha.
- Perfis de schema futuro são preservados e ficam sem prévia interpretada ou ações destrutivas/aplicação.
- Testes automatizados cobrem normalização visual segura, schema futuro, ownership, confirmação da campanha e cancelamento sem gravação.
- Pendente: validar a apresentação em Foundry VTT 14 build 360 com diferentes dimensões de janela, GM e jogador; a prévia é representativa, não uma captura pixel-perfect de todas as aplicações.


## Design System global — build de teste 1.0.0.92

- O Design System foi integrado à `main`, com precedência explícita entre aparência padrão do sistema, perfil compartilhado da campanha e preferência pessoal.
- O Estúdio de Aparência ApplicationV2 oferece perfis versionados, prévia local, tokens semânticos, tipografia, layout, acessibilidade, diagnóstico de contraste e importação/exportação.
- A Biblioteca reutiliza a coleção canônica `themes`; não cria armazenamento paralelo nem grava aparência em Actor, Item, Token ou Scene.
- O Inspector apresenta prévia isolada e aplicação contextual explícita, respeitando permissões e confirmação para alterações compartilhadas.
- Testes automatizados e empacotamento são executados pelo CI; a inspeção real em Foundry VTT 14 build 360, com clientes GM e jogador, permanece pendente.
- A versão 1.0.0.92 é uma build para teste, não um checkpoint funcional confirmado.


## Refinamento da interface global — base de desenvolvimento 1.0.0.93

- O shell visual compartilhado agora marca todas as aplicações ApplicationV2 do próprio NEXUS, sem ampliar indiscriminadamente o tema para aplicações de módulos externos.
- A Biblioteca independente e o painel da ficha passam a consumir a paleta semântica ativa em cartões, filtros, navegação, controles e Inspector; a validação em diferentes tamanhos de janela ainda é necessária.
- Os controles nativos do Canvas são apresentados como grupos flutuantes, com estados de foco/seleção alinhados aos tokens NEXUS.
- O Chat recebe cartões unificados. Mídia enriquecida nativa (imagens, GIFs, vídeos, áudio, links e embeds) recebe limites responsivos e herda a paleta; a renderização continua sob as regras de enriquecimento/permissão do Foundry.
- Corrigida a precedência dos trilhos da ficha: um painel aberto, mas inativo, não pode mantê-los atrás; o painel ativo permanece no topo.
- Teste unitário cobre a precedência de camadas. Testes de empilhamento, foco, interação e aparência ainda devem ser executados no Foundry VTT 14 build 360.
