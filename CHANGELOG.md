## 1.0.0.28

- Corrigido o visualizador de propriedades: removidos textos duplicados que causavam sobreposição entre nomes, caminhos e setas.
- Navegação por categorias agora mantém o foco no campo de origem, impedindo que o seletor feche ao abrir categorias como Recursos.
- Seleção de propriedades preserva a interação com o campo e dispara a atualização correspondente.
- Preservada a posição de rolagem dos painéis internos durante atualizações e renderizações do editor.
- Ampliados os tokens semânticos dos temas para Canvas, cabeçalhos de janela, botões ativos, superfícies e estados de foco.
- Confirmado que o asset “Indicador – Barra” continua no catálogo da Biblioteca; renderizadores de outros tipos permanecem como suporte extensível ao catálogo.

**Validação:** testes automatizados e validação do pacote no GitHub Actions. A confirmação visual final ainda depende de teste manual no Foundry VTT 14.

## 1.0.0.27

- Corrigida a inicialização de `activateCanvasInteractions`: os elementos raiz e Canvas agora são declarados localmente, evitando `ReferenceError` durante a renderização da ficha.
- Adicionadas regressões de execução para renderizações sem elemento raiz e sem Canvas.
- Atualizada a versão do pacote e o manifesto de download.

**Validação:** verificação de sintaxe JavaScript e testes automatizados do pacote aprovados no GitHub Actions. A validação de interface em uma instalação real do Foundry VTT 14 permanece necessária.

## 1.0.0.26

- Seletor de propriedades passa a navegar por categorias e níveis, com pesquisa global e sugestões progressivas; substitui a lista extensa e o controle de expandir/reduzir.
- Catálogo de propriedades centralizado em módulo próprio, com nomes localizados para atributos, perícias, recursos, combate e identidade.
- Perícias oferecem propriedades calculadas derivadas da regra ativa: modificador, bônus, atributo, proficiência e demais dados expostos por `getNexusSkillRows`.
- Selecionar uma opção no menu flutuante não dispara mais a limpeza global de seleção; o alvo de edição é mantido ao limpar somente a seleção visual.
- Menu fecha ao interagir fora dele e preserva o contexto ao clicar nas próprias opções.
- Tema, padrões de layout, janela flutuante, visualização do seletor, catálogo, ligações de eventos e interações do Canvas foram separados em módulos por responsabilidade, mantendo a ficha como ponto de integração.
- Barra de rolagem do portal do seletor recebe os mesmos tokens visuais das janelas NEXUS; campos focados deixam de ter seus destaques recortados pelo conteúdo do componente.
- Mantido o formato persistido de layouts, componentes, aliases e fluxos.

## Validação

- Verificações automatizadas de sintaxe, manifesto, integridade do pacote e regressões aprovadas no GitHub Actions.
- ZIP de distribuição será publicado como asset da release `v1.0.0.26`, no caminho declarado pelo manifesto.
- Validar no Foundry VTT 14 o seletor em Propriedades, Comportamento, fórmulas e Biblioteca; testar clique fora, seleção de área vazia, navegação hierárquica e propriedades calculadas de perícias.
- Confirmar visualmente os destaques/foco dos campos em componentes com diferentes formatos e dimensões.

## Correções em preparação para 1.0.0.25

- Biblioteca: miniaturas de indicadores e componentes pessoais passam a usar uma área de visualização quadrada independente das dimensões do componente no Canvas.
- Biblioteca: cartões personalizados salvos exibem uma prévia com título e conteúdo, em vez de apenas um glifo genérico.
- Biblioteca: busca e filtro recebem layout responsivo sem sobreposição; as seções Assets, Fluxos e Temas e a separação Padrão NEXUS / Meus itens são mantidas.
- Propriedades: removida a segunda montagem de opções no Inspector. A lista dinâmica passa a ter um único portal e um único fluxo de renderização, sem ser movida entre janelas.
- Propriedades: o mesmo seletor atende campos de vínculo, condições, fórmulas e campos de texto/textarea, incluindo conteúdo de cards personalizados.
- Propriedades: atualização da assinatura também considera aliases de rolagem; o campo proprietário é registrado antes do reposicionamento assíncrono.
- Propriedades: a seleção insere o texto no cursor, mantém o foco e usa uma rolagem padronizada com espaço reservado para a barra.
- Comportamento: após atualizar um campo e reconstruir o editor, o cursor e a seleção de texto são restaurados.
- Mantida a separação entre dados do Actor, configuração dos componentes e apresentação visual.

**Validação pendente:** testes de sintaxe/integração e execução funcional no Foundry VTT 14. Esta alteração ainda não deve ser tratada como release publicada.

