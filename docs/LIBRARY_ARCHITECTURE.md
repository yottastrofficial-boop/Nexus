## Refinamento visual da Biblioteca — 1.0.0.146

A camada visual complementar deve ser carregada após o Design System: `nexus-universal-library.css` é a última folha de estilos declarada no manifesto do sistema. Isso evita que regras-base antigas sobrescrevam a grade e o Inspector. A grade não renderiza estrelas de favoritos; o estado e a ação permanecem disponíveis no Inspector, sem controles sobrepostos nos cartões. Miniaturas usam dimensões quadradas de 32, 64 ou 128 px, com linhas reservadas para imagem, nome e etiqueta. A amostra de tema no Inspector é quadrada e demonstra os elementos HTML comuns do perfil usando tokens validados, tipografia de corpo e display separadas e sem executar conteúdo importado.

## Biblioteca de temas curada — 1.0.0.144

A coleção de temas-base é composta por doze presets categorizados por etiquetas: Padrão, sete cores e quatro estilos. A coleção usa IDs estáveis e metadados de tema; os temas antigos continuam disponíveis como tokens de compatibilidade, mas não são listados como presets novos. O filtro de etiquetas é resolvido pelo índice do Universal Library Resource Registry, em conjunto com os demais filtros.

A aplicação de um tema-base resolve um perfil visual completo e utiliza o adaptador de aplicação já existente, respeitando os escopos de campanha/usuário e as permissões do Design System. Perfis pessoais preservam etiquetas ao salvar e duplicar. A camada visual permanece separada das mecânicas e do formato dos componentes.

# Arquitetura da Biblioteca NEXUS

## Princípio

A Biblioteca é um subsistema do NEXUS, não uma extensão interna da ficha. A ficha pode solicitar recursos e executar ações compatíveis com seu domínio, mas não controla catálogo, persistência, preferências ou descoberta de documentos Foundry.

A separação é por responsabilidade e ciclo de vida, não por quantidade de arquivos. Módulos só devem ser extraídos quando possuírem contrato próprio, puderem ser carregados independentemente, tiverem dependências distintas ou forem reutilizados por mais de um consumidor.

## Camadas e responsabilidades

| Camada | Responsabilidade | Não deve assumir |
|---|---|---|
| `scripts/core/library-resource-registry.js` | Contratos de provedores, busca, filtros, paginação, resolução e ações contextuais | DOM, ficha, apresentação ou execução de conteúdo arbitrário |
| `scripts/core/component-types.js` | Registro de tipos de componentes compartilhado por ficha, Biblioteca e validação de transferências | Dependências de interface ou DOM |
| `scripts/core/library-store.js` | Persistência e validação das definições pessoais NEXUS | Documentos Foundry ou preferências visuais |
| `scripts/core/library-preferences.js` | Pastas, favoritos, recentes, coleções universais e atribuições | Alterar definições ou documentos de origem |
| `scripts/core/logic-schemas.js` | Validadores inertes dos cinco tipos de Lógica, usando o parser seguro do Core | Executar código ou registrar executores arbitrários |
| `scripts/library/logic-editors.js` | Campos especializados para editar payloads de Lógica no Inspector | Executar payloads ou controlar persistência diretamente |
| `scripts/library/catalog-explorer.js` | Cartões, seleção, Inspector, ações contextuais e organização por referência | Conhecer Actor, Canvas, templates de ficha ou regras de aplicação |
| `scripts/library/library-application.js` | Ciclo de vida da janela ApplicationV2, navegação e controles da Biblioteca independente | Implementar provedores, persistência ou schemas de conteúdo |
| `scripts/library/library-backup-service.js` | Composição, validação, prévia, mesclagem e exportação de backups completos | Interface de ficha ou execução de dados importados |
| `scripts/core/library-transfer-registry.js` | Contratos de adaptadores de origem/destino, validação de payload inerte, prévia e confirmação explícita | Conhecer formatos externos não implementados ou persistir por conta própria |
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
- `backup.exportCode()`, `backup.prepareImport(source)` e `backup.commitImport(plan)`: exportação, prévia validada e confirmação do backup NEXUS.
- `registerSourceAdapter(adapter)` e `registerDestinationAdapter(adapter)`: registro de adaptadores confiáveis de transferência.
- `prepareTransfer(options)`, `commitTransfer(planId)` e `discardTransfer(planId)`: pipeline genérico origem → validação → prévia do destino → confirmação explícita.
- `getTransferAdapters()`: lista adaptadores disponíveis nesta sessão.

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

## Inspector e prévias por família

O Inspector resolve o recurso selecionado sob demanda e apresenta uma prévia específica quando existe um formato seguro e verificável:

