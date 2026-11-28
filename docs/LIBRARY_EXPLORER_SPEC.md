## Biblioteca visual — contrato v8 (1.0.0.146)

- O stylesheet da Biblioteca Universal é carregado depois do Design System. A camada complementar define os contratos finais e escopados da grade, cartões, miniaturas e Inspector; regras-base do Design System não podem sobrescrever esses contratos.
- A grade possui somente o controle de seleção do recurso. Favoritos são gerenciados pelo Inspector, sem estrelas sobrepostas ou controles residuais nos cartões.
- Miniaturas permanecem quadradas e oferecem exclusivamente 32 × 32, 64 × 64 e 128 × 128 px. O tamanho escolhido controla dimensões da imagem, ícone e espécime tipográfico; o cartão reserva linhas independentes para miniatura, nome e etiqueta.
- O nome tem largura limitada ao cartão, quebra de linha controlada e até três linhas; o conteúdo nunca invade o cartão vizinho.
- Miniaturas de tema representam uma interface em miniatura com cabeçalho, navegação, painel, destaque, controles e amostras da paleta, usando somente tokens validados do próprio perfil.
- A prévia completa do Inspector é quadrada e contém navegação, painel, hierarquia tipográfica, destaque, barra de recurso, cartão, campo e botões. As famílias de corpo e display são aplicadas separadamente.
- Nenhuma prévia executa HTML, CSS, JavaScript ou conteúdo importado; os elementos são construídos por DOM controlado e tokens sanitizados.

## Biblioteca de temas e tipografia — contrato v7 (1.0.0.144)

- A coleção de temas-base expõe exatamente doze presets: Padrão; sete paletas cromáticas (Vermelho, Laranja, Amarelo, Verde, Azul, Anil e Violeta); quatro estilos (Medieval, Futurista, Horror Cósmico e Super-heróis).
- Temas antigos permanecem reconhecíveis no Design System para compatibilidade de configurações e perfis existentes, mas não aparecem como presets na coleção curada da Biblioteca.
- Cada tema-base possui ID estável, descrição, paleta semântica, par tipográfico e etiquetas de categoria/estilo/cor. A pasta canônica continua sendo `nexus-temas`.
- Filtros de etiqueta usam os mesmos metadados indexados pelo Universal Library Resource Registry; as etiquetas são combináveis com busca, origem, tipo e pasta.
- Temas-base resolvem para perfis NEXUS completos e podem ser aplicados pelo adaptador de tema, respeitando escopo e permissões. Perfis pessoais preservam etiquetas ao salvar e duplicar.
- A grade usa uma miniatura independente e compacta; o Inspector mantém a demonstração completa. Ambos derivam dos tokens do próprio tema, sem executar CSS importado ou componentes.
- Fontes recomendadas: Cinzel + Cormorant Garamond (Medieval); Orbitron + Space Grotesk (Futurista); IM Fell English SC + Cormorant Garamond (Horror Cósmico); Bangers + Barlow Condensed (Super-heróis). As famílias web são opcionais via Google Fonts e têm fallback local para instalações offline.
- As fontes abertas são servidas pela API CSS do Google Fonts; a aplicação não redistribui arquivos de fonte. O sistema continua funcional com os fallbacks quando a rede não estiver disponível.
- A seleção de aparência continua independente da funcionalidade e do formato dos componentes; tema altera apresentação, nunca mecânica.

## Histórico anterior — contrato v6 (1.0.0.139)