## 1.0.0.24

- Biblioteca reorganizada em áreas de Assets, Fluxos e Temas, com separação entre conteúdo padrão e itens pessoais.
- Componentes individuais podem ser salvos e reutilizados pela Biblioteca; grupos mantêm prévias quadradas e independentes da proporção total do Canvas.
- Miniaturas de assets usam uma área quadrada fixa e ajustam o conteúdo interno sem deformar a proporção do componente.
- Biblioteca de Fluxos permite consultar comportamentos salvos e inserir um fluxo no componente selecionado.
- Temas integrados passam a ser apresentados diretamente na área Temas da Biblioteca.
- Busca da Biblioteca consolidada em um único campo, com filtragem entre assets, itens pessoais, fluxos e temas.
- Buscador de propriedades centralizado em uma única lista reutilizada nos painéis; inclui expansão/redução, posicionamento responsivo e atualização de opções.
- Campos de propriedade do editor de Comportamento passam a usar explicitamente o mesmo buscador.
- Fórmulas de rolagem e cálculo aceitam sugestões `{{propriedade}}`, resolvidas como referências de dados antes da avaliação da fórmula.
- CSS final padroniza miniaturas, cartões pessoais, fluxos, abas, busca e lista de propriedades, reduzindo conflitos de regras anteriores.

## 1.0.0.22

- Reconstrução do renderizador do editor de comportamento, preservando o motor e os dados dos fluxos existentes.
- Gatilhos e condições passam a usar cartões alinhados e consistentes; condições oferecem sugestões dos caminhos encontrados no ator via datalist, mantendo edição manual.
- Ações reorganizadas em cabeçalho compacto com título, ativação e ferramentas alinhados; configurações em coluna única.
- Biblioteca recupera miniaturas maiores e cartões verticais; composições personalizadas recebem área de prévia ampliada.
- Ajustes responsivos e testes de regressão para a nova estrutura.

## 1.0.0.21

- Remove legendas visuais redundantes de Propriedade, Operador e Valor nas condições, mantendo nomes acessíveis.
- Consolida a lista de ações em uma única coluna e organiza controles e configurações em linhas previsíveis.
- Reorganiza Aparência global com alinhamento consistente entre rótulos, seletores e color pickers.
- Padroniza as dimensões finais dos painéis compactos (400 × 600) e amplos (900 × 600).

## 1.0.0.20

### Editor de fluxos e sistema visual
- Painéis compactos padronizados em 400 × 600 px; Biblioteca e Comportamento em 900 × 600 px.
- Removido o cabeçalho redundante do painel Comportamento; o editor de fluxos assume a identificação e a navegação.
- Título, abas de fluxos, criação e inserção de modelos foram reunidos em uma única área de navegação.
- Removidas contagens auxiliares e legendas redundantes; nome do fluxo passa a usar campo direto com nome acessível.
- Gatilhos usam seletor direto sem a legenda "Evento".
- Condições passam a ser exibidas em blocos de superfície, com seletor E/OU integrado ao cabeçalho e colunas dedicadas para propriedade, operador, valor e remoção.
- Estado Ativa foi movido para a linha de identificação da ação; tipo e configurações permanecem abaixo.
- Mantida a estrutura persistida dos fluxos, IDs, ações e compatibilidade com interações existentes.

### Temas, cores e controles
- Ampliados os tokens semânticos para superfícies, bordas, texto, foco, campos, botões, estados e barras de rolagem.
- Cabeçalhos, conteúdo das janelas, campos, botões, foco e rolagem passam a consumir os mesmos papéis de tema.
- Paletas de tema continuam definidas centralmente; alternar tema atualiza os tokens de todos os painéis abertos.
- Color pickers reorganizados em linhas consistentes com rótulo e seletor de largura útil.
- Estados de foco visíveis, controles desativados e hover padronizados.

### Referências de design e validação
- Aplicados princípios de Fluent 2 para papéis de cor, estados semânticos e uso moderado de cores de destaque.
- Aplicados princípios do Atlassian Design System para tokens, escala de espaçamento, proximidade e hierarquia visual.
- Testes de regressão atualizados para dimensões, editor, temas e distribuição de color pickers.
- Necessária confirmação visual e funcional em instalação real do Foundry VTT 14.

## 1.0.0.19

