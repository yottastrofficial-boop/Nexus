# Especificação técnica — Grupos compostos do Canvas

**Estado:** especificação aprovada para implementação incremental  
**Escopo:** editor de fichas do Foundry VTT V14  
**Decisões do usuário:** quatro modos; destaque sutil dos membros; biblioteca para componentes e grupos.

## 1. Objetivo

Evoluir os grupos do Canvas para uma ferramenta de composição visual versátil, previsível e personalizável, sem comprometer as mecânicas, os dados dos Actors, os layouts existentes ou a liberdade do modo livre.

O grupo é uma estrutura de organização e apresentação. Não é uma imagem única, não funde seus componentes e não altera o significado funcional dos componentes.

## 2. Auditoria da implementação existente

A base já contém:
- Hierarquia de grupos por `parentGroupId`, com componentes diretamente associados por `componentIds`.
- Proteção contra ciclos e referências inválidas na hierarquia.
- Tipos de grupo `folder`, `container` e `section`.
- Modos persistidos `free`, `horizontal`, `vertical` e `grid`.
- Renderização de uma superfície independente para cada grupo.
- Inspector com propriedades de nome, grupo superior, tipo, layout, espaçamento, preenchimento, colunas, alinhamento, título, cabeçalho e aparência.
- Salvamento de componentes e grupos na biblioteca pessoal do usuário.
- Importação/exportação de composições e recriação de IDs ao inserir grupos salvos em outro Canvas.

Arquivos centrais identificados:
- `scripts/core/group-hierarchy.js`
- `scripts/core/group-composition.js`
- `scripts/sheets/canvas-group-rendering.js`
- `scripts/sheets/actor-sheet-v1.0.0.js`
- `scripts/sheets/actor-sheet-listeners.js`
- `scripts/sheets/library-view.js`
- `templates/actors/actor-sheet.hbs`
- `styles/nexus-v1.0.0.css`
- `tests/validate-package.mjs`

A existência dessas rotinas não comprova que todos os fluxos estejam corretos no Foundry real. A auditoria de código deve ser complementada por testes funcionais.

## 3. Princípios invariáveis

1. **Compatibilidade:** layouts antigos continuam abrindo sem exigir conversão destrutiva.
2. **Identidade:** IDs de grupos e componentes permanecem estáveis durante edição normal.
3. **Independência:** componentes continuam editáveis e funcionais individualmente.
4. **Separação:** regras e dados do Actor não são modificados por operações visuais.
5. **Geometria:** redimensionar um grupo não escala seus filhos automaticamente.
6. **Superfície única:** o grupo desenha o fundo e a borda compartilhados; membros não duplicam bordas por padrão.
7. **Exceções explícitas:** estilos individuais configurados pelo usuário são preservados.
8. **Hierarquia segura:** um componente pertence diretamente a no máximo um grupo; grupos não podem conter ciclos.
9. **Persistência segura:** alterações são salvas por operações explícitas, com histórico e sem gravações por frame.
10. **Desempenho:** seleção e movimento não devem reconstruir a ficha inteira desnecessariamente.

## 4. Modelo conceitual

Manter dois eixos independentes:

### 4.1 Tipo visual/semântico do grupo (`kind`)

- `folder`: agrupamento organizacional, sem superfície visual obrigatória.
- `container`: superfície compartilhada, sem cabeçalho obrigatório.
- `section`: seção com cabeçalho opcional, título e possibilidade futura de recolhimento.

### 4.2 Organização interna (`layoutMode`)

- `free`: posições manuais independentes.
- `horizontal`: pilha horizontal.
- `vertical`: pilha vertical.
- `grid`: grade configurável.

Na interface, horizontal e vertical serão apresentados como o modo **Pilha**, com seletor de direção. A **Seção** será um preset de apresentação/estrutura, não um algoritmo geométrico separado: uma seção pode organizar o conteúdo em modo livre, pilha ou grade. Essa separação evita duplicar o motor de layout.

### 4.3 Estrutura persistida proposta

Exemplo ilustrativo (campos opcionais só são persistidos quando configurados):

