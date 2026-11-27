## 1.0.0.137 — Correções visuais da Biblioteca (candidata)

- Prévia de fontes com família real e amostras Aa, Lorem Epsum e 12345 !@#$%.
- Prévia de temas com mini-interface ampliada e paleta recolhida em dropdown.
- Grid com visualização efetiva 64×64, título até três linhas, favoritos em estrela e estilos consolidados.
- Inspector com tabs no topo; identidade e meta em Padrão; tags e resumo em Detalhes.
- Contratos de teste atualizados; publicação depende de CI e confirmação do ZIP. Validação visual/funcional no Foundry VTT 14 build 360 pendente.

## 1.0.0.136 — Prévia de recursos e Inspector organizado (publicada)

- Aba principal renomeada para Padrão; tabs segmentados acessíveis ficam no topo do Inspector.
- Nome, descrição e meta resumida na visualização Padrão; resumo técnico, fatos e tags na aba Detalhes.
- Prévia tipográfica com família real resolvida, Aa e texto de amostra.
- Prévia de tema com tokens semânticos e chaves hex personalizadas, incluindo amostra de interface.
- Cabeçalhos Nome/Categoria/Tipo usam a célula inteira como área clicável; redimensionadores ficam em alvos próprios.
- Remover bordas e outlines de seleção do modo Lista; selecionar item abre Padrão.
- CI, testes automatizados, release, ZIP e manifesto aprovados/publicados; validação visual no Foundry VTT 14 build 360 permanece pendente.

## 1.0.0.134 — Refinamento da Biblioteca e Estúdio de Aparência

- Consolidar a dimensão efetiva das prévias do Grid em 32/64/128 CSS px, sem regras legadas reduzindo o espaço útil.
- Usar cartões compactos com miniatura de 64 × 64 px e título de até três linhas, sem altura artificial.
- Apresentar cores reais dos temas nos cartões.
- Separar Prévia e Detalhes no Inspector; fatos técnicos e metadados não ocupam a área visual principal.
- Selecionar pastas com clique e abrir com duplo clique (Enter mantém acessibilidade por teclado).
- Corrigir opções aninhadas do ApplicationV2 no Estúdio de Aparência.
- A validação visual/funcional no Foundry VTT 14 build 360 permanece necessária após a instalação.

## 1.0.0.133 — Grid adaptativo e prévias proporcionais da Biblioteca

- Grid adaptativo preenche a largura disponível, sem largura máxima fixa dos cartões.
- Pequeno/Médio/Grande controla o tamanho de exibição das prévias em 32/64/128 CSS px; os arquivos originais mantêm suas dimensões e proporções.
- Imagens são redimensionadas proporcionalmente e recebem ícone representativo quando não há miniatura disponível.
- Cartões Grid mostram somente miniatura e nome; metadados de categoria/tipo permanecem na Lista e nos filtros.
- Pastas são elementos de navegação e não participam das facetas de categoria/tipo.
- Fontes mostram “Aa” no Grid e “Aa” + “Lorem ipsum dolor sit amet.” no Inspector.
- Favoritos ficam no canto superior direito dos cartões.
- CI, regressões, pacote, release e manifesto aprovados/publicados; validação visual/funcional no Foundry VTT 14 build 360 pendente.

## 1.0.0.129 — Refinamento visual e funcional do Explorer

- Pesquisa com um único contorno externo; remover borda interna do input e alinhar ícone/limpar dentro da mesma superfície.
- Breadcrumb alinhado, com ícone de biblioteca/pasta/visão/coleção e texto truncado sem deslocamento.
- Corrigir estrutura da linha de lista: miniatura + nome dentro da coluna Nome; categoria, tamanho, modificação e etiquetas nas colunas alinhadas ao cabeçalho.
- Redimensionar colunas Nome, Categoria, Tamanho e Modificado por arraste e teclado, preservando as larguras durante re-render.
- Corrigir aceitação de todos os modos A–Z/Z–A para nome, categoria, origem, tamanho, modificação e etiqueta.
- Pesquisar categorias e etiquetas disponíveis com listas de sugestões.
- Mostrar specimen Lorem ipsum da fonte e mockup de painel/botão/campo para temas.
- Classificar os temas na Biblioteca como Coleções visuais e migrar apenas o nome da pasta padrão correspondente, sem modificar coleções ou perfis do usuário.
- CI, testes, pacote, release e manifesto; validação visual/funcional no Foundry VTT 14 build 360 pendente.