### Correção da Biblioteca e distribuição de espaço
- Corrigido conflito de cascata em que o seletor genérico de painéis compactos também redimensionava a Biblioteca para 560 px.
- Biblioteca e Comportamento passam a ter dimensionamento explícito e independente; Biblioteca preserva 900 × 640 px.
- Navegação de pastas recebeu layout horizontal próprio, com estados ativos claros e rolagem horizontal quando necessário.
- Cartões da Biblioteca foram reorganizados em linhas compactas com miniatura, título e conteúdo lado a lado.
- Área de itens, grupos salvos e prévia/configuração recebeu distribuição de espaço mais previsível.
- Em painéis estreitos, a prévia passa abaixo da lista em vez de comprimir as colunas.
- Seletor de cor das Propriedades deixa de ocupar uma área horizontal excessiva sem conteúdo.
- Protótipo HTML revisado incluído em docs/prototypes/editor-ux-1.0.0.19.html.

### Compatibilidade e validação
- Sem alteração no formato dos componentes, IDs, dados salvos ou execução de interações.
- Atualizados testes de regressão para dimensionamento específico, navegação e layout responsivo.
- Necessária confirmação visual/funcional no Foundry VTT 14.

## 1.0.0.18

### Revisão de interface e padronização dos menus
- Reorganizado o editor de Comportamento para reduzir superfícies aninhadas, alinhar controles e dar largura útil ao título das ações.
- Título das ações agora tem layout flexível, quebra de linha segura e ferramentas compactas com ícones e rótulos acessíveis.
- Botões de mover, remover, salvar e excluir fluxos passam a usar ícones compactos com rótulos acessíveis e tooltips.
- Gatilhos, condições e ações utilizam separadores leves em vez de cartões aninhados.
- Campos de condição distribuem a largura priorizando Propriedade; operador e valor mantêm largura legível.
- Estrutura de dados reorganizada visualmente, com navegação plana e campos sem cartões internos redundantes.
- Dimensões dos painéis compactos padronizadas: Propriedades, Organização e Configurações em 560 × 620 px; Estrutura de dados em 620 × 620 px. Biblioteca e Comportamento permanecem em 900 × 640 px.
- Ícones da navegação revistos: Estrutura de dados usa diagrama de relações; Comportamento usa ação/evento.
- Incluído protótipo HTML de referência em docs/prototypes/editor-ux-1.0.0.18.html.

### Compatibilidade e validação
- Mantidos IDs, dados persistidos e modelo de execução dos fluxos.
- Mantida a compatibilidade com fluxos legados de rolagem de perícia.
- Atualizados os testes de estrutura, dimensões e acessibilidade dos controles.
- Necessária validação visual/funcional final no Foundry VTT 14.

## 1.0.0.17

### Padronização de dimensões
- Corrigida a diferença de tamanho entre Comportamento e Biblioteca: ambos agora compartilham a mesma largura e altura (900 × 640 px), inclusive nas regras CSS e na configuração inicial das janelas.
- Propriedades permanece em 420 × 620 px, igual ao painel Camadas.

### Validação
- Testes de regressão atualizados para conferir a geometria compartilhada entre Comportamento e Biblioteca.
- A validação visual no Foundry VTT 14 continua necessária.

## 1.0.0.16

### Editor de Comportamento e Propriedades
- Fluxos do componente passam a ser exibidos em abas pelo nome; somente o fluxo selecionado fica visível, e a seleção permanece após editar seus campos.
- Removido o resumo redundante QUANDO/SE/ENTÃO. Os blocos agora usam os títulos diretos Gatilhos, Condições e Ações.
- Gatilhos reorganizados com rótulo de Evento alinhado ao seletor e botão Remover fora do campo.
- Condições passam a priorizar a largura de Propriedade, mantendo Operador e Valor legíveis e o seletor Todas (E)/Qualquer (OU) em posição dedicada.
- Cartões de ação reorganizados para separar título, ferramentas, tipo/estado e configurações.
- Painel Propriedades reduzido para 420 × 620 px, igual a Camadas; Comportamento recebe dimensões explícitas de 820 × 700 px, como a Biblioteca.

### Validação
- Incluídos testes de regressão para abas de fluxos, remoção do resumo e dimensões dos painéis.
- A execução no Foundry VTT 14 continua necessária para confirmar o comportamento visual e a interação real.

## 1.0.0.15

### Comportamento e interface do editor
- Redimensionado o painel de Comportamento para 820 × 700 px, igual à Biblioteca; o painel de Propriedades permanece em 520 × 760 px.
- Dado um cabeçalho próprio ao seletor de combinação de condições (Todas/E e Qualquer/OU), com largura definida para evitar o controle comprimido.
- Revisada a semântica dos ícones de navegação: Configurações, Propriedades, Biblioteca, Organização, Estrutura de dados e Comportamento agora usam símbolos distintos e coerentes; a barra de Aparência e a categoria Organização seguem o mesmo padrão.
- O modo Configuração da ficha também recebe ícone próprio, sem reutilizar o símbolo de Propriedades.

