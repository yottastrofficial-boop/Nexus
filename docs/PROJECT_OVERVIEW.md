## Estado do código — 1.0.0.133

A 1.0.0.133 atualiza a Biblioteca Universal com Grid adaptativo, prévias redimensionadas proporcionalmente para 32/64/128 CSS px, fallback por ícone, cartões Grid separados das linhas Lista, pastas fora das facetas, espécime tipográfico compacto e favoritos reposicionados. Os workflows de regressão, validação e empacotamento foram aprovados no PR #117; a release, o ZIP e o manifesto também foram confirmados. A release 1.0.0.133, o ZIP e o manifesto foram publicados e sincronizados. Validação visual/funcional no Foundry VTT 14 build 360 pendente.

## Estado do código — 1.0.0.129

A 1.0.0.129 refina a Biblioteca após a captura do usuário: pesquisa em uma única superfície, breadcrumb com ícone alinhado, linha de lista com miniatura e nome agrupados, colunas corretas, redimensionamento de colunas, classificação completa, listas de sugestões para categoria/etiqueta e prévias de fontes e temas. Temas são apresentados como Coleções visuais; somente o nome da pasta padrão é migrado, sem alterar dados personalizados. O pacote candidato é 1.0.0.129; o manifesto estável permanece em 1.0.0.128 até a publicação e confirmação do ZIP. A validação visual/funcional no Foundry VTT 14 build 360 continua pendente.

## Estado do código — 1.0.0.126

A branch main integra a nova experiência da Biblioteca em janela: abas independentes, histórico, breadcrumb, pesquisa junto ao caminho, barra de comandos e painéis redimensionáveis. A versão está sendo preparada como pacote Foundry 1.0.0.126; a versão estável do manifesto permanece 1.0.0.125 até a validação do pacote e a publicação da release. A validação visual/funcional no Foundry VTT 14 build 360 continua pendente.

## Bootstrap orientado a serviços — 1.0.0.125

A inicialização dos serviços centrais passou a usar factories e dependências explícitas no `game.nexus.services`. Os serviços de Design, Biblioteca, Mídia, Recursos, Documentos e Lógica são resolvidos em ordem sem inicialização assíncrona durante o hook `init`; as APIs públicas existentes foram preservadas. Esta é uma migração real do bootstrap para DI, mas não representa ainda a extração completa da ficha, listeners, CSS e templates.

## Revisão arquitetural — 1.0.0.124 em preparação

A revisão estática de ponta a ponta da base 1.0.0.123 identificou concentração de responsabilidades na ficha principal (≈260 KB), CSS legado (≈601 KB), listeners, Explorer da Biblioteca e validador de pacote. A base já possui registries, stores, schemas e adapters, por isso a refatoração está sendo feita por contratos, preservando IDs e dados.

Nesta etapa foram adicionados `game.nexus.services` (registro de serviços com dependências, resolução sob demanda, detecção de ciclos e encerramento), contratos compartilhados de eventos da Lógica e testes de integridade do grafo de imports. Isso é a fundação, não uma migração completa de todos os subsistemas para DI. A sequência e os riscos estão em [Revisão arquitetural](ARCHITECTURE_REVIEW_2026-11-26.md).

## Estado do código — 1.0.0.123

A atualização da Biblioteca em preparação para a main adiciona taxonomia inicial por domínio, tags para classificação de atores, árvore hierárquica expandível, operações contextuais, criação universal (pastas, assets, atalhos, layouts e componentes) e previews quadrados com seleção por borda. Pastas-base são metadados do usuário, inicializados uma única vez; não limitam tipos de recurso e não apagam documentos nativos. A estrutura de Itens não inclui itens mágicos; os elementos de cena usam nomes em português. A validação automatizada deve ser concluída pelo workflow e a validação visual/funcional continua pendente no Foundry VTT 14 build 360.

## Estado do código — 1.0.0.122

A revisão atual acrescenta pesquisa estruturada à Biblioteca, indexa metadados adicionais de compêndios sob demanda, emite arraste nativo Foundry por UUID, permite inserir componentes pessoais no Canvas por arraste e mantém a janela da ficha fixa em 800 × 836 px. A validação visual/funcional no Foundry VTT 14 build 360 permanece pendente.

## Estado do código — 1.0.0.122