## 1.0.0.126 — Biblioteca em janela com abas

- Integra a janela de navegação com abas independentes e estado próprio.
- Inclui breadcrumb, histórico Voltar/Avançar, pesquisa ao lado do caminho e navegação para o nível superior.
- Inclui barra de comandos para Novo, Atualizar, Recortar, Copiar, Colar, Renomear e Excluir.
- Permite redimensionar árvore e Inspector com persistência.
- Testes automatizados e pacote em validação; teste funcional no Foundry VTT 14 build 360 ainda necessário.

## 1.0.0.125 — bootstrap por dependências

- Migração de serviços centrais para factories do registro de serviços.
- Dependências explícitas entre Design, Document Bridge, Library Registry, Media Pipeline e Logic Runtime.
- Integração Foundry da Lógica resolvida pelo mesmo registro durante `ready`.
- API pública `game.nexus.*` preservada.
- Próximo: extrair resolução de propriedades da ficha e dividir listeners por domínio com lifecycle controlado.
- Validação automatizada e pacote serão confirmados pelo CI; teste real no Foundry VTT 14 permanece pendente.

## Revisão arquitetural 1.0.0.124 — 2026-11-26

- Auditoria de arquitetura estática e inventário da base 1.0.0.123 concluídos.
- Registro de serviços compartilhados e contratos de eventos da Lógica implementados na branch de revisão.
- Guardrails de imports locais e ciclos adicionados; CI desta etapa já validou a sintaxe e a suíte.
- Próximos passos: modularizar bootstrap, extrair resolução de propriedades e listeners por domínio, reduzir concentração do Explorer, consolidar CSS/template por domínio e dividir o validador.
- A refatoração integral ainda não está concluída; manter compatibilidade de dados e aguardar validação do Foundry VTT 14 para os fluxos de interface.

## 1.0.0.123 — estrutura e organização da Biblioteca

- Estrutura inicial por domínios, aplicada uma única vez e sem sobrescrever pastas pessoais.
- Tags de atores em vez de pastas fixas para Player/NPC/criatura.
- Árvore expandível/recolhível, menus contextuais, operações de pasta e clipboard de referências.
- Ação universal Novo para pasta, asset, atalho, layout e componente.
- Previews quadrados e seleção somente por borda.
- Próxima etapa: validar os fluxos no Foundry VTT 14 build 360, especialmente upload de mídia, importação de UUID e drag-and-drop para diretórios/Canvas; depois refinar categorias e mapeamentos sem alterar documentos nativos automaticamente.

## 1.0.0.122 — pesquisa e transferência da Biblioteca

- Implementar consulta estruturada e indexação ampliada de metadados de compêndios.
- Preservar paginação, permissões e resolução sob demanda.
- Usar arraste nativo por UUID para documentos Foundry.
- Permitir arrastar componentes pessoais salvos diretamente para o Canvas, respeitando a grade.
- Fixar a janela da ficha em 800 × 836 px, mantendo dimensões internas independentes.
- Próximas etapas: adaptadores de fontes externas com prévia/validação, importação em lote, destinos especializados e mapeamento de conteúdo para propriedades somente quando os schemas mecânicos oficiais estiverem definidos.
- Validação visual/funcional no Foundry VTT 14 build 360 permanece pendente.
## 1.0.0.122 — Biblioteca e espaço inicial da ficha

