# Roadmap

Este documento registra direções e prioridades do NEXUS. Não é uma promessa de entrega nem uma declaração de que os recursos listados já existem.

## Estado atual — 1.0.0.79 publicada; 1.0.0.80 em desenvolvimento

A versão 1.0.0.71 consolida a ficha Canvas modular, componentes configuráveis, editor de propriedades, interações, Biblioteca, organização hierárquica, backup completo e uma rodada de estabilização dos listeners, persistência de propriedades, aliases e controladores de perícias/recursos.

A validação automatizada de pacote, sintaxe, regressões e empacotamento passou no GitHub Actions, e a release `v1.0.0.71` foi publicada com o pacote `nexus.zip`. A validação visual e funcional em uma instalação real do Foundry VTT 14 permanece necessária; portanto, esta versão não está declarada estável.

## Prioridades imediatas

1. Executar testes funcionais e visuais no Foundry VTT 14, incluindo múltiplas janelas e usuários.
2. Validar concorrência e recuperação de falhas na persistência de aliases, dados personalizados e layouts.
3. Consolidar a composição visual das perícias e a cascata CSS sem perder personalizações de tema.
4. Reforçar testes comportamentais dos fluxos, reduzindo gradualmente dependência de verificações por texto/regex.
5. Continuar extrações por domínio apenas quando reduzirem acoplamento sem fragmentar excessivamente os módulos.
6. Publicar a release somente após a validação funcional e a revisão de compatibilidade.

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

## Biblioteca funcional — implementação incremental

### Fundação iniciada na 1.0.0.80
- Contrato unificado para componentes, grupos, layouts, modelos, assets, mídia, temas, estilos, regras, comportamentos e fluxos.
- Normalização de dados JSON com limites de profundidade, tamanho e quantidade.
- Migração explícita em memória das flags legadas para o novo formato.
- Merge com políticas de conflito skip, duplicate e replace; a interface deve exigir escolha explícita antes de substituir definições.
- Backup completo NEXUS-LIBRARY/2, com leitura retrocompatível de NEXUS-LIBRARY/1.

### Próximas etapas obrigatórias
1. Adaptador de persistência canônica com migração segura e verificação de integridade antes de gravar.
2. Interface unificada para pesquisar, filtrar, categorizar, favoritar, renomear, duplicar, excluir e visualizar entradas.
3. Salvar/importar/exportar individualmente cada tipo de entrada, mantendo relações internas e IDs remapeados na instanciação.
4. Versões de definições e atualização opcional das instâncias, sem propagar mudanças silenciosamente.
5. Separar referências de mídia e metadados dos arquivos binários, respeitando permissões e limitações do Foundry.
6. Definir schemas próprios para regras, estilos e comportamentos antes de habilitar edição/execução avançada.
7. Testar migração, importação parcial, conflito, backup antigo, backup novo e recuperação após falha no Foundry V14.

A etapa 1.0.0.80 não declara a Biblioteca completa; ela inicia a fundação de dados e o formato de intercâmbio.