- A prévia de tema no Grid e no Inspector deve derivar do perfil do próprio recurso selecionado, nunca do perfil global atualmente aplicado ao Foundry ou ao NEXUS.
- O resolver aceita perfis atuais e entradas legadas. Para temas internos, usa a chave estável do preset; não usa o ID `builtin-theme:<preset>` como preset.
- O modelo compartilhado inclui os 18 tokens semânticos, tipografia, tamanho base, densidade, geometria, espaçamento, altura dos controles e estilos de `buttons`, `panels`, `containers`, `highlights` e `fields`.
- Os cartões do Grid utilizam a variante compacta do mesmo renderizador do Inspector. Não criar previews separados que usem somente `previewColors` ou valores padrão.
- A mini-interface demonstra cabeçalho, navegação, painel, cartão, destaque, barra de recurso, campo e botões, refletindo os valores do perfil.
- Fontes: Grid mostra somente `Aa` em tamanho grande; Inspector mostra `Aa`, `Lorem Epsum` e `12345 !@#$%`. Os espécimes aplicam diretamente a família do recurso.
- A raiz e os descendentes de cada preview têm escopo tipográfico explícito para evitar herança de seletores globais do Foundry/NEXUS.
- Metadados de preview de temas pessoais incluem somente tokens visuais validados. `customCss` não é executado nem incluído na miniatura.
- A prévia é demonstrativa e inerte; não executa componentes, HTML, CSS ou JavaScript armazenados no recurso.

# Biblioteca NEXUS — contrato de definições, coleções e instâncias

## Objetivo

A Biblioteca é um explorador universal de conteúdos reutilizáveis. Coleções e pastas organizam itens sem modificar seu tipo semântico. A interface mantém três regiões: navegação, cartões e Inspector contextual.

## Navegação e organização

- **Todos os itens:** agrega as coleções persistidas no armazenamento canônico.
- **Favoritos:** visão transversal dos itens marcados pelo usuário.
- **Recentes:** visão transversal dos últimos itens consultados.
- **Coleções especializadas:** elementos disponíveis, meus componentes, temas, modelos, fluxos, predefinições, componentes salvos, mídia, estilos, propriedades, regras, comportamentos e funções.
- **Pastas:** pastas pessoais podem ser globais (livres) ou vinculadas a uma coleção. A associação é metadado do usuário e não altera o tipo ou conteúdo do item.
- **Etiquetas:** são metadados exibidos no Inspector e continuam indexadas pela busca global; não ocupam coluna nem oferecem filtro dedicado na lista.
- **Lista:** mostra Nome, Categoria e Tipo; Categoria e Tipo abrem campos de pesquisa contextual nos próprios cabeçalhos. As três colunas podem ser redimensionadas.
- **Ordenação:** pastas aparecem primeiro em A–Z e, em seguida, os recursos em A–Z; a ordenação padrão não exige um seletor de pastas.
- **Visualização:** grade e lista compartilham os mesmos controles e padrões de cartão.

As visões Todos os itens, Favoritos e Recentes agregam conteúdo salvo. Os elementos padrão do catálogo continuam disponíveis na área Elementos disponíveis; não são convertidos artificialmente em definições pessoais.

## Cartões e Inspector

Os cartões seguem uma estrutura comum de prévia, título, metadado e estado de favorito. A área de prévia possui altura uniforme; temas em grade apresentam uma amostra inerte do próprio perfil (hierarquia de texto, destaque, barras, botões, campo e paleta), enquanto em lista usam um marcador compacto com fundo, acento e borda do tema. Fontes exibem Aa e Lorem ipsum com variações tipográficas normal, bold e italic; suas pilhas CSS usam famílias disponíveis no sistema e fallbacks locais. Recursos pessoais podem usar uma imagem personalizada. A prévia usa dados inertes e não executa HTML, CSS, JavaScript ou expressões importadas.

### Refinamento visual 1.0.0.131

A lista usa somente Nome, Categoria e Tipo. Os filtros de Categoria e Tipo são pesquisáveis e abertos pelo respectivo cabeçalho; as sugestões são derivadas dos recursos carregados e complementadas pelos tipos nativos conhecidos. Etiquetas não são filtro separado: aparecem nos detalhes e podem ser localizadas pela busca global. A lista mantém o redimensionamento das colunas. O breadcrumb representa níveis com `/`, por exemplo `Biblioteca/Assets globais/Fontes`.

O Inspector genérico permite:
- consultar prévias contextuais seguras;
- editar nome, descrição, etiquetas e miniatura personalizada segura (URL HTTP(S) ou caminho relativo);
- atribuir ou remover pasta;
- duplicar uma definição com identidade nova;
- excluir uma definição, removendo também seus metadados de favorito/recente/pasta.