```js
{
  id: "grp-stable-id",
  name: "Atributos",
  parentGroupId: "",
  componentIds: ["cmp-for", "cmp-des"],
  kind: "container",
  layoutMode: "grid",
  columns: 2,
  gap: 8,
  padding: 12,
  align: "center",
  showHeader: false,
  title: "Atributos",
  backgroundColor: null,
  borderColor: null,
  borderRadius: 8,
  collapsed: false,
  order: ["cmp-for", "cmp-des"]
}
```

O exemplo é um contrato-alvo, não uma ordem para substituir imediatamente os objetos existentes. A implementação deve preservar campos legados desconhecidos e normalizar apenas valores conhecidos.

## 5. Comportamento dos quatro modos

### 5.1 Livre

- Componentes conservam coordenadas e dimensões próprias.
- Grupo acompanha os limites reais dos descendentes visíveis.
- Mover o grupo move todos os descendentes pelo mesmo deslocamento.
- Mover um membro move apenas esse membro; o limite do grupo é recalculado.
- Redimensionar a superfície do grupo não altera as dimensões dos membros.
- Propriedades exibidas: nome, hierarquia, preenchimento visual, fundo, borda, raio e comportamento de seleção.

### 5.2 Pilha

- Distribuição em uma direção: horizontal ou vertical.
- Espaçamento uniforme configurável.
- Alinhamento transversal: início, centro, fim ou preencher (preencher pode ser habilitado quando a geometria dos componentes suportar).
- Ordem dos membros determinística e editável.
- Arrastar um membro pode alterar sua posição na ordem; não deve provocar deslocamentos imprevisíveis.
- Propriedades exibidas: direção, espaçamento, preenchimento, alinhamento, ordem e dimensionamento.
- Ao voltar para Livre, preservar a última geometria calculada como novas coordenadas manuais.

### 5.3 Grade

- Colunas configuráveis (limite inicial: 1–12).
- Linhas calculadas automaticamente.
- Espaçamento horizontal e vertical configuráveis.
- Alinhamento dentro das células.
- Ordem de leitura previsível: esquerda para direita e de cima para baixo.
- Componentes de tamanhos diferentes são alinhados sem serem escalados.
- Futuros spans de linha/coluna devem ser adicionados somente após o caso básico estar estável.

### 5.4 Seção

- Cabeçalho com título opcional.
- Superfície compartilhada e hierarquia visual clara.
- Conteúdo pode usar Livre, Pilha ou Grade.
- Recolher/expandir é estado de apresentação; não exclui, desativa nem altera os dados dos filhos.
- A seção recolhida deve manter uma área de cabeçalho clicável e um indicador de estado.
- Não impor cabeçalho ou fundo quando o usuário os desativar.

## 6. Inspector de grupo

O Inspector deve ser contextual e mostrar apenas opções relevantes.

### Geral
- Nome.
- Grupo superior (com prevenção de ciclos).
- Tipo: Pasta, Container ou Seção.

### Organização
- Livre / Pilha / Grade / Seção (presets claros).
- Para Pilha: direção horizontal/vertical.
- Para Grade: colunas e alinhamentos.
- Espaçamento e preenchimento.
- Ordem dos membros.

### Aparência
- Fundo: herdado / personalizado / transparente.
- Borda: herdada / personalizada / nenhuma.
- Espessura, cor e raio quando aplicáveis.
- Cabeçalho e título apenas para Seção.
- Controles de restauração por propriedade.

### Conteúdo
- Lista hierárquica de membros.
- Reordenar, selecionar, remover do grupo e adicionar seleção.
- A remoção do grupo não exclui o componente.
- Ações de duplicar, desagrupar e salvar na biblioteca.

### Avançado
- IDs técnicos e estado de compatibilidade somente leitura.
- Não expor campos internos sem utilidade cotidiana.

Evitar campos redundantes, opções sem efeito no modo atual e controles genéricos sem explicação. Agrupar configurações avançadas em seções recolhíveis.

## 7. Seleção e feedback visual

Padrão aprovado: **destaque sutil**.

