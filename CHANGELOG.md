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
