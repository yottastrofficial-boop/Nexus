# NEXUS Design System — Foundry V14

## Objetivo

Unificar a identidade visual das fichas, ferramentas NEXUS e superfícies nativas selecionadas do Foundry, mantendo aparência independente das regras e dos dados dos documentos.

## Propriedade e precedência

A configuração visual possui três níveis explícitos. A configuração de campanha é autoritativa no armazenamento do mundo Foundry; a aplicação de CSS e tokens acontece em cada cliente, porque a interface é renderizada no navegador:

1. **Padrão do sistema:** `nexus-dark`, sempre disponível como restauração da identidade original NEXUS.
2. **Padrão da campanha:** tema salvo em uma configuração Foundry de escopo `world`, editável pelo GM e sincronizado no mundo.
3. **Preferência do usuário:** modo e tema pessoal salvos em configurações de escopo `user`, sem alterar a campanha nem outros jogadores.

O modo individual pode ser:
- `world`: seguir o tema da campanha;
- `system`: voltar ao padrão original do NEXUS;
- `personal`: usar o tema pessoal selecionado.

A campanha possui a opção **Permitir temas individuais**. Quando desativada, a preferência local permanece salva, mas a aparência efetiva é forçada para o tema da campanha. Ao reativar a permissão, a preferência volta a valer sem reconstrução dos dados.

## Contrato de dados

- IDs de tema são validados contra `THEME_TOKENS`; valores desconhecidos retornam ao padrão seguro.
- Configuração visual nunca é persistida em Actor, Item, Token ou Scene.
- Configuração de campanha é uma configuração Foundry `world`; preferências pessoais usam escopo `user` (não `client`), para representar a preferência do usuário Foundry em vez de uma preferência acidental do navegador.
- As configurações são registradas sem exigir recarga; `onChange` reaplica os tokens ao documento raiz.
- Tokens são aplicados no `document.documentElement`, permitindo que a mesma paleta alcance as fichas e as superfícies Foundry cobertas pelo CSS.
- `game.nexus.design.apply()` reaplica o tema; `getEffectiveTheme()` informa tema, origem e política efetivos.

## Perfis e Estúdio de Aparência

O contrato do perfil está em `scripts/core/design-profile.js` e é versionado por `DESIGN_PROFILE_SCHEMA_VERSION` (`NEXUS-DESIGN/1` no intercâmbio). O perfil separa quatro domínios:

- `palette`: 18 cores semânticas de superfícies, texto, bordas, realces, botões e áreas do Foundry;
- `typography`: família tipográfica em allowlist, tamanho principal/secundário/destacado e altura de linha;
- `layout`: densidade, raio dos cantos, escala de espaçamento e altura dos controles;
- `accessibility`: contraste normal/alto e redução de movimento.

As cores aceitas são exclusivamente hexadecimais (`#RGB` ou `#RRGGBB`) e são normalizadas para seis dígitos. Famílias tipográficas, densidade, raio e contraste são enums fechados. Valores fora dos limites retornam aos padrões seguros; strings CSS arbitrárias não são aceitas.

O Estúdio é uma ApplicationV2 independente registrada em Configurações do Jogo. Permite selecionar um preset, renomear o perfil, ajustar os tokens, ver prévia local em tempo real, avaliar quatro pares de contraste, importar/exportar JSON versionado (limite de 64 KB), restaurar o preset e salvar no escopo da campanha ou do usuário. A prévia não persiste; descartar/fechar restaura a aparência efetiva anterior.

A Biblioteca de Aparências reutiliza a coleção canônica `themes` do Universal Library (`libraryStore`), identificando perfis completos por `kind: "design-profile"`. O Inspector da Biblioteca apresenta uma prévia isolada do perfil com painel de exemplo, 18 tokens semânticos, tipografia, densidade, geometria, altura de controles e diagnóstico dos quatro pares de contraste. Essa prévia é somente apresentação: não altera o tema ativo nem aplica CSS ao documento raiz. Perfis de schema futuro são identificados, mas não normalizados para baixo, pré-visualizados ou aplicados. O Inspector oferece aplicação explícita à campanha (GM, com confirmação porque afeta quem herda o tema) ou à preferência pessoal (quando a política mundial permite); a gravação continua passando por `design.saveProfile()` e suas verificações de permissão. Cada entrada mantém metadados, paleta e o perfil versionado integral. O usuário pode salvar, carregar, duplicar, renomear, excluir, exportar e aplicar uma cópia à campanha (GM) ou à própria preferência (quando permitido). Aplicar copia o perfil validado para a configuração Foundry existente; não cria uma segunda configuração ativa nem altera a origem de herança. O backup universal preserva o perfil completo sem quebrar entradas antigas que contêm somente paletas. A inclusão de perfis completos atualiza o envelope de backup para `NEXUS-LIBRARY/3`; a leitura continua aceitando as versões 1 e 2, e perfis com schema futuro são recusados sem rebaixamento.

- `designWorldProfile`: perfil da campanha, escopo `world`.
- `designUserProfile`: perfil pessoal, escopo `user`.
- `game.nexus.design.getProfile(scope)`, `saveProfile(profile, scope)`, `preview(profile)`, `clearPreview()` e `openStudio()` compõem a API pública.
- O salvamento no escopo `world` exige GM; o escopo `user` respeita a política de temas individuais da campanha.
- O perfil pessoal não substitui a preferência de herança: `world`, `system` e `personal` continuam determinando a origem efetiva.