### Validação
- Atualizados os testes de dimensões, ícones e layout do seletor E/OU.
- A validação automatizada e o teste funcional dentro do Foundry VTT 14 serão executados antes da publicação.

## 1.0.0.14

### Editor de Comportamento
- Reorganizada a criação de fluxos em uma única interface, removendo o seletor redundante Cartões/Lista e o atalho separado de rolagem de perícia.
- Mantidos os tipos de ação e a compatibilidade com fluxos existentes; a rolagem de perícia deixa de ser apresentada como um modelo de fluxo separado.
- Reestruturados os cartões de fluxo, cabeçalhos, gatilhos, condições e ações para aproveitar a largura do painel.
- Separados os controles de expandir, reordenar e remover ações do cabeçalho expansível, evitando botões interativos dentro do elemento de resumo.
- Melhorados alinhamento, espaçamento, tamanhos de campos, áreas clicáveis, foco e comportamento responsivo.
- Preservados foco e posição de rolagem após alterações em campos do fluxo.

### Propriedades e seleção
- Ampliado o painel de Propriedades e aprimorada a grade de controles, com campos e áreas de interação maiores.
- Cliques simples no espaço vazio do Canvas não removem mais a seleção atual.
- A seleção é mantida ao alternar entre Comportamento e Propriedades e é limpa quando ambos os painéis são fechados.
- A seleção por arrasto continua disponível; pequenos movimentos acidentais não limpam a seleção.

### Validação
- Atualizados manifesto, README, changelog e testes para a versão 1.0.0.14.
- Testes automatizados e compatibilidade de interface com Foundry VTT 14 serão verificados no CI; a validação funcional final continua necessária dentro do Foundry.

## 1.0.0.13

### Reorganização do Editor de Fichas
- Movido o editor de fluxos para um painel independente de Comportamento, com dimensões equivalentes às da Biblioteca.
- O painel de Comportamento acompanha a seleção do Canvas e permite editar os fluxos do componente selecionado sem depender do Inspector.
- Removida a aba Comportamento do Inspector; Dados, Aparência e Avançado permanecem no painel de Propriedades.
- Ampliado o espaço interno do editor de fluxos, com gatilhos e condições lado a lado, campos maiores e configurações de ações em duas colunas.
- A seção de gatilhos e condições fica expandida inicialmente para tornar a estrutura do fluxo mais visível.

### Configurações do editor
- Criado um painel independente de Configurações do editor, com navegação lateral própria.
- Transferidas para Configurações > Organização as opções de grade, encaixe, alinhamento inteligente e dimensões da ficha.
- Aparência permanece dedicada a temas, cores, tipografia e personalização visual.
- Mantido o modo existente de edição dos dados do personagem, sem alterar sua finalidade.

### Validação
- Atualizados manifesto, README, changelog e testes para a versão 1.0.0.13.
- As verificações automatizadas serão executadas no CI; a validação visual e funcional em uma instalação real do Foundry VTT 14 continua necessária.

## 1.0.0.11

### Editor híbrido e biblioteca de fluxos
- Reorganizado o editor de interações com resumo QUANDO → SE → ENTÃO, configuração guiada recolhível e cartões de ações expansíveis.
- Mantidas as configurações avançadas disponíveis sem ocupar a interface por padrão; adicionada alternância entre visualização em cartões e lista.
- Adicionado o fluxo pronto de rolagem de perícia, que utiliza a rotina de rolagem existente da ficha e permite selecionar a perícia.
- Adicionada biblioteca pessoal de fluxos, independente do Actor, para salvar, reutilizar e inserir comportamentos em outros componentes.
- A clonagem de fluxos gera novos identificadores para evitar colisões entre instâncias.

### Assets
- Removidas as opções de ajuste que esticavam a imagem ou ignoravam seu enquadramento.
- Padronizada a preservação da proporção como comportamento inicial; a opção de preenchimento pode recortar a imagem sem deformá-la.
- Ajustadas as prévias da Biblioteca e a área de exibição de assets nos componentes.

### Distribuição e validação
- Atualizados manifesto, documentação e verificações para a versão 1.0.0.11 e sua URL de pacote.
- O pacote de distribuição é gerado pelo CI e publicado automaticamente quando as validações passam.
- Testes funcionais em uma instalação real do Foundry VTT 14 continuam necessários; a aprovação do CI não substitui essa validação.

## 1.0.0.10

