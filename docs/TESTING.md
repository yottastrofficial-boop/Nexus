# Estratégia de testes do NEXUS

## Objetivo

Complementar as validações estáticas do CI com testes funcionais executados em uma instalação real do Foundry VTT V14.

## Camadas

1. **Validação estática (CI):** sintaxe, manifesto, imports, templates, CSS e regressões determinísticas.
2. **Testes unitários:** funções puras, migrações, normalização, merge e cálculos sem depender do Foundry.
3. **Testes funcionais locais:** Playwright controla uma instância real do Foundry e verifica inicialização, permissões, criação de documentos e renderização das fichas.
4. **Validação manual:** inspeção visual, responsividade, usabilidade e cenários que exigem julgamento humano.

## Execução local

Consulte [tools/foundry-testing/README.md](../tools/foundry-testing/README.md) para instalar e executar o harness.

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