- Perfis de aparência usam a prévia isolada do Design System; não aplicam o tema à interface. Os cards exibem uma paleta compacta derivada apenas de cores hexadecimais reconhecidas.
- Componentes e assets usam prévias visuais tipadas quando o formato é reconhecido (por exemplo, barras de recurso, campos, tabelas e imagens). As prévias são demonstrativas e não executam HTML, CSS, JavaScript ou payloads importados.
- Composições, layouts/modelos, estilos e definições de Lógica apresentam metadados estruturais. Payloads de Lógica continuam inertes e nunca são executados pela prévia.
- Paletas de tema exibem somente cores hexadecimais reconhecidas; a prévia não aplica o tema à interface.
- Imagens usam apenas origens HTTP(S) sem credenciais ou caminhos relativos seguros e formatos de imagem nativamente reconhecidos. SVG, esquemas `data:`, protocolos executáveis, caminhos de travessia e formatos desconhecidos não são tratados como imagens.
- Áudio e vídeo usam controles nativos do navegador com pré-carregamento desativado; isso não implica conversão nem suporte a codecs que o ambiente não decodifique.
- Documentos Foundry exibem metadados leves e oferecem a ação de abrir a ficha nativa. A resolução revalida permissões do usuário e do compêndio.

Os identificadores de tipo do filtro devem corresponder às chaves de `FoundryDocumentBridge.types`; por exemplo, RollTables usa a chave interna `tables`. A interface pode exibir rótulos mais amigáveis sem alterar o contrato do provedor.

## Persistência e identidade

- Definições pessoais ficam no armazenamento canônico do usuário; flags antigas são espelhadas durante compatibilidade.
- Pastas, favoritos e recentes armazenam referências estáveis, não cópias de documentos.
- Chaves antigas como `components:<id>` continuam resolvíveis; documentos Foundry usam `foundry-documents:<uuid>`.
- Pastas globais podem organizar recursos de provedores diferentes; pastas vinculadas a uma coleção respeitam seu escopo.
- Preferências usam `schemaVersion: 3`. Pastas têm `parentId`, suportam subpastas e podem ser movidas por arrastar e soltar; a migração preserva pastas antigas como raiz e repara ciclos/referências inválidas.
- Excluir uma pasta remove também suas subpastas e limpa apenas as atribuições de pasta; os recursos originais permanecem intactos.
- A barra de pesquisa usa uma única superfície; filtros secundários ficam recolhidos em popover compacto. Cards compartilham uma área de miniatura de dimensões uniformes; recursos pessoais podem guardar miniatura por URL HTTP(S) ou caminho relativo seguro. Favoritos usam controle de ícone sem painel decorativo.
- Coleções universais são agrupamentos curados independentes de pastas; podem conter referências de qualquer provedor e tipo, sem duplicar os recursos.
- Documentos Foundry não são duplicados. O UUID é resolvido pelo bridge e as permissões nativas continuam válidas.
- A importação de backup preserva escopos: fluxos pessoais permanecem pessoais e fluxos do mundo permanecem no setting do mundo.

## Definições e instâncias de componentes

Definições reutilizáveis ficam na Biblioteca; instâncias ficam nos layouts dos Actors e mantêm `libraryDefinitionId` e `libraryDefinitionVersion`. O histórico de versões pertence à definição, evitando copiar um snapshot completo para cada instância. Overrides locais são calculados contra a versão de origem.

Ao publicar uma nova versão a partir de uma instância vinculada, o NEXUS preserva a versão anterior no histórico, atualiza a instância usada como origem e deixa as demais independentes. O Inspector pode mostrar quantas instâncias do Actor atual têm atualização disponível. A atualização é explícita, preserva overrides e posição, e permite selecionar somente instâncias compatíveis. Instâncias antigas sem histórico suficiente são marcadas para revisão manual, não atualizadas automaticamente.

## Importação e exportação

O backup completo da Biblioteca inclui componentes, grupos, layouts, assets, temas, templates, mídia, estilos, propriedades, regras, comportamentos, fluxos e funções. A exportação é feita pelo serviço da Biblioteca, inicializado no núcleo com o registro de tipos compartilhado, não pela ficha.

A importação passa por:
1. leitura e validação do formato;
2. prévia de itens novos e conflitos;
3. confirmação explícita;
4. mesclagem sem sobrescrita automática;
5. espelhamento de flags legadas e aviso de falhas parciais.

Conteúdo importado permanece dado inerte. HTML, CSS, JavaScript, macros ou comportamentos não são executados durante a importação. A importação de backup NEXUS permanece disponível e separada. `library-transfer-registry.js` define o contrato extensível para fontes externas e destinos especializados: a origem converte seu formato em itens tipados com dados JSON; o destino declara compatibilidade, produz uma prévia e só persiste após `commitTransfer()`. O registro limita quantidade, profundidade e tamanho do pacote, rejeita valores não JSON e impede reutilização da mesma prévia após confirmação. Adaptadores concretos para formatos externos e destinos Foundry ainda precisam ser implementados e testados; nenhum formato externo é presumido.

## Regras de desempenho

- Não carregar payloads completos durante a busca.
- Não percorrer todos os compêndios automaticamente; o usuário seleciona explicitamente os pacotes no filtro e o bridge ainda valida a visibilidade/permissão antes de indexar.
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

