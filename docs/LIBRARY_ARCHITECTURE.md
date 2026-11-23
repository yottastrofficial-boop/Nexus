# Arquitetura da Biblioteca NEXUS

## Princípio

A Biblioteca é um subsistema do NEXUS, não uma extensão interna da ficha. A ficha pode solicitar recursos e executar ações compatíveis com seu domínio, mas não controla catálogo, persistência, preferências ou descoberta de documentos Foundry.

A separação é por responsabilidade e ciclo de vida, não por quantidade de arquivos. Módulos só devem ser extraídos quando possuírem contrato próprio, puderem ser carregados independentemente, tiverem dependências distintas ou forem reutilizados por mais de um consumidor.

## Camadas e responsabilidades

| Camada | Responsabilidade | Não deve assumir |
|---|---|---|
| `scripts/core/library-resource-registry.js` | Contratos de provedores, busca, filtros, paginação, resolução e ações contextuais | DOM, ficha, apresentação ou execução de conteúdo arbitrário |
| `scripts/core/library-store.js` | Persistência e validação das definições pessoais NEXUS | Documentos Foundry ou preferências visuais |
| `scripts/core/library-preferences.js` | Pastas, favoritos, recentes e atribuições universais | Alterar definições ou documentos de origem |
| `scripts/library/catalog-explorer.js` | Cartões, seleção, Inspector, ações contextuais e organização por referência | Conhecer Actor, Canvas, templates de ficha ou regras de aplicação |
| `scripts/library/library-application.js` | Ciclo de vida da janela ApplicationV2, navegação e controles da Biblioteca independente | Implementar provedores, persistência ou schemas de conteúdo |
| `scripts/library/library-backup-service.js` | Composição, validação, prévia, mesclagem e exportação de backups completos | Interface de ficha ou execução de dados importados |
| `scripts/sheets/library-view.js` | Adaptador da Biblioteca no espaço de ferramentas da ficha; oferece destino para recursos aplicáveis | Ser a fonte de verdade do catálogo |
| `scripts/sheets/actor-sheet-*.js` | Consumir/aplicar recursos ao Actor e ao Canvas; fornecer adaptadores específicos | Gerenciar documentos de outros domínios |
| `scripts/nexus-v1.0.0.js` | Inicializar serviços leves e expor APIs públicas em `game.nexus` | Carregar listas, mídias ou payloads completos durante o init |

## Contratos públicos

A Biblioteca é exposta em `game.nexus.library`:

- `list(options)`: busca metadados com paginação independente por provedor. Aceita filtros de origem, categoria, tipo e etiquetas, além de referências estáveis para favoritos, recentes e pastas.
- `resolve(reference)`: resolve o conteúdo completo sob demanda.
- `getActions(reference, resource)`: consulta as ações contextuais oferecidas pelo provedor.
- `executeAction(actionId, reference, resource, params)`: executa somente uma ação previamente anunciada pelo provedor.
- `registerProvider(provider)`: registra fontes adicionais sem criar janela ou botão por módulo.
- `getProviders()`: informa os provedores registrados.
- `open()`: abre a janela independente ApplicationV2.
- `backup.exportCode()`, `backup.prepareImport(source)` e `backup.commitImport(plan)`: exportação, prévia validada e confirmação de importação.

Provedores devem fornecer identidade estável por recurso e suportar consultas por IDs quando o Explorer solicitar favoritos, recentes ou referências de pastas. Ações são declaradas pelo provedor; o registro não executa nomes de função ou scripts recebidos como dados.

## Provedores e origens

- `nexus-library`: definições pessoais, ativos padrão e coleções de Lógica do NEXUS.
- `foundry-documents`: Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards por UUID.
- Fluxos salvos no escopo do mundo são apresentados como recursos de origem `world`, sem migrar silenciosamente sua propriedade para o usuário.
- Provedores de módulos usam origem `module` por padrão; complementos podem declarar `addon`.

Macros continuam documentos Foundry. Propriedades, Regras, Comportamentos, Fluxos e Funções continuam tipos distintos do NEXUS. A visão universal unifica descoberta e organização, não seus schemas, editores ou executores.

