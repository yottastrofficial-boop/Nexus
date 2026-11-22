# Biblioteca NEXUS — contrato de definições e instâncias

## Objetivo

A Biblioteca funciona como um explorador de conteúdos reutilizáveis. A navegação por tipo/pasta é independente do tipo técnico do conteúdo; a área central apresenta cartões com miniatura, título e metadados; o inspector contextual à direita permite pré-visualizar e preparar uma configuração antes de aplicá-la.

## Três áreas persistentes

1. **Navegação:** categorias, pastas, favoritos, recentes, itens pessoais e conteúdos padrão do NEXUS.
2. **Explorador:** cartões consistentes de componentes, grupos, layouts, modelos, temas, estilos, regras, comportamentos, fluxos e mídia.
3. **Inspector:** detalhes, prévia, configurações específicas do tipo, relações/dependências e ações de aplicação/salvamento.

As categorias e pastas organizam itens, mas não alteram seu tipo semântico. Um grupo pode estar na pasta Combate e continua sendo um grupo.

## Definição e instância

- **Definição:** modelo reutilizável salvo na Biblioteca, identificado por ID estável e versão.
- **Rascunho de instância:** cópia temporária das configurações no inspector, editável antes da inserção.
- **Instância:** cópia inserida no layout de um Actor, com ID próprio, referência à definição de origem e overrides próprios.

A inserção não altera a definição. A edição de uma instância não altera outras instâncias nem o modelo. A edição de um modelo não propaga mudanças automaticamente para instâncias existentes.

### Componentes

As funções createLibraryDefinition e createLibraryComponentInstance normalizam uma definição e criam uma cópia independente, com novo ID e campos libraryDefinitionId, libraryDefinitionVersion e libraryOverrides.

As personalizações feitas no inspector são passadas como overrides; os valores não alterados continuam herdados do modelo no momento da criação da instância. Restaurar o padrão significa descartar o rascunho de overrides antes de inserir.

### Grupos

Um grupo salvo é uma composição autocontida de componentes e subgrupos. O inspector permite preparar uma cópia com nome, tipo, organização, espaçamento, preenchimento e colunas próprios. Ao inserir, os IDs dos componentes e grupos são recriados e as referências internas remapeadas. Os overrides do inspector afetam apenas o grupo raiz da nova composição.

## Temas

Temas padrão são somente leitura. O inspector permite pré-visualizar uma paleta, aplicar o tema original ou salvar uma cópia personalizada e aplicá-la. Nunca substituir um tema padrão silenciosamente.

## Persistência e compatibilidade

- As definições pessoais continuam no escopo do usuário.
- Instâncias pertencem ao layout do Actor.
- Importar/duplicar deve criar identidades novas e relatar conflitos, sem sobrescrever silenciosamente.
- Dados legados de componentes continuam legíveis; ao inserir, são normalizados para a forma atual.
- Conteúdo importado permanece dado inerte: não executar HTML, CSS ou JavaScript vindo de pacotes.
- Atualizações de definições não modificam instâncias existentes automaticamente.

## Estado desta implementação

Esta etapa adiciona o contrato de definição/instância para componentes, personalização pré-inserção de componentes e grupos salvos, inspector editável de temas e uma organização visual em explorador com navegação lateral e cartões unificados para itens pessoais. As coleções de layouts, regras, modelos, mídia, estilos e comportamentos ainda precisam ser conectadas progressivamente ao mesmo catálogo/inspector; sua existência no formato de backup não significa que todos os editores já estejam prontos.


## Interface do Explorador — reconstrução visual

A janela da Biblioteca utiliza uma composição única em três regiões:

- **Navegação à esquerda:** árvore visual para Assets padrão, itens pessoais, Fluxos, Temas, Layouts, Modelos de ficha, Assets salvos, Mídia, Estilos visuais, Regras e Comportamentos.
- **Área central:** cartões de itens com busca compartilhada; Assets, Fluxos, Temas e Layouts mantêm os renderizadores específicos existentes. As coleções complementares usam uma listagem genérica.
- **Inspector à direita:** painel contextual para prévia, detalhes e configuração. Assets, Fluxos e Temas mantêm seus editores existentes; Layouts apresentam resumo; coleções complementares exibem metadados em modo somente leitura.

A navegação é uma árvore visual de categorias, mas ainda não representa pastas personalizáveis. Coleções complementares são carregadas por `readNexusLibraryStore`, com fallback para flags legadas quando o armazenamento canônico ainda não existe. Conteúdo importado permanece inerte.

A interface usa o mesmo padrão de grade e seleção para itens. Em larguras menores, o inspector passa para baixo da listagem para evitar colunas impraticáveis.

### Limitações ainda abertas

- Favoritos, recentes, pastas personalizadas e filtros por etiquetas ainda não estão implementados.
- As coleções complementares têm inspector somente leitura; editores específicos e ações de aplicação ainda não existem.
- Layouts têm resumo contextual, mas não editor de overrides.
- A validação visual/funcional no Foundry VTT 14 continua obrigatória.


## Área unificada Lógica

A navegação da Biblioteca agrupa Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões sob a categoria **Lógica**. Essa união não altera o tipo semântico dos ativos: cada subtipo mantém seu próprio schema, editor contextual e executor. Os metadados comuns (origem, namespace, versão, permissões e dependências) são compartilhados. A especificação completa está em docs/LOGIC_WORKSPACE_SPEC.md.
