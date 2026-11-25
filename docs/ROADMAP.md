# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit de referência: `HEAD da main`
- Distribuição: o manifesto original é a fonte única de instalação/atualização e só avança após CI, publicação e confirmação do asset.
- Versão distribuída: `1.0.0.107` (release, ZIP e manifesto confirmados).
- Teste manual: `1.0.0.107` foi publicada após CI, empacotamento, verificação do asset `nexus.zip` e sincronização do manifesto. O layout visual e a troca de abas ainda aguardam conferência do mantenedor no Foundry VTT 14 build 360.
- Commits posteriores à release: `08f521ca03a998f6fcc623e9e0193cc1ba7da247` (diagnóstico Playwright) e `34c114539e04e67151dbcf806283503e91c3cdf0` (isolamento tipográfico e consolidação dos estilos).
- A revisão CSS está distribuída na `1.0.0.107` para validação manual. Não declarar o sidebar funcionalmente concluído até confirmar navegação, ícones e conteúdo no Foundry VTT 14 build 360.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A publicação da 1.0.0.98 concluiu CI (37/37 arquivos de teste), geração do pacote e confirmação do asset; a validação funcional no Foundry real permanece pendente.
- Alvo: Foundry VTT 14, build 360.
- Estado: projeto em desenvolvimento pós-release; CI automatizado por commit; a validação funcional/visual no Foundry real permanece pendente.

## Próxima etapa — correção orientada pelo diagnóstico do sidebar V14

As PRs #89 e #91 foram integradas à main. O teste `tools/foundry-testing/tests/sidebar-diagnostic.spec.js` coleta a árvore DOM de `game.sidebar.element`, ancestrais, geometrias, estilos calculados, fontes de ícones e screenshot no Foundry 14. A PR #91 isolou o sidebar das regras globais de tipografia, removeu a atribuição de `font-family: inherit` aos controles nativos e centralizou os estilos das abas em `nexus-design-system.css`. CI e empacotamento passaram. A etapa seguinte é executar o diagnóstico no mundo descartável e validar o layout horizontal, os ícones e a troca de abas no cliente real. Não considerar o sidebar concluído nem publicar nova release antes dessa validação.

## Atualização 1.0.0.105 — correção estrutural do sidebar

Corrige a aplicação das regras do Minimal UI à estrutura ApplicationV2 do Foundry V14. A navegação alcança `.sidebar-tabs` e `.tab.sidebar-tab` dentro do contêiner real, organiza os botões em faixa horizontal e mantém os elementos, handlers, ordem DOM e fontes de ícones nativas. A validação visual no Foundry VTT 14 build 360 permanece pendente.

## Atualização 1.0.0.104

Corrige o erro de construção do Estúdio de Aparência causado por opções de janela congeladas recebidas pelo menu do Foundry. O código agora clona as opções herdadas e as estruturas mutáveis antes da construção da ApplicationV2. A navegação nativa do sidebar passa para uma faixa superior horizontal, mantendo a ordem DOM original do Foundry (de cima para baixo convertida em esquerda para direita). As classes Font Awesome legadas são excluídas da tipografia global. A validação no cliente Foundry VTT 14 build 360 permanece pendente.


## Correção direta do sidebar — commit 417acb4f663ba328e30f28db70ab976af0f18669

A pedido do usuário, esta rodada não utiliza Playwright nem exige diagnóstico automatizado no navegador. O CSS do sidebar foi refeito diretamente na `main` para separar explicitamente a navegação dos painéis ApplicationV2: os controles de navegação são os elementos `.item` dentro de `#sidebar-tabs`/ `.sidebar-tabs`; os elementos `.tab.sidebar-tab` são tratados como painéis de conteúdo e não recebem dimensões de botão. A navegação passa a ser selecionada diretamente por ID e por classes de compatibilidade, com layout horizontal flexível, quebra de linha, estados de foco/seleção e preservação dos glifos nativos. O usuário fará a validação visual e funcional no Foundry VTT 14. Esta alteração ainda não é uma release nem altera a versão distribuída `1.0.0.106`.


## Atualização 1.0.0.107 — pacote para teste manual

A versão `1.0.0.107` está publicada na release `v1.0.0.107`, com ZIP confirmado e manifesto sincronizado. Ela contém a revisão do sidebar integrada no commit `417acb4f663ba328e30f28db70ab976af0f18669`, além dos ajustes de estilo e dos contratos de regressão desta etapa. O objetivo do teste manual é confirmar a navegação horizontal, os glifos nativos, a troca de abas e a exibição dos painéis. Não foi executado Playwright nem teste de navegador. A publicação do pacote não altera o estado de validação: o sidebar só será considerado concluído após confirmação manual no cliente real.