### Editor visual de interações
- Substituído o seletor rígido de ação por um editor de fluxos no Inspector.
- Cada componente pode possuir vários fluxos independentes.
- Cada fluxo aceita vários Triggers; qualquer Trigger configurado inicia as Actions daquele fluxo.
- Actions podem ser adicionadas, removidas, ativadas/desativadas e reordenadas, com configuração específica por tipo.
- Adicionadas condições por propriedade, com combinação AND/OR e operadores de comparação.
- Definida execução sequencial, com escolha entre interromper ou continuar após falhas.
- Implementados executores controlados para rolagem, cálculo, atualização de propriedade, abertura, alternância, interação encadeada e operações permitidas.
- Adicionados eventos de clique, duplo clique, clique direito, hover, alteração, envio e interação encadeada.
- Mantida a leitura de ações legadas de rolagem e alternância sem exigir migração imediata dos layouts.
- Scripts arbitrários não são avaliados; a ação avançada utiliza uma lista explícita de operações seguras.

### Compatibilidade e validação
- Mantida a separação entre dados, comportamento e aparência dos componentes.
- Adicionados testes de normalização, múltiplos Triggers, condições, ordenação e execução.
- Validação automatizada do pacote executada no CI; teste funcional dentro do Foundry VTT 14 permanece necessário antes de considerar a versão estável.

## 1.0.0.9

### Migração de perícias e propriedades
- A migração consolida os dados de perícias nas chaves técnicas canônicas em inglês e remove as chaves antigas em português somente após preparar o valor canônico no mesmo update do Actor.
- Campos legados `proficiency` e `proficient` são convertidos para `proficientLevel`; o campo canônico já existente é preservado.
- O scanner de propriedades nativas ignora caminhos legados de perícias, impedindo que sejam reapresentados como propriedades genéricas duplicadas.
- A leitura de compatibilidade permanece disponível caso a migração não possa ser concluída; a ficha tenta novamente quando for aberta.

### Interface
- Removidos textos de ajuda, exemplos em placeholders e tooltips instrutivos do template da ficha.
- Mantida a funcionalidade de aliases em fórmulas, sem exibir instruções sobre sua utilização.

### Escopo e validação
- O editor visual completo de Trigger → Actions ainda não faz parte desta atualização; o Inspector antigo permanece temporariamente enquanto a próxima etapa substitui o seletor rígido por configurações contextuais.
- Adicionadas regressões estáticas para a migração canônica, exclusão de caminhos legados e ausência de dicas instrutivas.
- A validação funcional em instalação real do Foundry VTT 14 continua necessária.

## 1.0.0.8

### Propriedades e perícias
- As chaves técnicas das 18 perícias passam a utilizar inglês, mantendo os nomes da interface em português.
- Substituído o booleano persistido de proficiência por `proficientLevel`: zero representa ausência de proficiência, valores positivos representam proficiência e valores negativos aplicam o bônus de proficiência no sentido oposto.
- A migração é aditiva: cria os novos campos nas chaves canônicas e preserva os dados antigos em português e os campos booleanos legados.
- A ficha permite editar o nível numérico de proficiência, incluindo valores negativos.
- Atributos e propriedades numéricas aceitam números negativos; limites só devem ser aplicados quando definidos pela regra ou pela propriedade.

### Interações
- Criado o núcleo de interações baseado em Trigger → Action → Configuration.
- Um trigger pode executar várias ações em sequência, cada uma com sua própria configuração.
- Cliques de componentes passam pelo novo executor, mantendo compatibilidade com ações antigas de rolagem e alternância.
- Documentado o contrato inicial de propriedades, cálculos opcionais e interações em `docs/PROPERTY_AND_INTERACTION_SYSTEM.md`.

### Escopo ainda não concluído
- O editor visual completo para criar triggers e encadear/configurar ações ainda será desenvolvido.
- O PropertyRegistry, o mecanismo de dependências de cálculo e o Roll Dialog universal continuam nas próximas etapas.
- Testes funcionais em uma instalação real do Foundry VTT 14 continuam necessários.

## 1.0.0.8

### Regras-base e ficha
- Adicionados os seis atributos individuais (FOR, DES, SAB, INT, CAR e VON), preservando os três núcleos Corpo, Mente e Alma já existentes.
- Criado catálogo canônico das 18 perícias do Capítulo 7 de REGRAS NEXUS, com suas descrições e atributos associados.
- O grupo de perícias calcula o modificador com atributo relevante e MB somente quando a perícia está marcada como proficiente.
- MB calculado conforme o livro: nível dividido por dois, arredondado para cima, limitado a +5; cards vinculados a combat.mb exibem o valor derivado.
- Cada linha de perícia permite realizar 1d20 + modificador e alternar proficiência binária; as alterações ficam salvas no Actor.