A revisão atual corrige fluxos de diálogo e apresentação da Biblioteca, adiciona miniaturas personalizadas seguras e aumenta a altura inicial da ficha para 836 px. CI e pacote precisam passar; a validação funcional/visual no Foundry VTT 14 build 360 permanece pendente.

## Estado candidato 1.0.0.119
A revisão sobre a .118 restaura a geometria da sidebar nativa do Foundry V14, corrige os seletores dos botões de navegação, elimina a coluna fantasma do Canvas e limpa o alvo do Inspector ao remover a seleção. CI e avaliação manual no Foundry 14 build 360 são gates; a publicação não substitui o teste funcional.

## 1.0.0.118 — correções estruturais em validação

A versão 1.0.0.118 consolida a navegação da sidebar nativa, normalização e resolução do foco do Inspector, abertura singleton do Estúdio, layout do Canvas no modo play e ajuste da altura padrão da ficha. CI automatizado deve ser concluído antes da distribuição; a validação funcional e visual no Foundry VTT 14 build 360 permanece pendente até o teste manual.

# Visão do projeto NEXUS

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch de referência: `main`
- Commit de referência: `HEAD da main`
- Manifesto original: fonte única de instalação/atualização; o workflow só o sincroniza depois de validar e publicar o ZIP correspondente.
- Versão estável publicada na `main` e no manifesto: `1.0.0.118` (rails flutuantes e alvo do inspetor corrigidos; validação funcional no Foundry pendente).
- Última versão estável anterior: `1.0.0.115`.
- Última versão estável anterior: `1.0.0.107` (release, ZIP e manifesto confirmados antes da publicação da .108).
- Commits de manutenção posteriores à release: `08f521ca03a998f6fcc623e9e0193cc1ba7da247` (diagnóstico Playwright) e `34c114539e04e67151dbcf806283503e91c3cdf0` (isolamento tipográfico do sidebar e remoção de regras duplicadas).
- A candidata .114 remove a navegação horizontal customizada e devolve a orientação vertical ao Foundry. A versão .113 foi instalada e o usuário relatou que os slots flexíveis continuavam visualmente comprimidos; a opção horizontal foi descartada.
- O histórico das versões .106–.113 registra tentativas de correção e compactação da sidebar. A candidata .114 remove os overrides de geometria, em vez de continuar acumulando regras para imitar a navegação nativa.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A base 1.0.0.104 remove o override global de Font Awesome que quebrava ícones nativos; a versão .101 refinou o Estúdio de Aparência; a validação funcional no Foundry VTT 14 build 360 continua pendente.
- Compatibilidade declarada: Foundry VTT 14, build 360
- Estado: projeto em desenvolvimento; a 1.0.0.118 está publicada, mas a validação funcional completa no Foundry ainda precisa ser confirmada.

Este documento descreve a implementação observada no repositório e separa recursos presentes, infraestrutura parcial e objetivos futuros. Não substitui os livros oficiais do NEXUS RPG.

## Estado da 1.0.0.116 — navegação flutuante e compatibilidade de ícones

A versão .116 mantém a sidebar vertical nativa e move os botões de layout da ficha para um grupo flutuante independente do painel lateral, preservando o acesso à Biblioteca. Os fundos externos redundantes atrás da action bar/10 slots da Hotbar e da lista de jogadores são transparentes; os slots e as entradas de jogadores permanecem. O seletor de tipografia foi corrigido para que todas as exclusões de ícones sejam aplicadas ao próprio elemento, evitando que a fonte personalizável substitua a família nativa do Foundry/Font Awesome. CI, pacote e release foram confirmados com 43/43 testes; a validação visual no Foundry VTT 14 build 360 permanece pendente.

## O que é o NEXUS

NEXUS reúne duas frentes relacionadas, mas distintas:

1. **Sistema de RPG de mesa:** regras, módulos e suplementos que definem como o jogo funciona.
2. **Implementação para Foundry VTT:** software que armazena os dados, apresenta fichas, organiza componentes e oferece ferramentas de automação.

Os documentos mecânicos oficiais do NEXUS RPG são a autoridade para regras de mesa. O código do Foundry não deve inventar nem alterar fórmulas, custos, progressão ou outros procedimentos mecânicos. Quando houver divergência entre código e livro, a divergência deve ser registrada e resolvida como decisão de projeto.

