# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit de referência: `HEAD da main`
- Distribuição: o manifesto original é a fonte única de instalação/atualização e só avança após CI, publicação e confirmação do asset.
- Versão candidata na main: `1.0.0.114` (retorno à sidebar vertical nativa, correção do Estúdio e ícones; validação automatizada e manual pendentes até CI).
- Última versão estável publicada no manifesto: `1.0.0.113`.
- Teste manual: a candidata `1.0.0.114` precisa confirmar sidebar vertical nativa, abertura/redimensionamento do Estúdio, ícones gerais, controles de janela e painéis no Foundry VTT 14 build 360.
- Commits posteriores à release: `08f521ca03a998f6fcc623e9e0193cc1ba7da247` (diagnóstico Playwright) e `34c114539e04e67151dbcf806283503e91c3cdf0` (isolamento tipográfico e consolidação dos estilos).
- A candidata .114 remove os overrides de geometria da sidebar; não declarar a restauração concluída até confirmar navegação, ícones e conteúdo no Foundry VTT 14 build 360.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A publicação da 1.0.0.98 concluiu CI (37/37 arquivos de teste), geração do pacote e confirmação do asset; a validação funcional no Foundry real permanece pendente.
- Alvo: Foundry VTT 14, build 360.
- Estado: projeto em desenvolvimento pós-release; CI automatizado por commit; a validação funcional/visual no Foundry real permanece pendente.

## Candidata 1.0.0.114 — sidebar nativa, Estúdio e ícones

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