### Qualidade de vida e interação
- Adicionada a ação de card “Alternar visibilidade de outro card”, com referência por ID estável, persistência e suporte a teclado.
- Barras de recursos com ação de slider aceitam clique e arraste diretamente sobre a barra, além do controle deslizante.
- Ajustes de acessibilidade e responsividade para as linhas de perícia, com botões focáveis e rótulos acessíveis.
- Imagens em cards e prévias recebem limites de dimensão e preservação de proporção intrínseca como padrão.
- Mantidos os três núcleos existentes e os layouts antigos; os novos caminhos de atributos e perícias são aditivos.
- Ao abrir uma ficha antiga, campos ausentes dos seis atributos e das 18 perícias são inicializados sem sobrescrever valores existentes.

### Validação
- Atualizados os testes estáticos para o catálogo de 18 perícias, cálculo de proficiência, ações de cards e interação direta com barras.
- A validação dentro do Foundry VTT 14 ainda precisa ser realizada após a instalação.

## 1.0.0.7

### Inspector, ações e fórmulas
- O Inspector agora restaura explicitamente a ação selecionada e o conteúdo de `rollFormula` ao reabrir as propriedades do componente.
- O campo de fórmula aceita até 500 caracteres e compartilha o visualizador de propriedades com o campo de vínculo de dados.
- A lista de sugestões inclui caminhos completos e atalhos de exibição explícitos ou gerados a partir do nome da propriedade (por exemplo, Destreza → `@DES`), omitindo abreviações ambíguas; selecionar uma sugestão insere o token no ponto atual do cursor.
- A expansão de aliases ocorre antes da avaliação do Foundry Roll; aliases de campos próprios também são injetados em uma cópia dos dados de rolagem, sem alterar o Actor nem a fórmula original armazenada.

### Desempenho do Canvas
- Movimentos repetidos por teclado acumulam deltas e aplicam alterações visuais no máximo uma vez por frame.
- As posições iniciais e os elementos selecionados são capturados uma vez por sequência; os limites dos grupos usam a lista de elementos já capturada.
- A persistência é realizada ao soltar a tecla ou quando a janela perde foco, em vez de disparar uma gravação a cada repetição.

### Seletor de cores
- O popover passa a usar fechamento manual com detecção explícita de clique externo, para que a interação com matiz, saturação e opacidade não seja encerrada pelo comportamento automático do navegador.
- O ciclo de vida do componente customizado volta a registrar o detector de clique externo quando o elemento é reconectado ao DOM.

### Biblioteca de grupos
- Miniaturas preservam a composição espacial para grupos de até oito elementos e apresentam uma grade semântica para grupos maiores.
- Barras de PV, PM, PE e outros recursos exibem rótulo e preenchimento; demais cards exibem seu título e conteúdo disponível.
- A grade da Biblioteca utiliza melhor a largura disponível, com prévias maiores e cartões responsivos.

### Validação
- Atualizados os testes estáticos para a versão 1.0.0.7 e adicionadas verificações para restauração de ação/fórmula, sugestões de aliases, movimentação por frame, seletor manual e miniaturas semânticas.
- Ainda são necessários testes funcionais no Foundry VTT 14 para validar a interação real, especialmente rolagens com dados de módulos e grupos com composições variadas.

## 1.0.0.6

### Desempenho e interação
- Movimentação por teclas direcionais atualiza o Canvas imediatamente, compartilha um único snapshot de histórico por sequência e consolida a persistência após a interação, evitando gravações e operações de layout a cada repetição de tecla.
- O salvamento de movimentos por teclado é concluído ao soltar a tecla, com uma pequena janela de segurança para sequências rápidas.
- Superfícies de grupos deixam de impor dimensões mínimas artificiais e passam a respeitar os limites reais dos componentes.

### Biblioteca
- Grupos salvos passam a exibir miniaturas compostas com a posição relativa e a aparência básica dos cards membros.
- Grupos extensos mostram uma amostra dos primeiros componentes e um indicador da quantidade restante, evitando miniaturas ilegíveis.

### Fórmulas e referências
- Fórmulas de rolagem aceitam aliases curtos definidos nas propriedades, como `@DES`, resolvendo-os para o caminho real antes de entregar a fórmula ao Foundry.
- Referências explícitas do Foundry, como `@attributes.body.value`, continuam preservadas.
- O seletor de cores da Biblioteca não reconstrói mais o painel a cada evento `input` durante o ajuste de matiz/opacidade; a atualização estrutural ocorre ao concluir a alteração.
- Opções de textura deixam de ser expostas na interface do seletor por enquanto, mantendo a leitura de valores antigos para compatibilidade.

