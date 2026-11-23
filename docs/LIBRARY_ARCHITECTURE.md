# Arquitetura da Biblioteca NEXUS

## Princípio

A Biblioteca é um subsistema do NEXUS, não uma extensão interna da ficha. A ficha pode solicitar recursos e executar ações compatíveis com seu domínio, mas não deve controlar o catálogo, a persistência da Biblioteca nem a descoberta de documentos Foundry.

A separação é por responsabilidade e ciclo de vida, não por quantidade de arquivos. Módulos só devem ser extraídos quando possuírem contrato próprio, puderem ser carregados independentemente, tiverem dependências distintas ou forem reutilizados por mais de um consumidor.

## Camadas e responsabilidades

| Camada | Responsabilidade | Não deve assumir |
|---|---|---|
| `scripts/core/library-resource-registry.js` | Contrato de provedores, busca, paginação, normalização e resolução sob demanda | DOM, ficha, apresentação ou execução de conteúdo |
| `scripts/core/library-store.js` | Persistência e validação das definições pessoais NEXUS | Documentos Foundry ou preferências visuais |
| `scripts/core/library-preferences.js` | Pastas, favoritos, recentes e atribuições do usuário | Alterar definições ou documentos de origem |
| `scripts/library/catalog-explorer.js` | Apresentar resultados universais, seleção e Inspector genérico | Conhecer Actor, Canvas, templates de ficha ou regras de aplicação |
| `scripts/sheets/library-view.js` | Adaptar o Explorer ao espaço de ferramentas do editor e oferecer ações específicas da ficha | Ser a fonte de verdade do catálogo ou duplicar os provedores |
| `scripts/sheets/actor-sheet-*.js` | Consumir/aplicar recursos ao Actor e ao Canvas | Gerenciar documentos de outros domínios |
| `scripts/nexus-v1.0.0.js` | Inicializar serviços leves e expor APIs públicas em `game.nexus` | Carregar listas, mídias ou payloads completos durante o init |

## Fluxo de dados

1. O bootstrap cria o registro e os provedores, sem buscar todos os documentos.
2. O Explorer solicita uma página de metadados a `game.nexus.library`.
3. Cada provedor pagina sua própria fonte; o cursor de um provedor não força a leitura integral dos demais.
4. A interface apresenta metadados leves (nome, tipo, origem, etiquetas e miniatura).
5. Somente após selecionar um recurso, o Inspector chama `resolve(reference)`.
6. A ação final é encaminhada ao adaptador do domínio de destino. Por exemplo, inserir um componente no Canvas é responsabilidade da integração da ficha, não do registro universal.

## Regras de desempenho

- Não carregar payloads completos durante a busca.
- Não percorrer todos os compêndios automaticamente; IDs de compêndios precisam ser selecionados explicitamente.
- Usar paginação independente por provedor e limitar o tamanho das páginas.
- Carregar miniaturas com lazy loading e sem pré-carregar mídia de áudio/vídeo.
- Não criar caches paralelos sem evidência de gargalo. O índice de metadados já tem invalidação por evento; o conteúdo completo permanece sob demanda.
- Não duplicar documentos Foundry: manter UUID e resolver pelo bridge, respeitando permissões.
- Evitar dependência circular entre ficha e Biblioteca. A Biblioteca não importa classes ou templates da ficha.
- Não extrair funções minúsculas apenas para aumentar a quantidade de arquivos. O custo de indireção e manutenção precisa ser compensado por isolamento ou reutilização.

## Estado desta integração

O catálogo universal já possui provedores NEXUS e Foundry. O novo módulo `scripts/library/catalog-explorer.js` conecta a visão "Todos os itens" à API do catálogo e oferece seleção/Inspector genérico. A ficha permanece como adaptador de apresentação e destino para recursos que podem ser aplicados ao Canvas.

As seções especializadas existentes (temas, layouts, fluxos e componentes da ficha) permanecem no adaptador enquanto contiverem operações específicas do editor. A extração delas só deve ocorrer quando houver outro consumidor real ou quando for possível definir um contrato independente sem transportar dependências da ficha.

A integração inicial não implementa importação universal, ações de aplicação para todos os tipos, edição de documentos Foundry nem busca completa de favoritos/recentes em fontes ilimitadas. Essas capacidades exigem contratos e fluxos próprios; não devem ser simuladas por ações genéricas inseguras.
