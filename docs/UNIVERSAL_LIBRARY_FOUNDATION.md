# NEXUS — Fundação da Biblioteca universal e gerenciamento de recursos

## Objetivo desta etapa

A Biblioteca deve localizar e organizar recursos próprios do NEXUS e documentos nativos do Foundry sem duplicar os documentos originais. A interface/menus funcionais serão construídos em uma etapa posterior sobre estes contratos.

## Documentos nativos do Foundry

O bridge integra Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards por UUID. A Biblioteca consulta metadados leves e pagina resultados; conteúdo completo só é resolvido quando uma ação específica precisa dele. Compêndios são consultados sob demanda por índice. O bridge não altera permissões, não copia documentos e não substitui as abas nativas do Foundry.

Favoritos, recentes, pastas e etiquetas podem referenciar documentos pela chave `documents:<uuid>` nas preferências do usuário. A referência não concede acesso: o Foundry continua responsável por permissões e disponibilidade do documento.

## Lógica e macros

Macros nativas permanecem documentos Foundry. Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões continuam como tipos próprios do NEXUS. A Biblioteca pode apresentá-los sob uma área de automações/lógica unificada, sem converter um tipo no outro ou executar payloads importados. Integração com menus e editores específicos será etapa posterior.

## RAM e ciclo de vida

O `ResourceLifecycleManager` administra apenas objetos transitórios residentes em memória: decoders, previews, buffers e adaptadores. Ele é independente do cache IndexedDB já existente em `media-storage.js`.

- `acquire()` carrega sob demanda e retorna uma referência que deve ser liberada.
- `preload()` prepara e reserva temporariamente um recurso para uma sessão; a reserva precisa ser liberada explicitamente.
- Recursos com referências ativas ou reservas não são descarregados.
- Limites de bytes são estimativas fornecidas pelo adaptador, não medição exata da RAM do navegador.
- Carregamentos concorrentes são deduplicados e limitados.
- Recursos ociosos são descarregados para respeitar o orçamento de memória.
- O serviço não controla memória de documentos que pertencem ao Foundry, do navegador ou de outros módulos.

## Integração visual do Foundry

A padronização visual será incremental e baseada em tokens CSS e wrappers ApplicationV2 do NEXUS. Interfaces próprias do NEXUS devem herdar tema e componentes comuns. Interfaces nativas como Combat Tracker e Sidebar podem receber uma camada de integração cuidadosamente escopada quando a API/estrutura pública permitir; não se deve reescrever DOM interno, aplicar CSS global destrutivo ou assumir controle de janelas de terceiros. A primeira implementação do tema global fica fora desta etapa de fundação.

## Limites deliberados

- Nenhum documento Foundry é duplicado no armazenamento da Biblioteca.
- Nenhum recurso pesado é pré-carregado na inicialização do sistema.
- O índice de compêndios só é solicitado quando explicitamente incluído na consulta.
- A RAM real não pode ser lida com precisão confiável; o orçamento é contábil e conservador.
- A UI da Biblioteca, menus contextuais, preparação de sessão e integração visual ampla permanecem etapas posteriores.