- Corrigir o contexto dos métodos estáticos DialogV2 nos fluxos de pastas, coleções, importação e confirmação de ações.
- Tornar o filtro um popover compacto que não altera a altura útil do catálogo.
- Manter uma única superfície para a pesquisa.
- Padronizar miniaturas e apresentar prévias de paletas nos cards de temas.
- Permitir miniaturas personalizadas seguras nos metadados de recursos pessoais.
- Ajustar a altura inicial da ficha para 836 px.
- Adaptadores concretos para fontes externas e destinos de ficha/compêndio continuam como etapa posterior; a base de transferência valida dados inertes, gera prévia e exige confirmação explícita.
- CI automatizado não substitui a validação visual e funcional no Foundry VTT 14 build 360.

## Correção 1.0.0.119 — preservação da sidebar nativa
- A versão .118 ainda forçava `#sidebar` para flex-row e aplicava dimensões ao seletor `#sidebar-tabs > .sidebar-tab`; isso não corresponde à árvore documentada do Foundry V14, cujo controle de navegação está aninhado em menu/li/button.
- A .119 remove a geometria customizada e estiliza apenas os controles nativos reais. Também remove a coluna fantasma do workspace e limpa o alvo do Inspector ao limpar seleção.
- Release depende de CI; validação visual no Foundry continua pendente.

## 1.0.0.118 — correções estruturais

- Restaurar o rail de abas nativo do Foundry com controles individuais, sem alterar a geometria do painel.
- Centralizar foco e alvo do Inspector com validação de IDs e atualização de Propriedades/Comportamento.
- Unificar a classe e a instância do Estúdio de Aparência entre Settings e abertura direta.
- Corrigir grid e dimensões do Canvas no modo play e evitar cortes de conteúdo.
- CI, pacote, release e manifesto: aguardando execução após commit.
- Validação visual/funcional no Foundry VTT 14 build 360: necessária após instalação.

# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit de referência: `HEAD da main`
- Distribuição: o manifesto original é a fonte única de instalação/atualização e só avança após CI, publicação e confirmação do asset.
- Versão estável publicada na `main` e no manifesto: `1.0.0.118` (correções dos rails flutuantes e do alvo do inspetor).
- Última versão estável anterior: `1.0.0.115`.
- Teste manual: a versão `1.0.0.118` precisa confirmar rail direito sem painel, botões individuais, troca/edição de layouts, Biblioteca, seleção e alvo do inspetor, foco, edição de grupos, re-renderização, ícones, fontes, Hotbar/Players e painéis no Foundry VTT 14 build 360.
- Commits posteriores à release: `08f521ca03a998f6fcc623e9e0193cc1ba7da247` (diagnóstico Playwright) e `34c114539e04e67151dbcf806283503e91c3cdf0` (isolamento tipográfico e consolidação dos estilos).
- A versão .116 mantém a sidebar nativa, destaca os botões de layout em controles flutuantes e remove molduras externas redundantes; não declarar a restauração visual concluída até confirmar navegação, ícones e conteúdo no Foundry VTT 14 build 360.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A publicação da 1.0.0.118 concluiu CI (64/64 scripts e 43/43 arquivos de teste), geração/validação do ZIP, release e sincronização do manifesto. A validação funcional no Foundry real permanece pendente.
- Alvo: Foundry VTT 14, build 360.
- Estado: projeto em desenvolvimento pós-release; CI automatizado por commit; a validação funcional/visual no Foundry real permanece pendente.

## Versão 1.0.0.118 — correção dos rails e do inspetor

- Corrigir a especificidade de estilos legados que reaplicavam superfície ao rail direito; manter o contêiner transparente e cada botão com superfície individual.
- Unificar o alvo do inspetor com a seleção atual e limpar referências de componentes obsoletas.
- Direcionar a edição por duplo clique do Canvas para a janela flutuante ApplicationV2 e preservar edição de grupos.
- Adicionar contratos de regressão para rail, seleção e abertura do inspetor.
- CI, pacote, release e manifesto publicados; falta validação manual no Foundry VTT 14 build 360.