Ativos lógicos com dependentes registrados não podem ser excluídos. A atualização do armazenamento canônico é espelhada nas flags legadas correspondentes para preservar compatibilidade com consumidores antigos.

A visão universal é agregadora e serve para localizar, organizar e administrar definições. Ações especializadas de inserir componentes, aplicar temas, inserir layouts ou anexar fluxos continuam disponíveis nas respectivas áreas de trabalho quando exigem configuração específica. A visão universal não deve simular uma ação de aplicação que o tipo não suporte.

## Definição e instância

- **Definição:** modelo reutilizável salvo na Biblioteca, identificado por ID estável e versão.
- **Rascunho de instância:** cópia temporária das configurações no Inspector, editável antes da inserção.
- **Instância:** cópia inserida no layout de um Actor, com ID próprio, referência à definição de origem e overrides próprios.

A inserção não altera a definição. A edição de uma instância não altera outras instâncias nem o modelo. A edição de um modelo não propaga mudanças automaticamente para instâncias existentes.

### Componentes

As funções `createLibraryDefinition` e `createLibraryComponentInstance` normalizam uma definição e criam uma cópia independente, com novo ID e campos `libraryDefinitionId`, `libraryDefinitionVersion` e `libraryOverrides`.

As personalizações feitas no Inspector são passadas como overrides; os valores não alterados continuam herdados do modelo no momento da criação da instância. Restaurar o padrão significa descartar o rascunho de overrides antes de inserir.

### Grupos

Um grupo salvo é uma composição autocontida de componentes e subgrupos. Ao inserir, os IDs dos componentes e grupos são recriados e as referências internas remapeadas. Os overrides do Inspector afetam apenas o grupo raiz da nova composição.

### Temas

Temas padrão são somente leitura. Temas pessoais podem ser editados como definições independentes. Nunca substituir um tema padrão silenciosamente.

## Persistência e compatibilidade

- Definições pessoais e preferências de organização permanecem no escopo do usuário.
- Instâncias pertencem ao layout do Actor.
- Pastas, favoritos e recentes são preferências; não são armazenados dentro da definição reutilizável.
- Importar/duplicar deve criar identidades novas e relatar conflitos, sem sobrescrever silenciosamente.
- Dados legados continuam legíveis; a primeira gravação canônica preserva as coleções migradas.
- Operações de CRUD atualizam o armazenamento canônico e espelham as flags legadas correspondentes.
- Conteúdo importado permanece dado inerte: não executar HTML, CSS ou JavaScript vindo de pacotes.
- Atualizações de definições não modificam instâncias existentes automaticamente.
- Exclusão de ativos lógicos deve respeitar dependências registradas.

## Base existente — 1.0.0.90

Implementado nesta etapa:
- visão universal conectada ao catálogo de provedores (recursos NEXUS e referências de documentos Foundry), além de itens salvos, favoritos e recentes;
- navegação sem agrupamentos técnicos separados por Lógica/Aparência/Outros;
- pastas livres e pastas vinculadas a coleção;
- chips de etiquetas derivados dos dados existentes;
- barra de pesquisa compacta e alternância grade/lista;
- cartões genéricos com prévia e dimensões padronizadas;
- Inspector de metadados com atribuição de pasta;
- duplicação e exclusão com identidades novas e proteção de dependências;
- espelhamento de CRUD para flags legadas.

Limitações que permanecem:
- editores estruturados iniciais para Propriedades, Regras, Comportamentos, Fluxos e Funções estão no Inspector; um construtor visual avançado de Fluxos ainda precisa ser desenvolvido;
- nem todo tipo possui ação de aplicação direta a partir da visão universal; os fluxos especializados continuam responsáveis por inserir/aplicar conteúdos;
- a aparência, persistência e os fluxos devem ser testados no Foundry VTT 14 build 360 antes de declarar estabilidade funcional.

## Catálogo universal e provedores

O explorador deve apresentar uma única coleção de recursos, sem exigir uma área ou botão permanente por módulo/tipo. Os provedores entregam cartões ao mesmo catálogo; a classificação técnica é metadado e filtro contextual, não uma arquitetura de janelas separadas.