- Sem seleção: superfície do grupo discreta, sem contornos permanentes em cada filho.
- Membro selecionado: borda de foco mais forte no membro ativo; contorno fino e translúcido nos demais membros do mesmo grupo.
- Grupo selecionado: contorno externo único, alças/controles do grupo e indicação clara do nome.
- Subgrupos: destacar apenas a hierarquia relevante; evitar contornos concorrentes excessivos.
- Hover: realce leve, sem competir com seleção ativa.
- Cores devem derivar dos tokens do tema, com contraste acessível.
- Em modo de jogo, nenhuma borda de edição ou guia deve aparecer.

A camada de seleção deve ser visual e independente da renderização funcional dos componentes.

## 8. Biblioteca pessoal: componentes e grupos

A decisão é manter ambos os fluxos.

### 8.1 Componentes

Salvar configuração reutilizável do componente, preservando tipo, aparência, conteúdo inicial intencional, caminhos de propriedades e interações permitidas. Não salvar identidade do Actor nem valores dinâmicos do personagem como se fossem parte do modelo.

### 8.2 Grupos

Salvar snapshot completo e autocontido:
- Grupo raiz e subgrupos.
- Ordem e relações hierárquicas.
- Modos de layout e configurações visuais.
- Componentes e configurações reutilizáveis.
- Referências internas remapeáveis.

Ao inserir:
- Gerar novos IDs para todos os componentes e grupos.
- Remapear referências internas.
- Posicionar a composição em uma área livre do Canvas.
- Preservar a geometria relativa.
- Não sobrescrever componentes já existentes.
- Registrar uma única operação no histórico.

### 8.3 Organização da Biblioteca

Em Assets → Meus itens, separar claramente:
- Componentes salvos.
- Grupos salvos.

Cada cartão deve ter prévia, nome, quantidade de membros e ações: adicionar, visualizar, duplicar, renomear, exportar e excluir. Pesquisa e filtros devem abranger os dois tipos. A ação de salvar deve mudar a Biblioteca para Meus itens e atualizar a lista imediatamente, mesmo quando o painel ainda não estava montado.

A persistência deve continuar no escopo do usuário, não no Actor, salvo decisão futura explícita.

## 9. Desempenho e interação

- Movimento contínuo atualizado por `requestAnimationFrame`.
- Geometria calculada uma vez por frame no máximo, com cache de retângulos.
- Persistência somente ao concluir gesto ou alteração de propriedade.
- Histórico registra uma transação por gesto, não por frame.
- Alterações no Inspector atualizam apenas o grupo e a prévia necessária.
- Não reconstruir todo o DOM da ficha para cada mudança de gap, cor ou seleção.
- Usar delegação de eventos e limpar listeners/observers ao fechar ou re-renderizar.
- Evitar observers duplicados e consultas globais repetidas.
- Respeitar prefers-reduced-motion; animações curtas e opcionais.
- Grupos grandes devem degradar com elegância; não introduzir animações ou sombras pesadas em cada membro.

## 10. Compatibilidade e migração

- `free`, `horizontal`, `vertical` e `grid` existentes continuam válidos.
- `folder`, `container` e `section` continuam válidos.
- Campos desconhecidos são preservados.
- Valores inválidos são normalizados em memória com fallback seguro.
- Não executar migração persistente em `_prepareContext()`.
- Se uma migração se tornar necessária, usar o Migration Manager, com versão, idempotência, registro e teste de repetição.
- A troca de modo não deve apagar cores, títulos ou configurações não aplicáveis; devem permanecer armazenadas e voltar a valer quando o modo for reativado.

## 11. Etapas de implementação

### Etapa 0 — Caracterização e diagnóstico
- Registrar snapshots de layouts atuais e cenários de regressão.
- Mapear todos os leitores/escritores de grupos e biblioteca.
- Reproduzir o problema de salvar grupo e de exibição em Meus itens.
- Identificar atualizações de DOM e cálculos geométricos durante arraste.
- Não alterar dados persistidos nesta etapa.

**Saída:** relatório de causa-raiz e testes reproduzíveis.

### Etapa 1 — Seleção e apresentação
- Refinar estados de seleção de grupo/membro.
- Implementar contornos sutis de membros relacionados.
- Consolidar uma superfície por grupo e remover bordas duplicadas.
- Garantir que modo de jogo não exiba affordances de edição.