## Versão 1.0.0.116 — navegação flutuante e superfícies nativas

- Retirar os botões de layout da ficha do contêiner lateral e apresentá-los como controles flutuantes independentes, mantendo a troca de layout e o acesso à Biblioteca.
- Remover o painel de fundo externo atrás da action bar/10 slots da Hotbar e atrás da lista de jogadores; preservar os 10 slots, seus estados e os jogadores conectados.
- Corrigir o seletor de tipografia global para aplicar exclusões de ícones como condições compostas no mesmo elemento.
- Manter as fontes nativas do Foundry/Font Awesome e permitir que a fonte de perfil seja aplicada ao texto normal sem quebrar glifos.
- Adicionar testes de regressão para navegação flutuante, fundos transparentes e preservação de slots/entradas.
- CI aprovado: 64/64 scripts e 43/43 arquivos de teste. Validação manual no Foundry VTT 14 build 360 permanece pendente.

## Histórico da versão 1.0.0.115 — auditoria ampliada de fontes de ícones

- Corrigir seletores legados que aplicavam `font-family: inherit` genericamente a botões e spans de componentes.
- Preservar classes Font Awesome em controles de ApplicationV2, trilhos flutuantes, recursos de ficha, Hotbar e navegação.
- Corrigir o seletor global de tipografia que tinha um espaço indevido antes de `:not()`, transformando a exclusão de ícones em seletor descendente.
- Adicionar teste de regressão dedicado para garantir que as regras tipográficas não alcancem elementos com classes de ícones.
- Revalidar a suíte automatizada e, depois da instalação, conferir os glifos no Foundry VTT 14 build 360.

## Histórico da versão 1.0.0.114 — sidebar nativa e primeira correção de ícones

- Remover o CSS estrutural que transformava a navegação nativa em uma faixa horizontal.
- Manter o tema das superfícies e diretórios sem controlar geometria, orientação, ordem ou visibilidade das abas.
- Preservar os ajustes independentes do Chat.
- Tornar o Estúdio de Aparência mais responsivo e unificar sua instância no menu de Configurações e no atalho direto.
- Evitar que a tipografia genérica dos botões substitua a fonte/peso de controles Font Awesome.
- Executar os contratos automatizados e, depois da instalação, validar no Foundry VTT 14 build 360. CI não substitui a verificação real.

## Histórico da candidata 1.0.0.113 — dock compacto de navegação

A main distribui as abas nativas em uma única faixa flexível, sem wrap ou rolagem horizontal. A mudança preserva a ordem DOM, os handlers, os ícones e o controlador nativo; a largura da sidebar não é alterada. O CI deve confirmar os contratos e o empacotamento, mas a precisão dos cliques e a compatibilidade com abas adicionadas por módulos dependem de inspeção no Foundry real.

## Histórico — diagnóstico do sidebar V14 (superado pela candidata .114)

As PRs #89 e #91 foram integradas à main. O teste `tools/foundry-testing/tests/sidebar-diagnostic.spec.js` coleta a árvore DOM de `game.sidebar.element`, ancestrais, geometrias, estilos calculados, fontes de ícones e screenshot no Foundry 14. A PR #91 isolou o sidebar das regras globais de tipografia, removeu a atribuição de `font-family: inherit` aos controles nativos e centralizou os estilos das abas em `nexus-design-system.css`. CI e empacotamento passaram. A etapa seguinte é executar o diagnóstico no mundo descartável e validar o layout horizontal, os ícones e a troca de abas no cliente real. Não considerar o sidebar concluído nem publicar nova release antes dessa validação.

## Atualização 1.0.0.105 — correção estrutural do sidebar

Corrige a aplicação das regras do Minimal UI à estrutura ApplicationV2 do Foundry V14. A navegação alcança `.sidebar-tabs` e `.tab.sidebar-tab` dentro do contêiner real, organiza os botões em faixa horizontal e mantém os elementos, handlers, ordem DOM e fontes de ícones nativas. A validação visual no Foundry VTT 14 build 360 permanece pendente.

