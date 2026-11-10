# NEXUS — Arquitetura técnica e plano de estabilização 1.0.0.2

## Estado deste documento

Este documento registra os limites de responsabilidade desejados para a refatoração incremental. Ele não declara que os módulos descritos já existem nem autoriza uma reescrita integral.

## Princípios que não podem regredir

1. Dados do personagem e configuração/aparência da ficha têm ownership separado.
2. Preparação de contexto deve ser predominantemente leitura; migrações persistentes devem ser explícitas, idempotentes e controladas.
3. Alterações visuais não podem alterar regras ou valores do personagem.
4. IDs internos permanecem estáveis e independentes dos rótulos exibidos.
5. A extração de módulos deve preservar os contratos e o comportamento existentes.
6. Usar APIs públicas compatíveis com Foundry VTT V14.
7. Não declarar teste real no Foundry sem executá-lo em uma instalação real.

## Responsabilidades-alvo

| Área | Responsabilidade | Não deve assumir |
|---|---|---|
| Inicialização | Registrar sistema, documentos e fichas | Persistência de layouts |
| Sheet coordinator | Ciclo de vida da ficha e coordenação da interface | Implementar todos os serviços |
| Persistence | Ler/gravar dados de layout e configuração | Definir apresentação visual |
| Migration | Detectar e converter estruturas legadas | Rodar gravações dentro de preparação de contexto |
| Component registry | Definições e metadados dos componentes | Guardar estado específico de cada personagem |
| Component renderer | Transformar instâncias em contexto/renderização | Decidir regras de jogo |
| Editor/Canvas | Seleção, gestos, posicionamento e ferramentas | Persistir diretamente o mapa completo |
| Groups | Relações estruturais e operações de grupo | Ser apenas decoração CSS |
| Library | Definições reutilizáveis e importação/exportação | Alterar instâncias sem confirmação |
| Design system | Tokens, temas e estilos | Alterar dados ou mecânicas |
| Media | Resolver e apresentar mídia | Executar conteúdo não confiável |

## Sequência segura de refatoração

### Etapa 0 — Linha de base
- Preservar a implementação estável 1.0.0.1.
- Validar manifesto, imports relativos, sintaxe, templates e pacote.
- Registrar limitações e cenários ainda não testados.

### Etapa 1 — Persistência e migrações
- Mapear todos os leitores e escritores de layouts, aliases e flags.
- Definir invariantes e ownership de cada campo.
- Separar normalização em memória de migração persistente.
- Garantir idempotência e comportamento de falha seguro.
- Investigar concorrência com testes reproduzíveis antes de introduzir fila, lock ou merge.

### Etapa 2 — Testes de regressão
- Testar valores zero, strings vazias, checkbox, select, tabelas, campos locais e propriedades vinculadas.
- Testar criar, renomear, alternar e excluir layouts.
- Testar migração de formatos antigos e repetição da migração.
- Testar duas alterações concorrentes e comprovar que nenhuma atualização é perdida.

### Etapa 3 — Extração incremental
- Extrair primeiro funções puras e registries sem dependência de DOM.
- Em seguida separar persistência e migrações com contratos explícitos.
- Depois separar renderer, biblioteca e ferramentas do Canvas.
- Manter a classe da ficha como coordenadora até que cada módulo esteja validado.
- Atualizar imports e executar a suíte após cada extração.

### Etapa 4 — CSS e templates
- Organizar CSS por domínio (base, ficha, Canvas/editor, biblioteca, painéis, temas).
- Preservar a ordem da cascata durante a primeira reorganização.
- Remover regras duplicadas somente após comparação visual e testes de regressão.
- Extrair Handlebars para partials por região funcional, mantendo a estrutura e os seletores esperados.

### Etapa 5 — Validação de release
- Instalação limpa e atualização sobre 1.0.0.1.
- Verificação de preservação dos Actors e layouts existentes.
- Teste de abrir/fechar/reabrir fichas, múltiplas fichas e múltiplas janelas.
- Teste real no Foundry VTT V14.
- Gerar ZIP, validar sua raiz e confirmar o manifesto de distribuição.

## Critério de conclusão

A versão 1.0.0.2 só deve ser publicada quando os fluxos essenciais tiverem sido validados. Se um teste depender do Foundry real e ainda não tiver sido executado, a limitação deve permanecer explícita e a release não deve ser descrita como integralmente validada.