### Validação
- Adicionadas regressões estáticas para aliases de rolagem, persistência consolidada por teclado, prévias compostas de grupos e dimensões mínimas.
- Testes funcionais no Foundry VTT 14 continuam necessários, especialmente para repetição de teclas, interação real com popovers e comportamento de grupos pequenos.

## 1.0.0.5

### Correções de interação após a integração
- A seleção parcial de um grupo não propaga mais o highlight aos componentes irmãos nem à superfície do grupo; somente os itens realmente selecionados recebem destaque.
- A barra de recurso persiste o valor ao terminar o arraste, mantendo a atualização visual imediata durante o gesto.
- Os atalhos do Canvas preservam o contexto de teclado após renderizações assíncronas; controles e painéis do Inspector não recebem atalhos de edição do Canvas.
- A tipografia do conteúdo também alcança os elementos internos que exibem valores derivados, recursos, atributos e texto manual.
- As opções de ação do Inspector são filtradas conforme o tipo de componente, preservando configurações já existentes.
- O seletor de cores recebe uma única superfície visual, sem molduras adicionais herdadas do Inspector.
- Incluído comando explícito para usar a imagem do Token como retrato do Actor, atualizando `Actor.img` (miniatura do diretório do Foundry) sem acoplar permanentemente retrato e token.
- Os rótulos iniciais do marcador de quatro estágios passam a ser neutros e editáveis (`Nível 0` a `Nível 3`).


### Seleção, foco e teclado
- A limpeza da seleção agora remove todos os estados visuais de componentes, grupos e camadas, inclusive quando o conjunto lógico de IDs já está vazio.
- O Canvas recupera o foco após atualizações e renderizações da ficha; os atalhos consultam o Canvas atual, não uma referência DOM antiga.
- Setas, Delete, Ctrl+C, Ctrl+V, Ctrl+A e desfazer/refazer passam a compartilhar o ciclo de foco restaurado.

### Formatação e Inspector contextual
- Substituídos os campos de seleção tipográfica por uma barra compacta de ferramentas com botões de negrito, itálico, sublinhado, alinhamento, família, tamanho e cor.
- A formatação pode ser aplicada separadamente ao conteúdo e ao título do card.
- Os estilos são aplicados ao conteúdo inteiro, seja texto manual, valor derivado de propriedade, campo, anotação, tabela ou indicador.
- As opções de imagem aparecem separadamente para componentes de imagem, com ajuste, posição e opacidade.
- O seletor de cores deixa de desenhar uma caixa externa duplicada; o host fica transparente e o botão de cor permanece compacto.

### Ações de componentes
- As ações agora incluem rolagem, marcador de domínio de quatro níveis e ajuste de recurso por barra arrastável.
- Os quatro níveis do marcador têm rótulos editáveis e podem gravar um valor numérico de 0 a 3 em uma propriedade vinculada; os nomes padrão são apenas apresentação, não uma regra universal do NEXUS.
- A barra arrastável pode atualizar valores atuais de recursos com máximo definido, com prévia imediata durante o arraste.

### Retrato e token
- Adicionado controle separado para o retrato do Actor (Actor.img), usado no diretório de Atores do Foundry.
- A textura do Token de Protótipo continua separada; ao trocar o retrato, o NEXUS atualiza a textura do protótipo somente quando ela ainda herdava o retrato anterior ou o fallback, preservando imagens de token personalizadas.

### Validação
- CI valida sintaxe, manifesto, templates, CSS, regressões e pacote de distribuição.
- Teste funcional real no Foundry VTT 14 continua necessário para confirmar foco, interação de sliders, popovers, retrato e persistência visual.

## 1.0.0.4

### Cards inteligentes e composição
- Corrigido o movimento de múltiplos cards selecionados que pertencem a grupos.
- A seleção é limpa ao clicar fora da ficha, sem remover o foco dos painéis do NEXUS.
- Grupos personalizados podem ser salvos na Biblioteca pessoal do usuário e inseridos novamente como composições independentes.
- A ação de rolagem pode ser executada clicando na área do card no modo de jogo, sem botão adicional.
- O campo de fórmula só aparece quando a ação de rolagem está selecionada.
- Adicionados controles de alinhamento, peso, estilo, transformação, espaçamento e altura de linha.
- Alterações tipográficas e visuais recebem prévia imediata sem remontar o Canvas a cada edição.
- O seletor de cores usa a camada superior do navegador para não ficar recortado pelo painel.
- Removidas as hints visuais redundantes.
- O caminho `.exib` é aceito como compatibilidade para metadados antigos `.exibicao`.