## Atualização 1.0.0.104

Corrige o erro de construção do Estúdio de Aparência causado por opções de janela congeladas recebidas pelo menu do Foundry. O código agora clona as opções herdadas e as estruturas mutáveis antes da construção da ApplicationV2. A navegação nativa do sidebar passa para uma faixa superior horizontal, mantendo a ordem DOM original do Foundry (de cima para baixo convertida em esquerda para direita). As classes Font Awesome legadas são excluídas da tipografia global. A validação no cliente Foundry VTT 14 build 360 permanece pendente.


## Correção direta do sidebar — commit 417acb4f663ba328e30f28db70ab976af0f18669

A pedido do usuário, esta rodada não utiliza Playwright nem exige diagnóstico automatizado no navegador. O CSS do sidebar foi refeito diretamente na `main` para separar explicitamente a navegação dos painéis ApplicationV2: os controles de navegação são os elementos `.item` dentro de `#sidebar-tabs`/ `.sidebar-tabs`; os elementos `.tab.sidebar-tab` são tratados como painéis de conteúdo e não recebem dimensões de botão. A navegação passa a ser selecionada diretamente por ID e por classes de compatibilidade, com layout horizontal flexível, quebra de linha, estados de foco/seleção e preservação dos glifos nativos. O usuário fará a validação visual e funcional no Foundry VTT 14. Esta alteração ainda não é uma release nem altera a versão distribuída `1.0.0.106`.


## Atualização 1.0.0.107 — pacote para teste manual

A versão `1.0.0.107` está publicada na release `v1.0.0.107`, com ZIP confirmado e manifesto sincronizado. Ela contém a revisão do sidebar integrada no commit `417acb4f663ba328e30f28db70ab976af0f18669`, além dos ajustes de estilo e dos contratos de regressão desta etapa. O objetivo do teste manual é confirmar a navegação horizontal, os glifos nativos, a troca de abas e a exibição dos painéis. Não foi executado Playwright nem teste de navegador. A publicação do pacote não altera o estado de validação: o sidebar só será considerado concluído após confirmação manual no cliente real.


## Checkpoint 25/11/2026 — tokens de seleção/foco

- PR #93 integrada à `main` (commit `96fd0c7b73ec369d97b6884f5dea1586bd4e1787`).
- Os estados de foco da Biblioteca e seleção/inspeção do Canvas passaram a usar `--nexus-accent-color`, com fallback seguro.
- O teste de contrato `tests/sheet-theme-scope.test.mjs` cobre os três usos e a validação CI da integração passou.
- A release distribuída continua sendo `1.0.0.107`; a execução de release após a PR foi ignorada, portanto não houve nova versão publicada.
- Próximo passo funcional: corrigir o sidebar com evidência do DOM do Foundry VTT 14 build 360. Sem a captura real, não alterar seletores por suposição. Não usar Playwright.
- Fichas, Canvas, Biblioteca e auditoria ampla de ícones continuam como etapas de trabalho, não como concluídas; a validação visual/funcional no Foundry permanece pendente.


## Correção completa do layout da sidebar V14 — PR #95

- Reescrito o bloco de sidebar em `styles/nexus-design-system.css`: contêiner em coluna, navegação horizontal com quebra de linha, botões de tamanho consistente, estados hover/selecionado/foco e área de painel flexível.
- A geometria dos painéis foi limitada aos contêineres e filhos de abas nativos; abas internas de aplicações não recebem indiscriminadamente dimensões de painel.
- A visibilidade e a troca de abas continuam sob controle do controlador nativo do Foundry. Não foram recriados handlers nem glifos; Font Awesome e SVG permanecem nativos.
- Atualizados os contratos de regressão que ainda apontavam para os seletores antigos e adicionado `tests/sidebar-layout-contract.test.mjs`, incluindo equilíbrio estrutural das chaves CSS.
- CI da validação de pacote passou: sintaxe 64/64, suite de testes 41/41 e pacote gerado com sucesso. Não houve release.
- **Validação manual pendente:** conferir no Foundry VTT 14 build 360 a posição real da barra, todos os ícones, troca de abas, altura/rolagem dos painéis e compatibilidade com abas de módulos. Não declarar concluído visualmente antes dessa conferência. A disponibilização da `1.0.0.108` foi autorizada pelo mantenedor como pacote antecipado para teste.


