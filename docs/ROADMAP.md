# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit: `branch feature/library-unified-explorer-1.0.0.90 — em revisão`
- Versão candidata para teste: `1.0.0.90` (a última publicada permanece `1.0.0.89`)
- Alvo: Foundry VTT 14, build 360.
- Estado: build candidato para validação manual da ficha; não declarar estabilidade funcional completa sem os testes reais descritos em `RELEASE_STABILITY_POLICY.md`.

## Estado atual por domínio

### Ficha e Canvas

- A ficha Canvas e os componentes configuráveis estão implementados.
- Grupos possuem hierarquia e composição estrutural; não são apenas decoração CSS.
- A classe principal da ficha e alguns controladores ainda concentram muitas responsabilidades.
- A refatoração deve mapear dependências, leitores/escritores e eventos antes de extrair ou remover código.

### Biblioteca

- Existe armazenamento unificado com coleções, preferências, backups e compatibilidade de leitura legada.
- A interface Explorer possui navegação universal, visão de todos os itens salvos, favoritos, recentes, pastas livres, filtros de etiquetas dinâmicos, cartões padronizados, grade/lista e Inspector contextual.\n- O Inspector permite editar metadados, organizar por pastas, duplicar e excluir itens salvos; exclusão de ativos lógicos com dependentes é bloqueada.\n- A visão universal é agregadora; ações específicas de inserção/aplicação continuam disponíveis nas áreas especializadas correspondentes.
- Definições reutilizáveis e instâncias inseridas na ficha devem continuar isoladas.
- Editores especializados completos para todos os tipos e aplicação direta de qualquer tipo a partir da visão universal ainda não estão concluídos; a validação visual/funcional no Foundry real permanece pendente.
- Pastas, favoritos, recentes, metadados e operações de duplicação/exclusão/importação exigem testes de persistência em cenário real.

### Lógica

- A infraestrutura possui registry tipado, dependências, detecção de ciclos, persistência e runtime declarativo.
- Os cinco tipos permanecem distintos: Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões.
- A navegação/Inspector inicial existe, mas editores especializados, schemas completos, executores registrados e integração ponta a ponta continuam pendentes.
- Payloads lógicos importados devem permanecer inertes até serem validados por um editor e contrato específico.

### Mídia

- Existe registry de formatos, serviço de capabilities, pipeline, contrato de Workers, adaptador de upload Foundry e cache IndexedDB.
- A infraestrutura não inclui, por si só, decodificadores WASM especializados.
- FFmpeg/libdav1d/libopus/libjxl, conversão efetiva e backend externo compartilhado continuam pendentes de implementação, licença, hash, distribuição e teste.
- Não declarar suporte a AV1/JXL apenas pela extensão ou pelo contêiner.

### Persistência e migrações

- Migrações explícitas e idempotentes são a regra.
- Mudanças de schema devem preservar dados desconhecidos e proteger Actors com schema futuro.
- A fila de gravações local ao cliente não equivale a transação distribuída entre usuários diferentes.
- Cenários concorrentes precisam ser testados no Foundry real.

## Prioridades aprovadas

1. **Estabilidade funcional:** reproduzir erros reportados, validar abertura/fechamento de fichas, edição, salvamento, múltiplas janelas, tokens, Biblioteca e migrações no Foundry VTT 14 build 360.
2. **Auditoria de persistência:** mapear todos os leitores e escritores de Actor, Item, layouts, Biblioteca, aliases e flags legadas antes de alterar contratos.
3. **Biblioteca:** validar CRUD, persistência, pastas, filtros, backups, importação/exportação e isolamento definição/instância.
4. **Lógica:** concluir schemas, validadores e editores específicos; integrar executores e permissões com testes de ponta a ponta.
5. **Refatoração da ficha:** extrair responsabilidades por domínio, mantendo contratos explícitos e testes de regressão; evitar reescrita integral.
6. **CSS e templates:** mapear seletores e ordem da cascata; remover duplicações somente após comparação visual e testes.
7. **Mídia:** implementar adaptadores especializados somente com inventário verificável de codecs, licenças, hashes, fallback e limites de armazenamento.
8. **Higiene do repositório:** reconciliar branches divergentes, documentar decisões e arquivar linhas antigas sem apagar histórico útil.
9. **Documentação:** manter README, arquitetura, roadmap, changelog e política de release coerentes com o código e com o pacote publicado.

## Critérios para concluir uma etapa

- Escopo pequeno e explícito.
- Arquivos e contratos afetados identificados.
- Testes de regressão para comportamento anterior e novo.
- Nenhuma alteração mecânica sem referência ao livro oficial correspondente.
- Migração idempotente quando houver mudança persistida.
- CI e pacote aprovados.
- Teste real no Foundry quando a mudança afetar interface, ciclo de vida, permissões, persistência ou APIs do Foundry.
- Limitações e cenários não testados registrados sem declarar sucesso antecipadamente.

## Não objetivos

- Não mesclar branches antigas em bloco.
- Não remover arquivos ou flags legadas antes de mapear consumidores.
- Não publicar uma versão como funcionalmente estável apenas porque o ZIP foi gerado.
- Não prometer suporte literal a qualquer formato de mídia.
- Não armazenar originais grandes em flags/JSON de Actor ou Item.
- Não converter originais silenciosamente.
- Não introduzir fórmulas mecânicas implícitas ou universais para todos os módulos.