O contrato `LibraryResourceRegistry` foi iniciado com dois provedores:
- **Biblioteca NEXUS:** definições pessoais, catálogo padrão e coleções de Lógica.
- **Foundry:** referências UUID de Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards.

Cada resultado contém identidade estável, provedor de origem, tipo, nome, descrição, etiquetas, miniatura, pasta, referência e capacidades declaradas. A listagem retorna metadados; `resolve(reference)` só obtém o objeto completo quando o Inspector ou uma ação realmente precisa dele. A paginação mantém cursores independentes por provedor.

Módulos podem registrar provedores adicionais em `game.nexus.library.registerProvider()`. Isso permite integrar conteúdo sem acrescentar um botão, aba ou janela por módulo. A Biblioteca controla descoberta e organização; o provedor continua responsável por resolver seu conteúdo e respeitar suas permissões.

### Importação integrada — direção inspirada no Plutonium

O fluxo desejado é: **origem → prévia/validação → destino compatível → confirmação**. Origens poderão incluir recursos NEXUS, documentos Foundry, compêndios explicitamente selecionados, arquivos do usuário e fontes externas compatíveis. Destinos poderão incluir documentos nativos, compêndios, fichas e coleções NEXUS.

A descoberta universal está implementada na camada de serviço e sua primeira visão foi conectada ao Explorer existente por `scripts/library/catalog-explorer.js`. A ficha atua como adaptador, não como proprietária do catálogo. O backup integral da Biblioteca possui validação, prévia e mesclagem sem sobrescrita automática; isso não equivale a adaptadores de importação de fontes externas ou destinos especializados, que permanecem futuros. Conteúdo externo não será executado automaticamente; scripts, macros e comportamentos precisam de validação, permissões e confirmação explícita. Não incluir conteúdo protegido de terceiros no NEXUS: a integração deve operar sobre fontes e arquivos que o usuário tenha direito de utilizar.

A interface final deve manter uma barra compacta de pesquisa e um único controle de filtros; ações aparecem contextualmente no Inspector/menu do recurso, não como uma fileira de botões permanentes para cada categoria.

## Área unificada Lógica

Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões continuam sendo tipos distintos. A visão universal unifica descoberta e organização, não seus schemas, editores ou executores. Metadados comuns (origem, namespace, versão, permissões, etiquetas e dependências) podem ser apresentados de forma consistente sem colapsar os contratos especializados.

## Extensão universal — branch de conclusão em andamento

A branch `feature/library-universal-completion-2026-11-23` amplia a base sem alterar a versão publicada:

- janela independente ApplicationV2, reutilizando o mesmo registro e o mesmo Explorer;
- filtros por categoria, tipo específico, origem e etiqueta;
- seleção explícita de compêndios visíveis, sem varrer todos os pacotes automaticamente;
- favoritos, recentes, pastas e coleções universais resolvidos por referências estáveis, inclusive UUIDs Foundry e fluxos do mundo;
- coleções pessoais capazes de agrupar tipos/provedores diferentes sem copiar os recursos;
- ações contextuais declaradas pelos provedores: editar metadados, duplicar, excluir com verificação de dependências e abrir documentos Foundry;
- atribuição de pastas no Inspector e gerenciamento de pastas na aplicação independente;
- backup integral de todas as coleções, incluindo propriedades e funções, com separação entre fluxos pessoais e fluxos do mundo;
- prévia de importação, relatório de conflitos e confirmação explícita antes de gravar;
- cache fraco de metadados Foundry invalidado por hooks e serialização técnica somente quando o Inspector é expandido.

O contrato de provedores inclui consulta por IDs para que favoritos, recentes e pastas não dependam de estar na primeira página do catálogo. Ações de provedores são enumeradas e validadas pelo registro; dados importados não são executados.

### Limites ainda não concluídos