## Direção arquitetural

A implementação deve manter separadas estas responsabilidades:

- **Dados:** valores e estruturas persistidas em Actors, Items e na Biblioteca.
- **Regras:** interpretação mecânica definida pelos livros ou por módulos específicos.
- **Propriedades:** caminhos, metadados, valores e expressões vinculadas aos dados.
- **Componentes:** unidades reutilizáveis de apresentação e interação.
- **Instâncias:** cópias inseridas em uma ficha, com identidade e configurações próprias.
- **Canvas:** organização visual, posicionamento, seleção, camadas e grupos estruturais.
- **Biblioteca:** catálogo e armazenamento de definições reutilizáveis.
- **Lógica:** Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões, com contratos especializados.
- **Mídia:** identificação, capacidade do ambiente, processamento e armazenamento, sem executar conteúdo importado.

A arquitetura é modular por contrato, não apenas por aparência. Um grupo precisa representar uma relação estrutural real; uma definição salva não pode ser alterada acidentalmente por uma instância; e mudanças visuais não devem modificar os dados mecânicos.

## Histórico da 1.0.0.112 — chat lateral adaptativo

A atualização .112 complementa a correção de largura da .111 com espaçamento adaptativo baseado na largura real do contêiner, mídia limitada à área da mensagem e rolagem interna de tabelas extensas. A atualização .111 corrige o chat lateral a partir do DOM enviado: a sidebar tem 540 px, mas o histórico e o formulário estavam limitados a 300 px. O histórico real é OL.chat-log, sem o ID #chat-log visado por regras antigas; a PR #99 ajusta os seletores reais, expande o histórico/controles/compositor e compacta os cartões. CI e contratos passaram; a validação visual no Foundry VTT 14 build 360 continua pendente. A correção .110 da navegação e a preservação dos ícones nativos permanecem incluídas. A atualização .105 corrige os seletores e o layout do sidebar na estrutura ApplicationV2, preservando os elementos e handlers nativos. A atualização .102 remove a regra que forçava a família e o peso de todos os ícones Font Awesome, devolvendo ao Foundry a escolha correta dos glifos. O CI, o empacotamento, a release e a sincronização do manifesto foram concluídos; a validação visual no cliente Foundry 14 build 360 continua pendente.

A árvore atual contém, entre outros:

- Inicialização e registro de fichas em `scripts/nexus-v1.0.0.js`.
- Manifestos para Foundry VTT 14 e tipos de Actor/Item em `system.json`.
- Ficha Canvas e controladores em `scripts/sheets/`.
- Serviços compartilhados em `scripts/core/`, incluindo fórmulas, propriedades, migrações, grupos, Biblioteca, Lógica e Mídia.
- Templates Handlebars em `templates/`, estilos em `styles/` e tradução pt-BR em `lang/`.
- Testes automatizados de regressão e validação do pacote em `tests/`.
- Documentação de contratos e decisões em `docs/`.

### Recursos e infraestrutura observados

- Ficha Canvas modular, com componentes configuráveis e dados vinculados ao Actor; o editor usa trilhos flutuantes e ferramentas em janelas ApplicationV2 independentes, com ciclo de vida associado à ficha.
- Tipos de Actor `player-character`, `npc` e `character`.
- Token de protótipo vinculado ao Actor por padrão, preservando a possibilidade de desvincular depois.
- Grupos hierárquicos e composição visual com modos de organização.
- Biblioteca Explorer com visão universal de itens salvos, favoritos, recentes, pastas livres, etiquetas dinâmicas, cartões unificados, Inspector e CRUD seguro; definições e instâncias permanecem isoladas. O botão da ficha abre a mesma Biblioteca Universal com contexto de inserção. Perfis visuais completos usam a coleção canônica de temas.
- Estúdio de Aparência com abas internas e prévia de painéis, containers, botões, tipografia, inputs, seletores, áreas de texto e rolagem; o Design System aplica a tipografia do perfil às superfícies de texto, preserva as fontes nativas dos ícones e unifica as superfícies do Chat.
- Separação entre definições reutilizáveis e instâncias inseridas nas fichas.
- Motor de expressões seguro, sem execução arbitrária de JavaScript.
- Infraestrutura tipada de Lógica, persistência e runtime declarativo.
- Infraestrutura de Mídia com capacidades nativas, pipeline, contrato de Workers, upload pelo Foundry e cache local.

