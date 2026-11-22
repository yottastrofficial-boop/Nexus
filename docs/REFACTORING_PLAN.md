# NEXUS — Plano aprovado de modernização estrutural

## Diretrizes
- Interface, documentação e experiência do usuário em português do Brasil; código e identificadores internos em inglês.
- Reconstrução por domínios e contratos explícitos, sem manter duas implementações completas em paralelo.
- Biblioteca como Explorador de Conteúdo com navegação, conteúdo e Inspector contextual.
- Regras, propriedades, comportamentos, fluxos e funções em uma área **Lógica**, preservando schemas e editores especializados.
- Compatibilidade de mídia independente do Foundry na identificação/decodificação, com adaptadores para limites de armazenamento.
- Preservar dados, IDs e referências; remover código antigo somente após migração e validação.
- Commits pequenos na main; release/manifesto estável somente após pacote validado.

## Sequência
1. Auditoria integral: árvore, imports, persistência, schemas, dependências, templates, CSS, testes e documentação.
2. Fundação: inicialização, ciclo de vida, serviços, validação, logs, schemas e migrações.
3. Dados e lógica: propriedades, aliases, expressões, fórmulas, regras e registro unificado.
4. Componentes e grupos: definições, instâncias, renderizadores, layouts e dependências.
5. Fichas/Canvas: coordenação, edição, painéis, eventos, histórico e persistência.
6. Biblioteca: Explorer, pastas, filtros, cards, Inspector, editores e importação/exportação.
7. Mídia: registry, WASM, workers, cache, storage adapters e previews.
8. Design System: tokens, temas, estilos, CSS por domínio e templates.
9. Migração final e remoção do legado após validação.
10. Testes, instalação limpa, atualização, Foundry V14 real e release.

## Regras
- Não reescrever a ficha de 270 KB em um único passo.
- Extrair funções puras/contratos primeiro; depois serviços e controladores.
- Não alterar mecânicas dos livros sem revisão dos documentos oficiais.
- Não gravar dados em preparação de contexto/renderização.
- Não apagar flags/campos/arquivos antes de mapear leitores e escritores.
- Priorizar APIs públicas do Foundry.
- Testes automatizados não equivalem a teste funcional real.
- Manifesto estável só aponta para release cujo ZIP foi construído e confirmado.
