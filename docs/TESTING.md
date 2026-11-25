# Estratégia de testes do NEXUS

## Objetivo

Complementar as validações estáticas e unitárias do CI com testes funcionais executados em uma instalação real do Foundry VTT 14.

## Camadas

1. **Validação estática (CI):** sintaxe, manifesto, imports, templates, CSS, empacotamento e contratos de regressão.
2. **Testes unitários:** funções puras, migrações, normalização, merge e cálculos sem depender do Foundry.
3. **Testes funcionais locais:** Playwright controla uma instância real do Foundry e verifica inicialização, permissões, criação de documentos e renderização da ficha.
4. **Validação manual:** inspeção visual, responsividade, usabilidade e cenários que exigem julgamento humano.

## Executar o Testing Bridge

Consulte [tools/foundry-testing/README.md](../tools/foundry-testing/README.md).

O harness exige um mundo descartável, sessão GM e o ID exato do mundo por meio de `FOUNDRY_TEST_WORLD_ID`. A sessão é armazenada localmente em uma pasta ignorada pelo Git. O arquivo de estado de sessão pode permitir reutilizar o login e não deve ser compartilhado.

O smoke test atual confirma inicialização, mundo correto, sistema NEXUS, sessão GM e criação/renderização/remoção de um Actor temporário. Ele não executa os fluxos completos do Canvas, Biblioteca, Lógica ou Mídia.

## Regras

- Executar em mundo descartável, separado de campanhas.
- Não usar dados reais de jogadores.
- Criar dados temporários com identificadores claros e removê-los ao final.
- Preservar evidências de falha: relatório, screenshot, trace, vídeo e erros JavaScript.
- Distinguir teste estático, teste simulado e teste funcional no Foundry real.
- Nunca marcar uma versão como integralmente validada apenas porque o CI passou.

## Próximos cenários

- Persistência de valores vinculados e locais.
- Criação, edição, troca e exclusão de layouts.
- Inserção, configuração, duplicação e remoção de componentes.
- Grupos, seleção e operações do Canvas.
- Biblioteca e reutilização de componentes.
- Mídia e comportamento em diferentes resoluções.
- Duas fichas/janelas e concorrência de gravação.
- Atualização sobre a versão anterior preservando Actors e layouts.


## Diagnóstico funcional do sidebar V14

O harness `tools/foundry-testing` inclui `sidebar-diagnostic.spec.js`, que captura a hierarquia DOM real, geometrias, estilos calculados, classes/fontes de ícones e screenshot do sidebar no Foundry VTT 14. Esse relatório é a fonte necessária para orientar alterações estruturais posteriores; testes estáticos de seletores CSS não comprovam a disposição visual.


## Navegação compacta do sidebar — candidata 1.0.0.113

- [ ] Confirmar que todas as abas nativas e adicionadas por módulos permanecem visíveis em uma única linha.
- [ ] Verificar que a navegação não cria rolagem horizontal nem uma segunda linha.
- [ ] Alternar por clique entre todas as abas e confirmar que o controlador nativo mantém o painel correto.
- [ ] Conferir os estados normal, hover, ativo e foco por teclado.
- [ ] Confirmar que os ícones Font Awesome e SVG continuam com os glifos originais.
- [ ] Testar recolhimento/expansão da sidebar e restauração da navegação após reabrir.
- [ ] Testar com módulos que adicionam abas e registrar se a densidade prejudica a precisão dos cliques.
- [ ] Confirmar que a largura padrão da sidebar não foi alterada.
- [ ] Repetir em tema claro, escuro e alto contraste, no Foundry VTT 14 build 360.
- [ ] Não considerar a etapa validada apenas pela aprovação do CI; anexar captura real do cliente Foundry.