A presença de uma infraestrutura não significa que todos os seus editores, adaptadores ou executores estejam conectados à interface.

## Fundação e integração da Biblioteca universal — consolidada na main

A fundação foi desenvolvida em etapas nas PRs `#58`, `#59` e `#60` e consolidada na `main` pela PR `#61`. As branches originais são referências históricas, não linhas ativas de implementação:

- `scripts/core/foundry-document-bridge.js` consulta Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards como referências UUID, com paginação e consulta opcional aos índices de compêndios.
- `scripts/core/resource-lifecycle.js` controla recursos transitórios em RAM por carregamento sob demanda, deduplicação de carregamentos, referências ativas, reservas de pré-carregamento, limite estimado e descarregamento de recursos ociosos.
- Os serviços são expostos em `game.nexus.documents` e `game.nexus.resources`; a inicialização não carrega listas, decoders ou mídia em massa.
- `scripts/core/library-resource-registry.js` agrega coleções pessoais NEXUS, ativos lógicos e documentos nativos por provedores extensíveis; `game.nexus.library` expõe `list`, `resolve`, `getActions`, `executeAction`, `registerProvider`, `getProviders` e `open`.
- A listagem constrói metadados leves, pagina cada provedor separadamente e resolve o conteúdo completo sob demanda. Módulos podem contribuir com conteúdo sem adicionar janelas ou botões independentes.
- Documentos nativos não são duplicados nem têm permissões contornadas. Macros continuam documentos Foundry; Propriedades, Regras, Comportamentos, Fluxos e Funções continuam tipos próprios do NEXUS.

A `main` contém `scripts/library/library-application.js` para a janela independente, `scripts/library/catalog-explorer.js` para a visão universal e `scripts/library/library-backup-service.js` para backup completo com prévia e importação confirmada. A Biblioteca oferece ações contextuais por provedor, filtros por origem/categoria/tipo/etiqueta, seleção explícita de compêndios visíveis, favoritos/recentes/pastas/coleções mistas por referência e metadados Foundry com cache invalidado por hooks. Ainda faltam adaptadores de importação de fontes externas e destinos especializados, editores completos de todos os tipos de Lógica e validação real no Foundry VTT 14 build 360. O fluxo inspirado no Plutonium está parcialmente atendido pelo backup; não se deve confundir backup com importação de fontes externas. Os limites de RAM são estimativas contábeis, não leitura exata do consumo do navegador.

## Limitações conhecidas e trabalho pendente

- A área Lógica já possui schemas e editores especializados integrados ao Inspector; o editor de Fluxos ainda é inicial, com conectores gráficos, arrastar/soltar, mais executores e testes ponta a ponta pendentes.
- O runtime não deve ser considerado um sistema de automação pronto enquanto os executores e permissões necessários não estiverem registrados e testados.
- Não há binários WASM FFmpeg/libjxl incluídos na base atual; decodificação especializada de AV1/JXL não deve ser anunciada como concluída.
- Nenhum backend externo de armazenamento compartilhado vem configurado por padrão.
- A classe principal da ficha e alguns controladores ainda são grandes e concentram responsabilidades; a extração deve ser incremental e guiada por dependências e testes.
- A validação automatizada e a geração do ZIP não substituem testes visuais e funcionais em uma instalação real do Foundry VTT 14 build 360.

## Integridade e compatibilidade de dados

- Identificadores internos e caminhos persistidos devem ser preservados sempre que possível.
- Mudanças de schema exigem versão explícita e migração idempotente.
- Migrações devem preservar dados desconhecidos, aliases, componentes, grupos e configurações não envolvidos na alteração.
- Uma versão antiga do sistema não pode rebaixar dados de Actor gravados por um schema mais novo.
- Valores zero, negativos e strings vazias precisam manter semântica distinta de dados ausentes.
- Fórmulas devem ser avaliadas pelo parser seguro e não por `eval` ou `Function`.
- Compatibilidade com flags legadas deve ser removida somente após mapear e testar todos os leitores e escritores.

## Fontes de referência

