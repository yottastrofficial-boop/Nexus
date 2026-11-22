# Roadmap NEXUS

Este documento registra prioridades e decisões de arquitetura; não declara recursos planejados como concluídos.

## Estado de referência
- Código-base auditado: branch main no commit 4c80cbe3fadf2617ce5ca19f499c0af2ee73d89a, antes desta rodada.
- Versão em preparação para distribuição: 1.0.0.87 (Foundry V14).
- Foundry declarado: V14.
- A Biblioteca possui armazenamento unificado, preferências, modelos de definição/instância, compartilhamento e interface Explorer. A 1.0.0.87 inicia a área Lógica visível e acrescenta modos de visualização e Inspector contextual; editores especializados completos ainda estão pendentes.
- Propriedades, fórmulas e interações mantêm seus contratos; a infraestrutura de ativos, dependências e runtime da Lógica foi implementada. A interface unificada e os schemas específicos ainda precisam evoluir.
- A ficha principal, templates e CSS ainda concentram responsabilidades e exigem extração gradual.
- A mídia possui registry, capacidades nativas, pipeline com fallback, contrato de Worker, storage Foundry/externo e cache IndexedDB; binários FFmpeg/libjxl e conversão efetiva permanecem pendentes.

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


## Entregue na 1.0.0.85

- Registro tipado de ativos de Lógica, validação plugável, grafo de dependências e detecção de ciclos.
- Persistência dos cinco tipos lógicos em coleções próprias, incluindo migração de leitura compatível e backups atualizados.
- Runtime declarativo com condições seguras, executores registrados, permissões e limites.
- Pipeline de mídia com capacidades nativas, adaptadores sob demanda, Workers locais, upload Foundry, storage externo plugável e cache IndexedDB.
- Testes automatizados específicos para as novas infraestruturas.

## Próximas etapas

1. Construir a área visual unificada Lógica e seus editores especializados.
2. Compilar e distribuir builds WASM próprios com inventário verificável de codecs, licenças e hashes.
3. Integrar e testar um decoder libjxl e um core FFmpeg customizado com AV1/Opus.
4. Configurar/testar um backend externo compartilhado para originais que o Foundry não aceite.
5. Validar os fluxos no Foundry VTT 14 build 360 antes de declarar estabilidade funcional.


## Entregue na 1.0.0.87 — primeira etapa visual da Lógica
- A navegação da Biblioteca agrupa os cinco subtipos de Lógica sem fundir seus contratos.
- Propriedades e Funções passam a ser navegáveis junto de Regras e Comportamentos; Fluxos permanecem com seu editor/listagem existente.
- O Inspector exibe previews visuais e payloads lógicos como texto inerte, além de metadados de dependências e permissões.
- Coleções genéricas passam a oferecer grade/lista e três tamanhos de miniatura.
- A edição de metadados tenta sincronizar o registry em memória, sem alterar o payload do ativo.
- Próximo passo: editores especializados e criação/edição validada de payloads por subtipo, seguida de testes reais no Foundry.


## Em desenvolvimento — estabilização da Biblioteca

- [x] Inspector com navegação compacta por ícones e seções separadas.
- [x] Atualização do Inspector após salvar metadados.
- [x] Filtros de origem e coleção em seletores compactos.
- [x] Controles de grade/lista por ícones e organização em duas linhas de ferramentas.
- [x] Barra de recurso genérica sem vínculo padrão com PV.
- [x] Remoção do marcador de proficiência da Biblioteca, preservando os dados e cálculos de perícia.
- [ ] Testar a rolagem, as dimensões dos cartões e o Inspector no Foundry V14 build 360.
- [ ] Investigar minimização/restauração da ficha com o DOM real da janela.
- [ ] Criar prévias fiéis dos componentes salvos a partir dos modelos de instância, sem executar conteúdo importado.
- [ ] Implementar editores especializados de propriedades e ativos lógicos com validação.

