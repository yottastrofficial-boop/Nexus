# NEXUS Design System — Foundry V14

## Objetivo

Unificar a identidade visual das fichas, ferramentas NEXUS e superfícies nativas selecionadas do Foundry, mantendo aparência independente das regras e dos dados dos documentos.

## Propriedade e precedência

A configuração visual possui três níveis explícitos:

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

## Superfícies integradas nesta etapa

- Sidebar principal e navegação de abas.
- Diretórios de Actors, Cards, Itens, Journals, Playlists, Compêndios, RollTables e Cenas.
- Campos e controles dentro da Sidebar.
- Navegação de Cenas, controles, Hotbar, Players e Chat em seus contêineres principais.
- Janelas ApplicationV2 de diretórios nativos reconhecidos, marcadas por uma allowlist no hook `renderApplicationV2`.

A integração não aplica seletores globais a toda classe `.application`, `.directory` ou `.window-app`. Aplicações de módulos externos permanecem fora do escopo, exceto se futuramente forem integradas por contrato explícito.

## Limites e evolução

- Esta etapa padroniza paleta, superfícies, bordas, campos, estados e realces; não substitui templates nativos nem muda a estrutura/ordem dos diretórios.
- O estilo de componentes internos que usem HTML/CSS próprio ou Shadow DOM pode exigir adaptador específico.
- Novos temas devem declarar tokens completos ou receber fallback seguro.
- Temas com tipografia, densidade, espaçamento e componentes customizados poderão ampliar o schema sem alterar os níveis de propriedade.
- A validação automatizada não substitui a inspeção visual em Foundry VTT 14 build 360 e a compatibilidade com módulos usados na campanha.