## Atualização 1.0.0.108 — pacote publicado para teste

- A versão `1.0.0.108` foi autorizada pelo mantenedor para disponibilização no GitHub antes da validação manual, com possibilidade de remoção/substituição posterior caso o teste identifique problemas.
- Inclui a reconstrução da sidebar da PR #95 e os contratos de regressão integrados à `main`.
- A publicação não muda o estado de validação: no Foundry VTT 14 build 360 ainda é necessário conferir navegação, ícones, troca de abas, rolagem/altura dos painéis e compatibilidade com módulos.
- Não marcar a sidebar como funcionalmente concluída até a confirmação manual.


## Diagnóstico da sidebar após o teste da 1.0.0.108

- A captura real do Foundry VTT 14 mostrou os botões nativos de abas com classes Font Awesome diretamente no próprio elemento BUTTON (por exemplo, fa-solid fa-comments) e font-family Inter no botão e em seu ::before.
- A causa identificada foi a regra global de tipografia para controles (body :is(button, input, select, textarea) { font-family: inherit; }), que sobrescrevia a fonte do botão e, por herança, convertia os glifos Font Awesome em quadrados.
- Correção proposta: manter a tipografia de perfil nos controles comuns, excluindo controles que carregam classes Font Awesome diretamente. O controlador de abas e o layout nativo não são alterados.
- A navegação ainda aparece vertical na captura; essa parte requer inspeção do contêiner de navegação e da cascata computada antes de qualquer novo ajuste estrutural. Não considerar o layout visual concluído.


## Atualização 1.0.0.109 — correção de fonte dos ícones

- Diagnóstico baseado na captura real do usuário: os botões de abas têm classes Font Awesome no próprio BUTTON, mas o estilo computado aplicava Inter ao botão e ao pseudo-elemento ::before.
- A regra global de tipografia dos controles aplicava font-family: inherit a todos os botões. A correção exclui as classes Font Awesome, preservando a fonte nativa dos glifos.
- PR #97 integrada; CI de validação de pacote passou.
- A correção dos ícones não resolve, por si só, a orientação vertical da navegação. Falta a geometria/estilos computados do contêiner #sidebar-tabs e seus ancestrais. Manter essa parte como pendente e não presumir seletores.


## Diagnóstico DOM e correção da navegação — Foundry VTT 14

- A inspeção do usuário confirmou `#sidebar-tabs` como `NAV.tabs.faded-ui` (298 × 563, `display:flex`, `flex-direction:row`, `flex-wrap:wrap`). Portanto, o próprio NAV já é horizontal.
- O HTML real contém `NAV#sidebar-tabs > MENU.flexcol > LI > BUTTON[role=tab]`. O menu interno `flexcol` era o elemento que mantinha os controles empilhados verticalmente.
- Os seletores de geometria anteriores também tratavam os botões como filhos diretos de `#sidebar-tabs`, mas no DOM real eles estão dentro de `menu > li`; por isso não atingiam os botões.
- Correção: transformar o `menu.flexcol` real em faixa flex horizontal com quebra de linha e dimensionar seus `li` e botões descendentes. Sem alterar handlers, ordem DOM, controlador de abas ou painéis.
- Adicionado contrato de regressão para a hierarquia real observada.
- A correção permanece sujeita a teste manual no Foundry VTT 14; não declarar validação visual concluída.