A integração atual possui catálogo universal, ações contextuais para recursos pessoais NEXUS, abertura de documentos Foundry, pastas hierárquicas, favoritos/recentes, coleções mistas por referência, filtros por categoria/tipo/origem/etiqueta, janela independente e backup completo com prévia.

O Design System global é carregado depois das folhas legadas e cobre as aplicações NEXUS e superfícies nativas suportadas do Foundry (diretórios, abas laterais, controles de cena, menus e campos). Janelas de módulos de terceiros não são forçadas a usar o tema NEXUS, preservando a compatibilidade. Os trilhos flutuantes da ficha são descendentes da própria ApplicationV2, portanto acompanham o empilhamento nativo da janela em vez de manter uma camada global separada.

O padrão de dimensões de componentes usa múltiplos de 10 px. Dimensões de layouts salvos são normalizadas ao serem carregadas/salvas; novos recursos e redimensionamentos devem respeitar essa unidade.

Ainda não estão concluídos:
- construtor visual avançado de Fluxos e simulação de ações; os editores estruturados iniciais para os cinco tipos já existem;
- ações de aplicação para todos os destinos e tipos;
- adaptadores de importação de fontes externas e destinos como compêndios/fichas;
- edição de documentos Foundry por meio de metadados da Biblioteca (documentos continuam sob suas próprias fichas);
- testes funcionais em uma instalação real do Foundry VTT 14 build 360.

A separação de responsabilidades não elimina a necessidade de validar UI, persistência, permissões, ciclo de vida e compatibilidade no Foundry real.


## Preparação para fontes estruturadas externas

A integração futura de catálogos de conteúdo e assistentes de criação de personagem deve usar `library-transfer-registry.js`, sem acoplar a janela da Biblioteca a um provedor específico. Cada origem deverá converter os dados para registros JSON tipados e versionados; o Core valida limites e schemas; o destino declara compatibilidade e produz uma prévia antes da confirmação explícita. A interface de criação de personagem deverá permanecer um fluxo próprio, consumindo dados da Biblioteca por adaptadores, em vez de misturar fichas de personagem, assets visuais e documentos Foundry em uma única coleção. Adaptadores concretos e schemas de personagem ainda não estão implementados.


## Organização de arquivos e configurações pequenas — 1.0.0.132

A pasta exibida na Biblioteca é uma **pasta lógica de organização**. Recortar/colar um recurso, inclusive uma música registrada na coleção de mídia, altera sua atribuição em `library-preferences`; não renomeia nem desloca o arquivo original no armazenamento do Foundry. Isso mantém URLs e referências já utilizadas por fichas, cenas e playlists estáveis.

O FilePicker público do Foundry V14 oferece navegação, criação de diretórios e upload, mas não expõe uma operação pública de mover/excluir arquivo. Portanto, o NEXUS não deve simular uma movimentação física com download, reupload e exclusão presumida. Uma futura movimentação física exige um adaptador de armazenamento no servidor que declare explicitamente a capacidade, valide permissões e colisões de nome, atualize referências e ofereça falha/rollback seguros. Até existir esse backend, a ação **Mover para pasta** organiza o recurso dentro da Biblioteca sem alterar o caminho físico.

Configurações pequenas não devem gerar um arquivo físico por ajuste. O armazenamento canônico `libraryStore` já persiste coleções JSON versionadas em uma única flag do usuário, com validação de dados, limites e gravações serializadas. Configurações pertencentes a um domínio devem ficar embutidas no registro correspondente (por exemplo, tokens de um tema em `themes`, regras em `rules`, ou um modelo em `templates`). Quando vários presets pequenos precisarem ser transportados, o backup/exportação da Biblioteca os agrupa em um JSON validado. Isso evita milhares de arquivos minúsculos, reduz operações de filesystem e preserva a possibilidade de versionar/migrar schemas. Não guardar blobs de mídia nessa camada: arquivos binários continuam no storage compartilhado; IndexedDB continua sendo apenas cache local.


## Cartões e prévias do catálogo — 1.0.0.133

A visualização em grade é isolada da folha legada: o contêiner universal não reutiliza a classe antiga de assets. As colunas usam preenchimento adaptativo da largura disponível, sem impor uma largura máxima fixa aos cartões. O seletor Pequeno/Médio/Grande controla a dimensão **de exibição** da área de prévia (32/64/128 CSS px), não a resolução nem as dimensões do arquivo original. Imagens maiores são reduzidas proporcionalmente com `object-fit: contain`; não são esticadas nem recortadas. Quando não há miniatura, o catálogo apresenta um ícone representativo do recurso.

O Grid mostra miniatura e nome; metadados de categoria/tipo pertencem à Lista e aos filtros, nunca aos cartões em grade. Pastas são elementos de navegação e não recebem categoria/tipo nem entram nas facetas de recursos. Favoritos ficam sobrepostos no canto superior direito do cartão. A prévia de fonte usa “Aa” no cartão e, no Inspector, “Aa” seguido apenas de “Lorem ipsum dolor sit amet.”.
