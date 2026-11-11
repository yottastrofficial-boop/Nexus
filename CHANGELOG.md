## 1.0.0.7

### Inspector, ações e fórmulas
- O Inspector agora restaura explicitamente a ação selecionada e o conteúdo de `rollFormula` ao reabrir as propriedades do componente.
- O campo de fórmula aceita até 500 caracteres e compartilha o visualizador de propriedades com o campo de vínculo de dados.
- A lista de sugestões inclui caminhos completos e atalhos de exibição registrados, como `@DES`; selecionar uma sugestão insere o token no ponto atual do cursor.
- A expansão de aliases permanece anterior à avaliação do Foundry Roll, preservando a fórmula original armazenada no componente.

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