- **Regras de mesa:** livros e suplementos oficiais do NEXUS RPG.
- **Implementação:** branch `main` do repositório.
- **Arquitetura e contratos:** documentos em `docs/`.
- **Compatibilidade externa:** documentação oficial do Foundry VTT 14.

Em caso de divergência, registrar separadamente o que dizem os livros, o que especificam os documentos técnicos e o que o código efetivamente executa. Não presumir que uma proposta está implementada nem que uma implementação representa uma regra oficial.


## Design System e Inspector de Aparências — base 1.0.0.92

A `main` inclui o Design System global para Foundry VTT 14, com perfis versionados, tokens semânticos, temas de campanha e usuário, Estúdio de Aparência ApplicationV2 e prévia isolada de perfis no Inspector da Biblioteca. A aparência é aplicada por cliente e não é persistida em documentos de jogo. A aplicação à campanha exige permissão de GM e confirmação; a preferência pessoal respeita a política do mundo. A build 1.0.0.92 foi preparada para validação manual e não deve ser tratada como funcionalmente confirmada até a rodada em Foundry VTT 14 build 360.


## Refinamento de interface — base de desenvolvimento 1.0.0.93

A base expande o shell de aparência para todas as aplicações NEXUS ApplicationV2, mantendo aplicações de terceiros fora do escopo automático. Biblioteca independente e painel embutido passam a usar os tokens semânticos do Design System. Controles do Canvas, navegação, Hotbar e jogadores recebem apresentação de grupos flutuantes. Mensagens do Chat passam a usar cartões unificados, com mídia enriquecida nativa responsiva. A hierarquia dos trilhos flutuantes foi corrigida para que painéis inativos não cubram os controles da ficha. A implementação possui teste unitário de precedência de camadas, mas requer validação visual/funcional real no Foundry VTT 14 build 360.


## Revisão do sidebar após a 1.0.0.106

Commit de correção na `main`: `417acb4f663ba328e30f28db70ab976af0f18669`. A implementação separa os controles de navegação (`.item` dentro de `#sidebar-tabs`/ `.sidebar-tabs`) dos painéis de conteúdo (`.tab.sidebar-tab`), evitando aplicar dimensões de ícone aos painéis ApplicationV2. O layout da navegação é horizontal, permite quebra de linha e preserva a marcação e as fontes de ícones nativas. A validação será manual pelo usuário no Foundry VTT 14; não foi executado Playwright. A versão distribuída permanece `1.0.0.106` até o retorno do teste manual.


## Pacote 1.0.0.107 — validação manual do sidebar

A versão `1.0.0.107` foi publicada com CI e empacotamento aprovados, asset `nexus.zip` confirmado e manifesto sincronizado. O pacote destina-se ao teste manual no Foundry VTT 14 build 360: navegação horizontal, preservação dos ícones nativos, troca de abas e exibição dos painéis de conteúdo. A publicação não comprova funcionamento no cliente real; o último checkpoint funcional confirmado permanece `1.0.0.70` até o retorno do teste.


## Estado de interação centralizado — 1.0.0.120

A ficha delega seleção, grupo, alvo do Inspector e painel ativo a `sheet-interaction-state.js`. Accessors de compatibilidade mantêm fluxos legados conectados à mesma fonte. Janelas nativas de Configurações recebem escopo visual próprio e não herdam resets genéricos das aplicações NEXUS.


## Biblioteca e transferência nativa — 1.0.0.122

- A pesquisa aceita texto livre, frases, qualificadores e exclusões; consulta nome, subtipo, pasta, descrição e metadados indexados.
- O bridge pede campos adicionais por getIndex({ fields }), mantendo resultados leves e paginação. Documentos completos são resolvidos somente ao abrir/transferir.
- A lista respeita visibilidade e permissão OBSERVER; não consulta compêndios não selecionados.
- Cards Foundry emitem { type, uuid } no formato de arraste nativo. A criação/importação final permanece sob controle do handler do destino.
- Componentes pessoais salvos são inseridos no Canvas com posição convertida para coordenadas internas e snap opcional.
- A janela da ficha permanece fixa em 800 × 836 px; o Canvas mantém dimensões próprias.
- Ainda não existe adaptador de importação de fontes externas web nem mapeamento automático de conteúdos para propriedades mecânicas do NEXUS. Esse mapeamento depende dos schemas/regras oficiais e de confirmação do usuário.
