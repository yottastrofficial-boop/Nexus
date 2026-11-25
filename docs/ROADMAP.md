# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit de referência: `HEAD da main`
- Distribuição: o manifesto original é a fonte única de instalação/atualização e só avança após CI, publicação e confirmação do asset.
- Versão distribuída: `1.0.0.106` (release, ZIP e manifesto confirmados).
- Commit posterior à release: `08f521ca03a998f6fcc623e9e0193cc1ba7da247` (diagnóstico Playwright do sidebar e preservação da tipografia nativa).
- Sidebar ainda defeituoso no cliente real: abas verticais, conteúdo sobreposto e ícones renderizados como quadrados. Não iniciar nova release antes de analisar o DOM/estilos reais.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A publicação da 1.0.0.98 concluiu CI (37/37 arquivos de teste), geração do pacote e confirmação do asset; a validação funcional no Foundry real permanece pendente.
- Alvo: Foundry VTT 14, build 360.
- Estado: projeto em desenvolvimento pós-release; CI automatizado por commit; a validação funcional/visual no Foundry real permanece pendente.

## Próxima etapa — correção orientada pelo diagnóstico do sidebar V14

A PR #89 foi integrada à main. O teste `tools/foundry-testing/tests/sidebar-diagnostic.spec.js` coleta DOM real, geometrias, estilos calculados, fontes de ícones e screenshot no Foundry 14. A etapa seguinte é executar esse teste no mundo descartável e usar os dados para implementar o layout horizontal e corrigir os glifos. A remoção do override de família tipográfica foi integrada, mas ainda não validada visualmente. Não considerar o sidebar concluído.

## Atualização 1.0.0.105 — correção estrutural do sidebar

Corrige a aplicação das regras do Minimal UI à estrutura ApplicationV2 do Foundry V14. A navegação alcança `.sidebar-tabs` e `.tab.sidebar-tab` dentro do contêiner real, organiza os botões em faixa horizontal e mantém os elementos, handlers, ordem DOM e fontes de ícones nativas. A validação visual no Foundry VTT 14 build 360 permanece pendente.

## Atualização 1.0.0.104

Corrige o erro de construção do Estúdio de Aparência causado por opções de janela congeladas recebidas pelo menu do Foundry. O código agora clona as opções herdadas e as estruturas mutáveis antes da construção da ApplicationV2. A navegação nativa do sidebar passa para uma faixa superior horizontal, mantendo a ordem DOM original do Foundry (de cima para baixo convertida em esquerda para direita). As classes Font Awesome legadas são excluídas da tipografia global. A validação no cliente Foundry VTT 14 build 360 permanece pendente.