## Fluxo de dados

1. O bootstrap cria o registro e os provedores sem buscar todos os documentos.
2. O Explorer solicita uma página de metadados.
3. Cada provedor pagina sua própria fonte; cursores são independentes.
4. A interface apresenta nome, tipo, origem, etiquetas, pasta e miniatura.
5. Ao selecionar um recurso, o Inspector chama `resolve(reference)`.
6. O Inspector consulta ações declaradas pelo provedor e apresenta apenas as compatíveis.
7. A ação final é encaminhada ao adaptador do domínio de destino. Inserir um componente no Canvas é responsabilidade da integração da ficha, não do registro universal.

## Persistência e identidade

- Definições pessoais ficam no armazenamento canônico do usuário; flags antigas são espelhadas durante compatibilidade.
- Pastas, favoritos e recentes armazenam referências estáveis, não cópias de documentos.
- Chaves antigas como `components:<id>` continuam resolvíveis; documentos Foundry usam `foundry-documents:<uuid>`.
- Pastas globais podem organizar recursos de provedores diferentes; pastas vinculadas a uma coleção respeitam seu escopo.
- Documentos Foundry não são duplicados. O UUID é resolvido pelo bridge e as permissões nativas continuam válidas.
- A importação de backup preserva escopos: fluxos pessoais permanecem pessoais e fluxos do mundo permanecem no setting do mundo.

## Importação e exportação

O backup completo da Biblioteca inclui componentes, grupos, layouts, assets, temas, templates, mídia, estilos, propriedades, regras, comportamentos, fluxos e funções. A exportação é feita pelo serviço da Biblioteca, não pela ficha.

A importação passa por:
1. leitura e validação do formato;
2. prévia de itens novos e conflitos;
3. confirmação explícita;
4. mesclagem sem sobrescrita automática;
5. espelhamento de flags legadas e aviso de falhas parciais.

Conteúdo importado permanece dado inerte. HTML, CSS, JavaScript, macros ou comportamentos não são executados durante a importação. A importação de backup é distinta de adaptadores externos no estilo Plutonium: fontes externas, formatos e destinos compatíveis ainda exigem adaptadores próprios, prévia e validação.

## Regras de desempenho

- Não carregar payloads completos durante a busca.
- Não percorrer todos os compêndios automaticamente; IDs de compêndios precisam ser selecionados explicitamente.
- Usar paginação independente por provedor e limitar páginas.
- Debounce de pesquisa para evitar varreduras a cada tecla.
- Reutilizar metadados leves por documento Foundry via cache fraco, invalidado pelos hooks de criação/atualização/exclusão; não reter documentos completos.
- Carregar miniaturas com lazy loading e aceitar apenas URLs HTTP(S) ou caminhos relativos; não aceitar esquemas de dados/executáveis.
- Não criar caches paralelos sem evidência de gargalo. Conteúdo completo permanece sob demanda.
- O Inspector só serializa dados técnicos quando o usuário expande essa seção.
- Recursos pesados de áudio/vídeo não são pré-carregados pela Biblioteca.
- Evitar dependência circular entre ficha e Biblioteca. A Biblioteca não importa classes ou templates da ficha.
- Não extrair funções minúsculas apenas para aumentar a quantidade de arquivos.

## Estado e limitações

A integração atual possui catálogo universal, ações contextuais para recursos pessoais NEXUS, abertura de documentos Foundry, pastas/favoritos/recentes por referência, filtros por categoria/tipo/origem/etiqueta, janela independente e backup completo com prévia.

Ainda não estão concluídos:
- editores especializados completos para todos os tipos de Lógica;
- ações de aplicação para todos os destinos e tipos;
- adaptadores de importação de fontes externas e destinos como compêndios/fichas;
- edição de documentos Foundry por meio de metadados da Biblioteca (documentos continuam sob suas próprias fichas);
- testes funcionais em uma instalação real do Foundry VTT 14 build 360.

A separação de responsabilidades não elimina a necessidade de validar UI, persistência, permissões, ciclo de vida e compatibilidade no Foundry real.