## Superfícies integradas nesta etapa

- Sidebar principal e navegação de abas.
- Diretórios de Actors, Cards, Itens, Journals, Playlists, Compêndios, RollTables e Cenas.
- Campos e controles dentro da Sidebar.
- Navegação de Cenas, controles, Hotbar, Players e Chat em seus contêineres principais.
- Configuração nativa de interface do Foundry (`UIConfig`) e a tela de configurações (`SettingsConfig`), identificadas por allowlist no hook `renderApplicationV2`.
- Janelas ApplicationV2 de diretórios nativos reconhecidos, marcadas por uma allowlist no hook `renderApplicationV2`.

O NEXUS não substitui nem reimplementa `UIConfig`: a configuração nativa continua responsável pelas preferências gerais do Foundry e recebe apenas a identidade visual permitida pelo Design System. O Estúdio de Aparência continua sendo uma ApplicationV2 própria, acessível pelo submenu nativo registrado com `game.settings.registerMenu()`; isso não cria uma aba paralela nem altera a navegação do Foundry.

A integração não aplica seletores globais a toda classe `.application`, `.directory` ou `.window-app`. Aplicações de módulos externos permanecem fora do escopo, exceto se futuramente forem integradas por contrato explícito.

## Limites e evolução

- Esta etapa padroniza paleta, superfícies, bordas, campos, estados e realces; não substitui templates nativos nem muda a estrutura/ordem dos diretórios.
- O estilo de componentes internos que usem HTML/CSS próprio ou Shadow DOM pode exigir adaptador específico.
- Novos temas devem declarar tokens completos ou receber fallback seguro.
- A tipografia definida pelo tema é usada como padrão; uma fonte explicitamente definida pelo layout tem precedência local.
- Densidade, espaçamento, raio, altura de controles, tipografia e acessibilidade já fazem parte do schema do perfil; novos componentes podem consumir os mesmos tokens sem alterar os níveis de propriedade.
- A validação automatizada não substitui a inspeção visual em Foundry VTT 14 build 360 e a compatibilidade com módulos usados na campanha.
- O roteiro obrigatório de validação manual está em `docs/FOUNDRY_THEME_VALIDATION.md`.


## Shell compartilhado e adaptadores nativos — candidata 1.0.0.93

O shell visual é compartilhado: aplicações NEXUS ApplicationV2 recebem a classe de superfície NEXUS pelo hook de renderização e consomem os mesmos tokens semânticos de janelas, cabeçalhos, conteúdo, campos, botões, bordas e foco. Não se cria uma janela-base diferente para cada ferramenta; cada aplicação mantém seu ciclo de vida e estrutura, enquanto o shell central fornece identidade visual comum. Aplicações de módulos externos continuam fora da aplicação automática do tema.

A Biblioteca independente e o painel da ficha usam os mesmos tokens para toolbar, busca, filtros, navegação, cartões, metadados e Inspector. O CSS de compatibilidade legado é sobrescrito apenas dentro dessas superfícies NEXUS.

Os controles nativos do Foundry (Controls, Navigation, Players e Hotbar) recebem adaptação visual por seletores de superfície. O Chat apresenta cada mensagem como cartão com cabeçalho e corpo da mesma família cromática; conteúdo enriquecido nativo recebe limites responsivos para imagens, GIFs, vídeo, áudio, links e embeds. O NEXUS não transforma URLs em embeds automaticamente nem executa HTML/CSS/JS importado: a resolução do conteúdo continua sujeita ao pipeline e às permissões do Foundry.

A hierarquia das ferramentas flutuantes usa o z-index da própria janela e a API de foco da ApplicationV2. Somente o painel atualmente ativo pode ficar acima dos trilhos da ficha; painéis abertos mas inativos não bloqueiam a interação com a ficha. Não se define um z-index global fixo para aplicações de terceiros.

## Geometria responsiva dos controles nativos

A camada final de interface consome `--nexus-control-height` e os tokens de espaçamento derivados do perfil ativo. Controles do Canvas e trilhos flutuantes compartilham a mesma dimensão calculada, com limites seguros para telas estreitas. Os ícones preservam proporção e não são comprimidos pelo tamanho do botão.

A navegação de cenas mantém a estrutura e os eventos nativos do Foundry. A lista pode rolar horizontalmente quando não couber na viewport; cenas visualizadas e ativas recebem um estado visual próprio, sem substituir as classes ou os indicadores de permissão do Foundry. Os trilhos flutuantes das fichas permanecem portais externos ao conteúdo da ficha, mas ancorados à janela nativa NEXUS. Cada ferramenta abre sua própria janela ApplicationV2; a ficha não incorpora uma barra lateral permanente de configuração. Os trilhos rolam independentemente quando sua altura excede a área disponível.

Esta camada é estritamente de apresentação: não reordena controles, não cria botões nativos substitutos, não intercepta eventos e não altera permissões ou estado de cenas. O suporte a `prefers-reduced-motion` complementa a opção de acessibilidade do perfil.
