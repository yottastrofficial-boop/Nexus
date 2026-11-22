# Auditoria da main — 2026-11-22

## Escopo e referência
Auditoria estática do repositório yottastrofficial-boop/Nexus, branch main, commit-base 4c80cbe3fadf2617ce5ca19f499c0af2ee73d89a, versão declarada 1.0.0.84, Foundry VTT V14. Foram inspecionados árvore, entrypoint, manifestos, workflows, documentação arquitetural, registry de mídia, motor de fórmulas, registry de propriedades, armazenamento/modelos da Biblioteca, migração de Actor, aliases e partes centrais do motor de interações.

Os cinco PDFs-base do NEXUS v0.1 foram localizados na Biblioteca do projeto. Esta rodada não altera regras, fórmulas mecânicas, custos, progressão ou conteúdo de jogo; portanto, não foi realizada alteração mecânica baseada nos livros. Qualquer futura mudança de regra deve consultar o PDF correspondente e registrar divergências para decisão do projeto.

## Constatações relevantes

### Corrigido nesta rodada
1. Identificação de AVIF: arquivos AVIF usam a estrutura ISO-BMFF/ftyp; a detecção anterior classificava qualquer ftyp como MP4. Agora as marcas avif/avis são verificadas antes do fallback MP4.
2. Assinatura do contêiner JPEG XL: a assinatura de contêiner agora valida o comprimento declarado de 12 bytes, reduzindo falsos positivos. A assinatura codestream JXL continua reconhecida.
3. Gravações concorrentes na Biblioteca: gravações simultâneas de coleções diferentes podiam partir do mesmo snapshot antigo e uma sobrescrever a outra. As operações de coleção e de atualização read-modify-write agora usam uma fila por usuário; o editor de metadados foi migrado para essa API.
4. Metadados da Biblioteca: a normalização declarava preservar metadados futuros, mas descartava campos desconhecidos no envelope canônico. Metadados adicionais agora sobrevivem ao ciclo de normalização.
5. Publicação acidental: o evento manual workflow_dispatch permitia executar o job de publicação sem um commit explícito de release. Agora a execução manual valida e empacota, mas somente um push em main com [release] pode publicar.
6. Caminho de atualização da Biblioteca: o editor de metadados passou a usar uma operação read-modify-write serializada, que busca o snapshot mais recente antes de alterar o item; gravações de coleção e de armazenamento completo compartilham a fila por usuário.
7. Gravações redundantes: foram removidas gravações diretas duplicadas de flags legadas imediatamente antes de writeNexusLibraryCollection; o serviço agora persiste o armazenamento canônico e faz o espelhamento legado em uma única operação.
8. Cobertura de regressão: foram adicionados testes para fórmulas, strings entre aspas/chaves, valores vazios, números negativos, ausência de execução JavaScript arbitrária, metadados preservados na normalização e mesclagem, concorrência entre gravação de coleção e atualização read-modify-write, caminhos inseguros, isolamento entre definição e instância, AVIF, MP4 e JXL.

### Limitações confirmadas — não declarar concluídas
- O registry de mídia não decodifica arquivos. Os adaptadores FFmpeg.wasm/libjxl, Workers, cache, conversão e storage adapters ainda precisam ser implementados e testados.
- O AV1 não é inferido a partir de WebM/MP4: a identificação real depende da inspeção das faixas/codecs.
- A área Lógica está especificada, mas não foi integrada como uma área única de interface nesta rodada.
- O armazenamento unificado da Biblioteca existe como serviço, mas sua integração ampla com todos os fluxos da interface e migração persistente deve ser verificada antes de substituir flags legadas.
- O entrypoint ainda registra a ficha principal monolítica; a ficha e o CSS não foram reescritos nem divididos nesta rodada.
- Os executores de interações e listeners dependentes continuam exigindo testes funcionais no Foundry com permissões e documentos reais.
- Não foi possível executar Foundry VTT nesta sessão. CI verde não comprova renderização, permissões, persistência real ou compatibilidade visual.

## Preservação
- Nenhuma regra dos livros foi alterada.
- Nenhuma versão estável ou release foi publicada.
- system.json e manifest.json permanecem em 1.0.0.84.
- Não foram removidos campos, flags legadas, aliases, componentes ou arquivos da ficha.
- O pacote é validado como artefato de CI; não deve ser anunciado como release estável sem teste real no Foundry V14.

## Próxima etapa
Prosseguir com auditoria orientada a dependências da ficha/Canvas e dos executores de interações. Antes de extrair ou remover qualquer bloco, mapear todos os leitores/escritores de dados persistidos e cobrir as rotas afetadas com testes. Em seguida, integrar a Biblioteca/Lógica por incrementos pequenos, mantendo os contratos atuais e leitores de compatibilidade.


## Continuação — infraestrutura 1.0.0.85

### Lógica

- Criado `logic-registry.js`: envelope comum, schemas registráveis, IDs estáveis, dependências tipadas, topological sort e detecção de ciclos.
- Criado `logic-library.js`: leitura compatível das coleções antigas, persistência canônica, exclusão protegida por dependentes e carregamento de fluxos legados com payload preservado.
- Criado `logic-runtime.js`: dispatch de comportamentos, avaliação de condições com o parser seguro, execução sequencial, permissões, limites e relatórios.
- Biblioteca schema 2: coleções `properties` e `functions`; backups atualizados.

### Mídia

- Criado `media-service.js`: inspeção, capabilities, decoder nativo de imagem e pipeline com adaptadores lazy/fallback.
- Adicionado contrato de Worker local com timeout, correlação de mensagens e runtime helper.
- Criado `media-storage.js`: upload Foundry pela API pública, backend externo plugável, IndexedDB cache e cache key SHA-256.
- Entry point expõe os serviços em `game.nexus.logic` e `game.nexus.media`.

### Limitações mantidas explícitas

- Nenhum binário WASM FFmpeg/libjxl está incluído; AV1/JXL não são declarados decodificados por fallback.
- Nenhum backend externo está configurado por padrão.
- A interface unificada Lógica ainda não foi construída.
- O teste funcional real no Foundry V14 build 360 continua pendente.
