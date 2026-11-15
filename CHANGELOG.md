## 1.0.0.33

- Corrigido o encaixe de bordas no Canvas: o controlador detecta contato real entre arestas, aplica estados nos dois elementos e recalcula os cantos quando a seleção muda.
- Consolidada a origem do token no seletor: `identity.token.img` e `identity.token.border` permanecem canônicos; os aliases de raiz `token.img` e `token.border` deixam de aparecer como propriedades separadas, mantendo compatibilidade de resolução.
- Reorganizada a categoria Carga: Base, Bônus, Capacidade, Atual e Excedida aparecem diretamente sob um único grupo, sem subgrupos redundantes. O caminho legado `encumbrance.current` não é listado em paralelo ao caminho canônico `encumbrance.current.value`.
- A Biblioteca de fluxos passa a exibir gatilhos, condições, combinação E/OU, ações, configurações e estado de ativação.
- Adicionada a exclusão de fluxos e grupos salvos na Biblioteca pessoal; a exclusão de componentes salvos permanece disponível.
- Padronizada a altura mínima inicial do grupo de gatilhos em 54 px.
- As barras laterais acompanham a pilha de janelas e ficam à frente quando a ficha está em foco, sem sobrepor outras aplicações quando perde o foco.
- Fechamento das janelas flutuantes passa a evitar a animação longa padrão do ApplicationV2.
- Avançada a etapa de desempenho de mídia: áudio e vídeo rich media só carregam a fonte ao se aproximarem da área visível; imagens continuam usando lazy loading nativo.
- Atualizados testes de regressão para catálogo de propriedades, exclusão, bordas conectadas, janelas e lazy loading.

**Validação:** sintaxe, manifesto, templates, estilos, regressões e build do pacote serão verificados pelo GitHub Actions. Testes funcionais e visuais em uma instalação real do Foundry VTT 14 ainda são necessários; nenhuma regra ou fórmula do livro-base foi alterada.