### Validação
- Adicionadas verificações estáticas para seleção em grupo, composição na Biblioteca, interação por clique, tipografia e seletor de cores.
- Testes reais no Foundry VTT 14 ainda necessários.

## 1.0.0.3

### Correções
- Configuração do Token de Protótipo dos Actors NEXUS com vínculo ativo por padrão e imagem de fallback.
- Criação de Tokens na cena preserva o vínculo com o Actor e utiliza a imagem do Token de Protótipo; o usuário pode desvincular o Token posteriormente nas configurações do Foundry.

### Biblioteca
- Catálogo inicial simplificado: somente **Indicador – Barra** (PV) permanece disponível.
- Removidos os demais componentes e temas de demonstração do catálogo inicial.

### Componentes
- Adicionada ação opcional de rolagem configurável no Inspector.
- Componentes vinculados podem exibir um botão **Rolar**.
- A fórmula pode ser definida diretamente no componente ou obtida da propriedade irmã `.roll` quando o caminho vinculado termina em `.name`.
- A execução utiliza os dados de rolagem do Actor e publica o resultado no chat do Foundry.
- A fórmula não é presumida pelo NEXUS: deve ser configurada conforme as regras do sistema.

### Validação
- Incluídas verificações estáticas para o vínculo Actor/Token, catálogo reduzido e ação de rolagem.
- Sintaxe JavaScript, manifesto, templates, estilos e regressões foram aprovados no CI.
- O teste dentro do Foundry VTT 14 continua necessário para confirmar os fluxos reais de Actors, Tokens e rolagens.

# Changelog

## 1.0.0.2 (em desenvolvimento)
- Separada a migração de dados legados da preparação de contexto da ficha, mantendo `_prepareContext()` sem gravações persistentes.
- A migração agora informa se houve alteração e a ficha atualiza a primeira renderização quando dados legados são migrados, sem exigir que o usuário feche e reabra a ficha.
- A migração mantém proteção contra repetição e pode ser tentada novamente após falha.
- A persistência de layouts agora serializa gravações no mesmo cliente e aplica merge de três vias por layout/componente, preservando alterações concorrentes em componentes ou propriedades diferentes.
- Corrigidas as verificações de imports relativos e de versão do pacote; ampliados os testes automatizados da migração e da atualização da primeira renderização.
- Persistência concorrente, reorganização ampla de CSS/templates e testes funcionais em Foundry VTT 14 continuam fora do escopo validado desta etapa.

## 1.0.0.1
- Corrigida a aplicação de arredondamento e opacidade quando o valor definido é zero.
- A opacidade agora aceita o intervalo completo de 0% a 100%.
- Campos de texto, campos livres e anotações sem vínculo com propriedades do Actor passam a salvar seu conteúdo na instância do componente.
- Valores locais são preservados ao salvar e reutilizar componentes pela biblioteca.
- Mantida a persistência existente das células de tabelas.
- Reforçadas as verificações automatizadas do pacote e a geração do ZIP de instalação.

## Validação
- Verificações automatizadas de manifesto, arquivos referenciados, sintaxe JavaScript, templates e regressões.
- O ZIP de distribuição é gerado com system.json na raiz.
- Testes de interação e compatibilidade ainda precisam ser executados em uma instalação real do Foundry VTT V14.

## 1.0.0
- Base reconstruída a partir da candidata 1.0.4.
- Preservação de scroll e foco revisada para evitar reposicionamento e foco roubado após atualizações.
- Corrigida duplicidade de atualização de nome e removido listener duplicado de tipografia global.
- Editor de propriedades percorre campos aninhados sem descartar propriedades irmãs de `value`/`max`.
- Propriedades escalares adicionais de `Actor.system` aparecem no editor nativo e respeitam seus tipos básicos ao salvar.
- Imagem do token movida para Geral > Dados; prévia de mídia adicionada ao editor de Dados.
- Seletor de cores NEXUS com espectro HSV, transparência, entrada hexadecimal e texturas opcionais para fundos.
- Menu de propriedades mantém um único portal ativo e limpa portais órfãos após renderizações, evitando duplicidade e cintilação.
- Tokens de destaque NEXUS aplicados à janela principal, painéis e controles que herdavam o destaque laranja do Foundry.
- Removidos os botões globais de reset de tema e tipografia.

## Validação
- Sintaxe JavaScript, JSON e integridade do ZIP aprovadas.
- Verificações estáticas de elementos, eventos, seletores e consistência dos templates aprovadas.
- Testes de interação e compatibilidade ainda precisam ser executados em uma instalação real do Foundry VTT V14.
