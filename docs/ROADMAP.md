# Roadmap NEXUS

Este documento registra prioridades e decisões de arquitetura; não declara recursos planejados como concluídos.

## Estado de referência
- Código-base auditado: branch main no commit 4c80cbe3fadf2617ce5ca19f499c0af2ee73d89a, antes desta rodada.
- Versão distribuída indicada por system.json e manifest.json: 1.0.0.84.
- Foundry declarado: V14.
- A Biblioteca possui armazenamento unificado, preferências, modelos de definição/instância, compartilhamento e interface Explorer em evolução; a consolidação da interface ainda não está concluída.
- Propriedades, fórmulas e interações possuem implementações e documentação próprias; a área Lógica ainda precisa de integração de interface e contratos de dependência.
- A ficha principal, templates e CSS ainda concentram responsabilidades e exigem extração gradual.
- O registry de mídia identifica formatos e organiza adaptadores; decodificação, conversão, preview especializado e storage adapters ainda não estão concluídos.

## Prioridades aprovadas
1. Auditar árvore, imports, estado persistido, dependências e testes antes de substituições.
2. Consolidar Lógica para Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões, mantendo modelos e executores especializados.
3. Formalizar contratos de ativos, referências, dependências, permissões e versões.
4. Refatorar dados/propriedades/regras antes de reconstruir componentes e fichas.
5. Reconstruir a Biblioteca como Explorador com Inspector contextual e editores por tipo.
6. Implementar infraestrutura de mídia própria, começando por identificação e registro de adaptadores.
7. Avaliar FFmpeg.wasm customizado com libdav1d (AV1), libopus (Opus) e libjxl (JXL); manter decoder JXL especializado como alternativa.
8. Implementar storage adapters para arquivos que o upload Foundry não aceite, sem falsificar extensões.
9. Consolidar CSS/templates e remover legado após migrações verificadas.
10. Validar em instalação real Foundry V14 antes de publicar versão estável.

## Não objetivos
- Não prometer suporte literal a qualquer formato existente.
- Não armazenar originais grandes em flags/JSON de Actor ou Item.
- Não converter originais silenciosamente.
- Não remover legado antes de validar consumidores.
- Não atualizar o manifesto para versão sem pacote de release confirmado.
