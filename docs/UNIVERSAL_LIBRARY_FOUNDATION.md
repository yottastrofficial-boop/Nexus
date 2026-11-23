# NEXUS — Fundação da Biblioteca universal e gerenciamento de recursos

## Objetivo desta etapa

A Biblioteca deve localizar e organizar recursos próprios do NEXUS e documentos nativos do Foundry sem duplicar os documentos originais. A interface/menus funcionais serão construídos em uma etapa posterior sobre estes contratos.

## Documentos nativos do Foundry

O bridge integra Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards por UUID. A Biblioteca consulta metadados leves e pagina resultados; conteúdo completo só é resolvido quando uma ação específica precisa dele. Compêndios são consultados sob demanda e apenas quando a consulta informa explicitamente os IDs dos pacotes; não há varredura automática de todos os compêndios. O bridge não altera permissões, não copia documentos e não substitui as abas nativas do Foundry.

Favoritos, recentes, pastas e etiquetas podem referenciar documentos pela chave `foundry-documents:<uuid>` nas preferências do usuário. A referência não concede acesso: o Foundry continua responsável por permissões e disponibilidade do documento.

## Lógica e macros

Macros nativas permanecem documentos Foundry. Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões continuam como tipos próprios do NEXUS. A Biblioteca pode apresentá-los sob uma área de automações/lógica unificada, sem converter um tipo no outro ou executar payloads importados. Integração com menus e editores específicos será etapa posterior.

## Catálogo universal de recursos

O `LibraryResourceRegistry` é a camada comum de descoberta para os provedores da Biblioteca. Cada provedor informa metadados leves e resolve o conteúdo completo somente quando solicitado.

Provedores iniciais:
- `nexus-library`: coleções pessoais do NEXUS, incluindo componentes, composições, layouts, modelos, mídia, temas, estilos e os cinco tipos de Lógica.
- `foundry-documents`: Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards, sempre por UUID e respeitando a disponibilidade/permissão nativa.

A API é exposta em `game.nexus.library`:
- `list(options)`: pesquisa e pagina metadados de vários provedores numa mesma consulta.
- `resolve(reference)`: obtém o objeto completo do provedor de origem, sob demanda.
- `registerProvider(provider)`: permite que módulos contribuam com recursos no mesmo catálogo, sem criar uma janela ou botão próprio.
- `getProviders()`: informa os provedores registrados.

O cursor é separado por provedor para que uma fonte grande não obrigue o catálogo a carregar todos os demais recursos. A listagem não clona payloads completos das coleções pessoais; constrói apenas cartões leves e mantém um índice de metadados por usuário. Gravações pelo armazenamento canônico emitem `nexusLibraryUpdated`, invalidando esse índice sem reter documentos ou payloads completos. Os cinco tipos de Lógica continuam distintos e as Macros continuam documentos nativos do Foundry.

### Referência de experiência: Plutonium

A inspiração é o fluxo integrado de descoberta e importação: encontrar conteúdo numa origem, visualizar seus dados, escolher um destino compatível e importar sem navegar por uma ferramenta independente para cada tipo. No NEXUS, isso deverá ser implementado por adaptadores de origem e ações/destinos tipados (por exemplo, documento Foundry, compêndio, ficha ou coleção NEXUS). O catálogo atual fornece a base de descoberta e resolução; importadores e destinos ainda não foram implementados.

Não haverá uma fileira de botões permanentes para áudio, imagens, cenas, macros e outros tipos. Eles serão recursos no mesmo catálogo; ações específicas aparecerão contextualmente no Inspector ou menu do item.

## RAM e ciclo de vida

O `ResourceLifecycleManager` administra apenas objetos transitórios residentes em memória: decoders, previews, buffers e adaptadores. Ele é independente do cache IndexedDB já existente em `media-storage.js`.

- `acquire()` carrega sob demanda e retorna uma referência que deve ser liberada.
- `preload()` prepara e reserva temporariamente um recurso para uma sessão; a reserva precisa ser liberada explicitamente.
- Recursos com referências ativas ou reservas não são descarregados.
- Limites de bytes são estimativas fornecidas pelo adaptador, não medição exata da RAM do navegador.
- Carregamentos concorrentes são deduplicados e limitados.
- Recursos ociosos são descarregados para respeitar o orçamento de memória.
- O pipeline de mídia usa o gerenciador para carregar e descarregar adaptadores/decoders; Workers podem informar uma estimativa própria de memória e são encerrados no unload.
- `resolve()` do pipeline retorna uma lease quando o gerenciador está ativo; o consumidor deve chamar `release()` ao terminar.
- O serviço não controla memória de documentos que pertencem ao Foundry, do navegador ou de outros módulos.

## Integração visual do Foundry

A padronização visual será incremental e baseada em tokens CSS e wrappers ApplicationV2 do NEXUS. Interfaces próprias do NEXUS devem herdar tema e componentes comuns. Interfaces nativas como Combat Tracker e Sidebar podem receber uma camada de integração cuidadosamente escopada quando a API/estrutura pública permitir; não se deve reescrever DOM interno, aplicar CSS global destrutivo ou assumir controle de janelas de terceiros. A primeira implementação do tema global fica fora desta etapa de fundação.

## Limites deliberados

- Nenhum documento Foundry é duplicado no armazenamento da Biblioteca.
- Nenhum recurso pesado é pré-carregado na inicialização do sistema.
- Índices de compêndios só são solicitados quando IDs específicos de pacotes são informados; não existe varredura automática de todos os compêndios.
- A RAM real não pode ser lida com precisão confiável; o orçamento é contábil e conservador.
- A UI da Biblioteca, menus contextuais, preparação de sessão e integração visual ampla permanecem etapas posteriores.