- adaptadores externos de descoberta/importação e destinos compatíveis no estilo origem → prévia → validação → destino;
- editores próprios completos para todos os tipos de Lógica e ações de aplicação para cada domínio;
- edição de documentos Foundry por metadados do catálogo, que continua pertencendo às fichas nativas;
- validação funcional em cliente real do Foundry VTT 14 build 360.

A branch de conclusão não deve ser considerada release até que a cadeia de PRs seja integrada na ordem correta e a validação real seja concluída.


### Editores especializados iniciais

O Inspector da aplicação independente carrega editores por subtipo lógico. Propriedades editam caminho, tipo e valor padrão; Regras editam expressão e tipo de resultado; Comportamentos editam eventos e referência de fluxo; Fluxos editam gatilhos, condições, ações e política de erro como dados JSON; Funções editam identificador, assinatura, argumentos e tipo de retorno. O salvamento valida o payload antes de persistir. Nenhum editor aceita ou executa código JavaScript importado.


### Inspector de Aparências — prévia e aplicação contextual

Perfis completos da coleção `themes` (`kind: "design-profile"`) recebem uma prévia isolada que representa painel, navegação, conteúdo, campos e botão. O Inspector também apresenta os 18 tokens semânticos, tipografia, densidade, raio, espaçamento, altura dos controles, acessibilidade e os quatro diagnósticos de contraste do schema. A prévia usa somente valores normalizados pelo contrato `NEXUS-DESIGN/1`; não injeta CSS arbitrário nem altera a aparência ativa.

Ações de aplicação são separadas por ownership:
- **Aplicar à campanha:** disponível somente quando `design.canEditScope("world")` autoriza (GM); exige confirmação explícita porque afeta os usuários que herdam o tema.
- **Usar como minha aparência:** disponível somente quando `design.canEditScope("user")` autoriza; salva no escopo pessoal e respeita a política da campanha.
- Perfis com schema futuro podem ser identificados, mas não recebem prévia interpretada nem ações de aplicação/edição nesta versão.
- A Biblioteca continua pessoal; a ação copia o perfil validado para as configurações Foundry existentes e não compartilha a coleção do usuário.

O adaptador é compartilhado pela janela independente e pela visão embutida na ficha. A prévia não é uma captura pixel-perfect de todas as aplicações Foundry; é uma amostra comparativa dos tokens e componentes semânticos do perfil.


## Fontes estruturadas e criação assistida de personagens

A futura criação assistida deverá ser construída sobre adaptadores de transferência, com registros JSON tipados, versão de schema, validação, prévia e confirmação. A origem não poderá executar código nem gravar diretamente no Actor. O destino da ficha será responsável por mapear os campos aceitos, mostrar conflitos e aplicar somente após confirmação. Os schemas e adaptadores concretos ainda não fazem parte da implementação atual.


## Taxonomia inicial e operações de organização — 1.0.0.123

A Biblioteca pode inicializar uma árvore base por domínio uma única vez. A árvore é metadado de organização do usuário, não uma validação de tipo: qualquer recurso pode ser movido para qualquer pasta pessoal. A migração preserva pastas existentes e não reclassifica automaticamente os recursos já atribuídos.

- **Atores:** atores e recursos associados; Player, NPC e criatura são tags, não subpastas obrigatórias. Assets, layouts, modelos de ficha e recursos relacionados ficam no domínio de Atores.
- **Itens:** Classes, Origens, Legados, Ações e Itens. Itens pode conter Equipamentos, Armas, Armaduras, Consumíveis, Contêineres e Outros equipamentos; também há Assets, Layouts, Modelos de item e recursos relacionados. Não há pasta-base de itens mágicos.
- **Cenas:** Cenas, Mapas, Elementos de mapa e Elementos de cena. A subárvore de elementos usa rótulos em português para Tokens, Tiles, Desenhos, Paredes, Luzes ambientes, Sons ambientes, Notas, Modelos medidos, Regiões e Comportamentos de região.
- **Documentos, Baralhos, Tabelas de rolagem, Áudio, Compêndios, Macros, Assets globais e NEXUS** mantêm áreas próprias, incluindo seus recursos relacionados.