## Atualização 1.0.0.110 — correção estrutural da sidebar V14

- Diagnóstico do DOM real recebido: `#sidebar-tabs` já era horizontal, mas `menu.flexcol` interno empilhava os controles e os seletores anteriores não alcançavam os botões aninhados em `li`.
- PR #98 integrada: o menu real agora é faixa horizontal com quebra de linha; `li` e botões recebem dimensões consistentes sem alterar a estrutura ou os handlers nativos.
- A correção dos glifos Font Awesome da 1.0.0.109 permanece incluída.
- CI e testes de contrato aprovados na PR; validação visual manual no Foundry VTT 14 ainda pendente.


## Diagnóstico e correção do chat lateral — DOM V14

- O diagnóstico mediu sidebar/área de chat com 540 px, mas o `OL.chat-log` ativo e o `FORM.chat-form` tinham apenas 300 px. O seletor `#chat-log` não encontra o histórico real: o DOM expõe `OL.chat-log` sem esse ID.
- Correção: aplicar largura total e remover `max-width` dos elementos reais `.chat-log`, `.chat-controls` e `.chat-form`; ajustar cartões com espaçamento mais compacto e sem sombra excessiva.
- Não alterar o controlador de abas, mensagens, handlers nem a margem nativa do contêiner até confirmar sua origem por estilo computado.
- Testes de contrato cobrem a estrutura real; validação visual final ainda depende do usuário no Foundry VTT 14.


## Atualização 1.0.0.111 — chat lateral compacto

- Diagnóstico DOM: sidebar, #sidebar-content e #chat têm 540 px, enquanto OL.chat-log e FORM.chat-form ficam em 300 px.
- As regras antigas de cartões usavam #chat-log, elemento que não existe na estrutura observada; o histórico real usa .chat-log.
- PR #99 ajusta o CSS para os elementos reais, expande histórico/controles/compositor e reduz espaçamentos dos cartões.
- CI e contratos de regressão aprovados. Teste visual manual no Foundry VTT 14 build 360 ainda pendente.

## Atualização — chat com densidade adaptativa (branch de revisão)

- Acrescenta densidade responsiva baseada na largura real do contêiner do chat, via CSS Container Queries, sem alterar a largura padrão da sidebar.
- Em áreas estreitas, reduz somente padding e margens dos cartões; não diminui a fonte do texto.
- Em áreas mais largas, devolve espaçamento moderado para leitura.
- Imagens, vídeos, iframes e tabelas passam a respeitar a largura do conteúdo; tabelas largas podem rolar dentro da mensagem.
- Não altera a estrutura DOM do Foundry, handlers, controlador de abas, mensagens ou dados.
- Contratos de regressão ampliados para verificar os breakpoints de contêiner e o limite de mídia.
- Esta mudança é uma proposta em branch/PR. A validação visual no Foundry VTT 14 build 360 permanece necessária; não declarar concluída nem publicar release antes do teste manual.


## Atualização 1.0.0.112 — chat com densidade adaptativa

- PR #100 prepara o chat para ajustar espaçamentos conforme a largura real do contêiner, sem alterar a largura padrão da sidebar.
- Em áreas estreitas, reduz apenas padding e margens; em áreas mais largas, devolve espaçamento moderado.
- Mídia respeita a largura disponível e tabelas extensas rolam dentro da mensagem.
- CI e empacotamento automatizados devem ser confirmados na publicação desta versão.
- **Validação manual pendente:** chat estreito/largo, mídia, tabelas, compositor e rolagem no Foundry VTT 14 build 360. Não declarar estabilidade funcional antes do teste no cliente real.


## 1.0.0.120 — interação e isolamento do tema

- Estado canônico de seleção, grupo, Inspector e painel ativo com testes unitários.
- Configurações nativas isoladas dos estilos genéricos de aplicação.
- Ficha 800 × 800 e Canvas padrão em coluna única preservados.
- Validação manual no Foundry VTT 14 pendente.
