# Roadmap

Este documento registra direções e prioridades do NEXUS. Não é uma promessa de entrega nem uma declaração de que os recursos listados já existem.

## Estado atual — 1.0.0.70

A versão publicada contém a ficha Canvas modular, componentes configuráveis, editor de propriedades, interações, Biblioteca, organização hierárquica de grupos e backup completo da Biblioteca.

A versão 1.0.0.70 passou pela validação automatizada de pacote. A validação visual e funcional em uma instalação real do Foundry VTT 14 permanece necessária. A versão não está declarada estável enquanto os defeitos relatados na ficha e nas interações não forem verificados.

## Prioridades imediatas

1. Corrigir regressões funcionais e eliminar execução duplicada de interações.
2. Consolidar a composição visual das perícias e a cascata CSS sem perder personalizações de tema.
3. Reforçar testes comportamentais dos fluxos, reduzindo dependência de verificações por texto/regex.
4. Revisar persistência, ciclo de vida da ficha, listeners e abertura de múltiplas janelas.
5. Reduzir acoplamento e tamanho dos módulos centrais por extrações pequenas e testáveis.
6. Atualizar documentação, changelog e manifesto somente quando o comportamento estiver validado.

## Arquitetura de módulos e propriedades

- Expandir o registro central de propriedades para módulos e metadados completos.
- Preservar identificadores estáveis quando nomes e apresentações mudarem.
- Definir regras de dependência, substituição e migração antes de permitir redefinições profundas.
- Evoluir a invalidação reativa para um grafo global de dependências com cálculo incremental e detecção explícita de ciclos.
- Consolidar o diálogo universal de rolagem sem duplicar regras de cálculo.

## Editor de fichas e componentes

- Evoluir os modelos de ficha reutilizáveis.
- Aprimorar a organização livre e hierárquica dos componentes.
- Manter uma estrutura interna compartilhada entre os modos de edição.
- Permitir importar, exportar e reutilizar componentes personalizados com validação e compatibilidade.

## Design, mídia e desempenho

- Consolidar a separação entre funcionalidade, formato e estilo.
- Evoluir temas e herança visual sem sobrescritas desnecessárias.
- Ampliar o gerenciamento de imagens, GIFs, vídeos e outros recursos.
- Medir gargalos antes de introduzir cache, carregamento sob demanda ou otimizações de renderização.

## Compatibilidade e qualidade

- Priorizar APIs públicas compatíveis com Foundry VTT 14.
- Testar fluxos completos dentro do Foundry, incluindo múltiplas fichas, janelas, Actors e usuários.
- Preservar dados existentes e documentar migrações.
- Manter a main e as releases utilizáveis; mudanças estruturais devem ser desenvolvidas em branches e integradas após CI e validação funcional.

## Critérios para considerar um recurso concluído

Um recurso só deve ser marcado como implementado quando seu comportamento estiver presente no código, seus dados e estados estiverem definidos, os fluxos relevantes tiverem testes, limitações conhecidas estiverem documentadas e a documentação refletir o comportamento real.