A árvore oferece disclosure expandir/recolher e preserva a hierarquia. O menu contextual permite criar subpasta, renomear, recortar, copiar, colar, mover para raiz e excluir a organização. Excluir uma pasta remove apenas a estrutura e desassocia recursos; documentos do Foundry não são apagados. Copiar uma pasta duplica somente a estrutura, nunca documentos ou arquivos.

O botão **Novo** reúne ações de criação. Importar asset usa o FilePicker/upload nativo do Foundry e registra mídia pessoal. Atalhos armazenam uma referência ao recurso original. Layouts e componentes novos são entradas pessoais editáveis; sua estrutura não substitui schemas mecânicos do NEXUS.

Os cards usam preview quadrado, sem moldura/painel interno, com imagens em object-fit: contain. A seleção é indicada somente por borda de destaque. Previews são representações inertes e não executam conteúdo importado.


## Padrão visual reutilizável — Biblioteca 1.0.0.138

A Biblioteca mantém uma única camada de contrato visual, carregada após os estilos base e o Design System: `styles/nexus-library-ui-contract.css`. Regras antigas de pesquisa foram removidas dos estilos legados para impedir que uma nova definição seja sobrescrita por cascatas concorrentes.

### Pesquisa

- A barra de pesquisa é uma superfície única com ícone, campo flexível e ação de limpar.
- O campo deve ocupar o espaço restante sem ultrapassar a área de navegação.
- Em larguras estreitas, a pesquisa ocupa uma linha própria; breadcrumb e navegação continuam utilizáveis.
- A aparência, foco, dimensões e estados do controle são definidos uma vez no contrato compartilhado, não por tipo de recurso.

### Cartões e prévias

- Cada prévia usa uma área de conteúdo padronizada e dados inertes; conteúdo importado não é executado.
- Temas usam os tokens semânticos reais do perfil (chave canônica, não o rótulo traduzido) e uma mini-interface consistente em grade e Inspector.
- A amostra de tema demonstra cabeçalho, navegação, superfície, destaque, campo, botão e barra de recurso; a paleta detalhada fica em um disclosure abaixo da amostra.
- Componentes de medidor/barra de recurso recebem uma miniatura visual no cartão, sem depender de uma miniatura externa.
- Fontes usam a família resolvida na amostra tipográfica.
- Novos tipos podem reutilizar os padrões de superfície, metadados e estados; somente o conteúdo específico do tipo deve ser criado.

### Inspector — hierarquia aprovada

- **Padrão:** nome, metadados resumidos e prévia visual. A seleção abre nesta aba.
- **Detalhes:** descrição, etiquetas, resumo/tipo/dimensões, fatos técnicos, pasta, coleções e ações.
- O favorito permanece acessível no cabeçalho do recurso e sincronizado com o cartão.
- O estado visual selecionado é explícito e consistente: a aba ativa usa o tratamento de destaque; a inativa usa superfície neutra.

Esta hierarquia e os tokens da prévia são contratos para futuras adições, evitando que cada recurso redefina a pesquisa, as abas, o espaçamento ou a estrutura de apresentação.

### Fontes consultadas

- [Cinzel](https://fonts.google.com/specimen/Cinzel) — títulos de inspiração clássica/medieval.
- [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) — serifada editorial para leitura e atmosferas góticas.
- [Orbitron](https://fonts.google.com/specimen/Orbitron) e [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) — par de display geométrica e sans-serif contemporânea para futurismo.
- [IM Fell English SC](https://fonts.google.com/specimen/IM+Fell+English+SC) — display histórica para horror cósmico.
- [Bangers](https://fonts.google.com/specimen/Bangers) e [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) — par de quadrinhos e títulos de ação; Bangers foi desenhada com referências ao letreiramento de capas de quadrinhos de super-heróis.
- [Política de licenciamento do Google Fonts](https://googlefonts.github.io/gf-guide/license-file) — o catálogo Google Fonts aceita famílias sob SIL Open Font License 1.1.

As famílias são carregadas sob demanda pelo CSS do Google Fonts; as pilhas de fallback continuam disponíveis sem rede. Nenhum arquivo de fonte é redistribuído pelo pacote NEXUS.
