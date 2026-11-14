# Modularização da ficha NEXUS

## Objetivo

Reduzir o acoplamento e o tamanho dos arquivos centrais sem mudar o comportamento funcional nem o formato de dados já persistido. A ficha principal deve permanecer como fachada de integração com o Foundry VTT; cada domínio deve concentrar sua própria responsabilidade.

## Regras de refatoração

1. Extrair uma responsabilidade por vez, em módulos ES independentes.
2. Manter `NexusActorSheet` como fachada pública registrada no Foundry.
3. Preservar IDs, flags, layouts, componentes, aliases e fluxos salvos.
4. Não alterar simultaneamente arquitetura, formato persistido e regras de jogo.
5. Cada módulo deve ter dependências explícitas e direção de dependência clara.
6. Validar referências de importação, sintaxe, regressões e comportamento no Foundry após cada extração.
7. Só introduzir carregamento sob demanda depois de medir o custo real e verificar a compatibilidade com a inicialização do Foundry.

## Organização-alvo

```text
scripts/
  core/
    property-catalog.js       # Catálogo e metadados das propriedades
    skills.js                 # Regras e valores derivados das perícias
    theme.js                  # Tokens, temas e layout padrão
    interactions.js           # Motor de fluxos
    migration-manager.js      # Migrações persistidas
  sheets/
    actor-sheet-v1.0.0.js     # Fachada/lifecycle da ficha
    actor-sheet-listeners.js  # Ligações de eventos e delegação
    panel-window.js           # Janela dos painéis flutuantes
    property-picker-view.js   # Renderização da navegação de propriedades
    canvas-interactions.js    # Seleção, gestos, alinhamento e teclado
    library-view.js           # Futuro: Biblioteca e pré-visualizações
    inspector-view.js         # Futuro: Propriedades e Comportamento
    rendering.js              # Futuro: montagem e renderização dos componentes
```

## Etapas

### Extrações incluídas nesta atualização

- Tema e layout padrão movidos para `core/theme.js`.
- Janela flutuante movida para `sheets/panel-window.js`.
- Catálogo hierárquico movido para `core/property-catalog.js`.
- Renderização do seletor movida para `sheets/property-picker-view.js`.
- Ligações de eventos da ficha movidas para `sheets/actor-sheet-listeners.js`.
- Gestos, seleção, alinhamento, atalhos e interações do Canvas movidos para `sheets/canvas-interactions.js`.

### Próximas extrações

1. Canvas: mover seleção, marquee, arrastar/redimensionar, atalhos e alinhamento para `canvas-interactions.js`.
2. Biblioteca: separar montagem, busca, prévias e ações da Biblioteca em `library-view.js`.
3. Inspector: separar renderização e atualização de Propriedades/Comportamento em `inspector-view.js`.
4. Renderização: extrair funções de composição e atualização de componentes para `rendering.js`.

Cada etapa deve terminar com testes antes de começar a seguinte. Não fazer uma reescrita integral da ficha em um único commit.

## Desempenho: distinção importante

Dividir um arquivo em vários módulos melhora legibilidade, isolamento e manutenção, mas não reduz automaticamente o uso de CPU ou memória: se todos os módulos forem importados e executados na inicialização, o navegador ainda carregará a mesma lógica. Para reduzir custo de execução, primeiro devemos medir gargalos e depois considerar lazy loading, cache e renderização sob demanda em pontos específicos.
