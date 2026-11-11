## 1.0.0.5

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
