# Modularização da ficha NEXUS

## Objetivo

Reduzir o acoplamento e o tamanho dos arquivos centrais sem mudar o comportamento funcional nem o formato de dados já persistido. A ficha principal permanece como fachada de integração com o Foundry VTT; cada domínio concentra sua própria responsabilidade.

## Regras de refatoração

1. Extrair uma responsabilidade por vez, em módulos ES independentes.
2. Manter `NexusActorSheet` como fachada pública registrada no Foundry.
3. Preservar IDs, flags, layouts, componentes, aliases e fluxos salvos.
4. Não alterar simultaneamente arquitetura, formato persistido e regras de jogo.
5. Manter dependências explícitas e direção de dependência clara.
6. Validar referências de importação, sintaxe, regressões e comportamento no Foundry após cada extração.
7. Só introduzir carregamento sob demanda depois de medir o custo real e verificar a compatibilidade com a inicialização do Foundry.

## Organização atual

```text
scripts/
  core/
    property-catalog.js       # Catálogo e metadados das propriedades
    skills.js                 # Regras e valores derivados das perícias
    theme.js                  # Tokens, temas e layout padrão
    interactions.js           # Motor de fluxos
    migration-manager.js      # Migrações persistidas
    layout-merge.js            # Mesclagem de alterações concorrentes em layouts
  sheets/
    actor-sheet-v1.0.0.js     # Fachada/lifecycle e coordenação da ficha
    actor-sheet-listeners.js  # Ligações de eventos da ficha e Inspector
    actor-sheet-rendering.js  # Renderização de mídia rica e conteúdo adaptativo
    canvas-interactions.js    # Seleção, gestos, alinhamento e teclado
    library-view.js           # Montagem da Biblioteca de assets, temas e fluxos
    panel-window.js           # Janela dos painéis flutuantes
    property-picker-view.js   # Renderização da navegação de propriedades
```

## Extrações incluídas nesta atualização

- Tema e layout padrão movidos para `core/theme.js`.
- Catálogo hierárquico movido para `core/property-catalog.js`.
- Janela flutuante movida para `sheets/panel-window.js`.
- Renderização do seletor movida para `sheets/property-picker-view.js`.
- Ligações de eventos movidas para `sheets/actor-sheet-listeners.js`.
- Gestos, seleção, alinhamento, atalhos e interações do Canvas movidos para `sheets/canvas-interactions.js`.
- Montagem da Biblioteca movida para `sheets/library-view.js`.
- Renderização de mídia rica e conteúdo adaptativo movida para `sheets/actor-sheet-rendering.js`.

A fachada mantém os métodos chamados pelo ciclo de vida do Foundry e delega o trabalho aos módulos. Os módulos recebem a ficha explicitamente, evitando depender de um `this` implícito fora da classe.

## Limites e próxima etapa

A modularização desta etapa separa os domínios principais sem reescrever a ficha. O arquivo de listeners ainda concentra vários fluxos de Propriedades, Comportamento e Biblioteca; uma etapa futura pode dividi-lo por domínio, desde que a extração preserve a ordem dos eventos e as dependências. O contexto de componentes também permanece na fachada por estar fortemente ligado ao estado do Actor e ao layout ativo.

Não fazer uma reescrita integral em um único commit. Cada nova extração deve terminar com testes automatizados e validação dentro do Foundry VTT 14.

## Desempenho: distinção importante

Dividir um arquivo em vários módulos melhora legibilidade, isolamento e manutenção, mas não reduz automaticamente CPU ou memória. Se todos os módulos forem importados na inicialização, o navegador ainda carregará a lógica. Para reduzir custo de execução, primeiro medir gargalos e depois considerar lazy loading, cache e renderização sob demanda em pontos específicos.