**Aceite:** seleção individual, múltipla, grupo, subgrupo e modo de jogo aprovados.

### Etapa 2 — Inspector contextual
- Reorganizar o Inspector em Geral, Organização, Aparência, Conteúdo e Avançado.
- Exibir controles condicionais ao modo.
- Adicionar restauração/herança por propriedade.
- Evitar render completo a cada alteração simples.

**Aceite:** nenhuma propriedade irrelevante aparece; alterações persistem após fechar e reabrir a ficha.

### Etapa 3 — Motor de layout
- Estabilizar Livre sem alterar comportamento existente.
- Consolidar Pilha horizontal/vertical.
- Refinar Grade.
- Adicionar comportamento visual de Seção e recolhimento.
- Definir reordenação, alinhamento, preenchimento e transição entre modos.
- Testar idempotência: recalcular layout repetidamente não deve deslocar componentes progressivamente.

**Aceite:** layouts previsíveis, reversíveis e sem escala involuntária dos filhos.

### Etapa 4 — Biblioteca pessoal
- Corrigir ciclo de vida do painel e atualização imediata.
- Separar Componentes e Grupos.
- Adicionar prévias e ações de gerenciamento.
- Garantir clonagem, remapeamento de IDs e posicionamento ao inserir.
- Testar importação/exportação e compatibilidade com pacotes antigos.

**Aceite:** salvar → visualizar → fechar ficha → reabrir → inserir em outro layout funciona sem perda ou colisão de IDs.

### Etapa 5 — Desempenho
- Medir arraste, seleção e alterações do Inspector com grupos pequenos, médios e grandes.
- Otimizar cálculos e renderização com cache e atualização por frame.
- Reduzir efeitos e repaints desnecessários.
- Verificar limpeza de listeners, observers e estado temporário.

**Aceite:** interação suave em Canvas com múltiplos grupos, sem regressões de seleção ou salvamento.

### Etapa 6 — Validação e release
- Testes automatizados de hierarquia, composição, layout, biblioteca e migração.
- Testes de regressão de componentes, propriedades, interações, temas e layouts antigos.
- Teste real no Foundry VTT V14.
- Verificar atualização sobre a versão anterior e instalação limpa.
- Atualizar changelog, documentação e pacote.

**Aceite:** não publicar como validado no Foundry sem executar teste real nessa plataforma.

## 12. Matriz mínima de testes

- Grupo livre vazio, com um membro e com muitos membros.
- Pilha horizontal e vertical com tamanhos diferentes.
- Grade com quantidade não divisível pelo número de colunas.
- Seção com/sem título, recolhida/expandida.
- Grupo dentro de grupo, reparenting e prevenção de ciclo.
- Mover membro, grupo e subgrupo.
- Redimensionar superfície sem escalar filhos.
- Alterar layout e voltar para Livre sem perda de geometria.
- Seleção individual, múltipla, grupo e subgrupo.
- Componente com estilo individual dentro de grupo.
- Salvar componente e grupo; reabrir ficha; adicionar em outro layout.
- Duplicar, renomear, exportar, importar e excluir itens da biblioteca.
- IDs remapeados sem referências quebradas.
- Undo/redo e persistência após reabrir.
- Layout antigo sem campos novos.
- Modo de jogo sem controles de edição.
- Múltiplas fichas e múltiplas janelas.
- Teste de desempenho com 1, 10 e 30 grupos e 100+ componentes.

## 13. Fora do escopo inicial

- Layout responsivo baseado em breakpoints e reflow por largura da ficha.
- Spans arbitrários de linhas/colunas e layouts tipo masonry.
- Animações elaboradas e transições complexas.
- Sincronização colaborativa em tempo real entre usuários.
- Marketplace ou compartilhamento remoto de bibliotecas.

Esses recursos podem ser avaliados depois que o modelo básico estiver estável.

## 14. Critério de sucesso

O editor deve permitir ao usuário começar com uma composição livre e evoluir para pilhas, grades e seções sem perder componentes, dados, identidade ou controle. Personalização não pode significar imprevisibilidade: cada opção deve ter efeito claro, reversível, persistente e coerente com o modo escolhido.
