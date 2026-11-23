# Visão do projeto NEXUS

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch de referência: `main`
- Commit de referência: `7f78e2c1e539e615f4d5772d1f05ba68a7d460ce`
- Versão publicada: `1.0.0.90` (Biblioteca Explorer unificada; validação funcional pendente))
- Compatibilidade declarada: Foundry VTT 14, build 360
- Estado: projeto em desenvolvimento; a publicação do pacote não equivale à validação funcional completa no Foundry.

Este documento descreve a implementação observada no repositório e separa recursos presentes, infraestrutura parcial e objetivos futuros. Não substitui os livros oficiais do NEXUS RPG.

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

## Implementação presente na linha 1.0.0.90 (release publicada; validação funcional pendente)

A árvore atual contém, entre outros:

- Inicialização e registro de fichas em `scripts/nexus-v1.0.0.js`.
- Manifestos para Foundry VTT 14 e tipos de Actor/Item em `system.json`.
- Ficha Canvas e controladores em `scripts/sheets/`.
- Serviços compartilhados em `scripts/core/`, incluindo fórmulas, propriedades, migrações, grupos, Biblioteca, Lógica e Mídia.
- Templates Handlebars em `templates/`, estilos em `styles/` e tradução pt-BR em `lang/`.
- Testes automatizados de regressão e validação do pacote em `tests/`.
- Documentação de contratos e decisões em `docs/`.

### Recursos e infraestrutura observados

- Ficha Canvas modular, com componentes configuráveis e dados vinculados ao Actor.
- Tipos de Actor `player-character`, `npc` e `character`.
- Token de protótipo vinculado ao Actor por padrão, preservando a possibilidade de desvincular depois.
- Grupos hierárquicos e composição visual com modos de organização.
- Biblioteca Explorer com visão universal de itens salvos, favoritos, recentes, pastas livres, etiquetas dinâmicas, cartões unificados, Inspector e CRUD seguro; definições e instâncias permanecem isoladas.
- Separação entre definições reutilizáveis e instâncias inseridas nas fichas.
- Motor de expressões seguro, sem execução arbitrária de JavaScript.
- Infraestrutura tipada de Lógica, persistência e runtime declarativo.
- Infraestrutura de Mídia com capacidades nativas, pipeline, contrato de Workers, upload pelo Foundry e cache local.

A presença de uma infraestrutura não significa que todos os seus editores, adaptadores ou executores estejam conectados à interface.

## Fundação e integração da Biblioteca universal — implementação em branches de trabalho

A branch `feature/universal-library-resource-foundation-2026-11-23` estabelece a base de RAM e referências Foundry; a branch `feature/universal-library-catalog-2026-11-23` conecta essas fontes ao catálogo universal; e a branch `feature/library-explorer-catalog-integration-2026-11-23` conecta a visão universal do Explorer ao catálogo, sem alterar a versão publicada 1.0.0.90:

- `scripts/core/foundry-document-bridge.js` consulta Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards como referências UUID, com paginação e consulta opcional aos índices de compêndios.
- `scripts/core/resource-lifecycle.js` controla recursos transitórios em RAM por carregamento sob demanda, deduplicação de carregamentos, referências ativas, reservas de pré-carregamento, limite estimado e descarregamento de recursos ociosos.
- Os serviços são expostos em `game.nexus.documents` e `game.nexus.resources`; a inicialização não carrega listas, decoders ou mídia em massa.
- `scripts/core/library-resource-registry.js` agrega coleções pessoais NEXUS, ativos lógicos e documentos nativos por provedores extensíveis; `game.nexus.library` expõe `list`, `resolve`, `registerProvider` e `getProviders`.
- A listagem constrói metadados leves, pagina cada provedor separadamente e resolve o conteúdo completo sob demanda. Módulos podem contribuir com conteúdo sem adicionar janelas ou botões independentes.
- Documentos nativos não são duplicados nem têm permissões contornadas. Macros continuam documentos Foundry; Propriedades, Regras, Comportamentos, Fluxos e Funções continuam tipos próprios do NEXUS.

A integração inicial do catálogo ao Explorer está na branch `feature/library-explorer-catalog-integration-2026-11-23`, com o módulo independente `scripts/library/catalog-explorer.js` e a especificação `docs/LIBRARY_ARCHITECTURE.md`. Ainda faltam adaptadores de importação/destino, menus contextuais completos e a camada de tema global. O padrão de importação inspirado no Plutonium (origem, prévia, validação e destino) está especificado, mas não implementado. Os limites de RAM são estimativas contábeis, não leitura exata do consumo do navegador. Testes automatizados e validação real no Foundry são necessários antes de promover a etapa.

## Limitações conhecidas e trabalho pendente

- A área Lógica ainda precisa de editores especializados completos para cada subtipo, com schemas, validação e integração de ponta a ponta.
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
