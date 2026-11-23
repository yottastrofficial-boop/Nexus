# Biblioteca NEXUS — contrato de definições, coleções e instâncias

## Objetivo

A Biblioteca é um explorador universal de conteúdos reutilizáveis. Coleções e pastas organizam itens sem modificar seu tipo semântico. A interface mantém três regiões: navegação, cartões e Inspector contextual.

## Navegação e organização

- **Todos os itens:** agrega as coleções persistidas no armazenamento canônico.
- **Favoritos:** visão transversal dos itens marcados pelo usuário.
- **Recentes:** visão transversal dos últimos itens consultados.
- **Coleções especializadas:** elementos disponíveis, meus componentes, temas, modelos, fluxos, predefinições, componentes salvos, mídia, estilos, propriedades, regras, comportamentos e funções.
- **Pastas:** pastas pessoais podem ser globais (livres) ou vinculadas a uma coleção. A associação é metadado do usuário e não altera o tipo ou conteúdo do item.
- **Etiquetas:** chips gerados a partir das etiquetas realmente presentes nos itens salvos; a pesquisa e o filtro atuam sobre a coleção visível.
- **Visualização:** grade e lista compartilham os mesmos controles e padrões de cartão.

As visões Todos os itens, Favoritos e Recentes agregam conteúdo salvo. Os elementos padrão do catálogo continuam disponíveis na área Elementos disponíveis; não são convertidos artificialmente em definições pessoais.

## Cartões e Inspector

Os cartões seguem uma estrutura comum de prévia, título, metadado e estado de favorito. A prévia usa dados inertes e não executa HTML, CSS, JavaScript ou expressões importadas.

O Inspector genérico permite:
- consultar prévias contextuais seguras;
- editar nome, descrição e etiquetas;
- atribuir ou remover pasta;
- duplicar uma definição com identidade nova;
- excluir uma definição, removendo também seus metadados de favorito/recente/pasta.

Ativos lógicos com dependentes registrados não podem ser excluídos. A atualização do armazenamento canônico é espelhada nas flags legadas correspondentes para preservar compatibilidade com consumidores antigos.

A visão universal é agregadora e serve para localizar, organizar e administrar definições. Ações especializadas de inserir componentes, aplicar temas, inserir layouts ou anexar fluxos continuam disponíveis nas respectivas áreas de trabalho quando exigem configuração específica. A visão universal não deve simular uma ação de aplicação que o tipo não suporte.

## Definição e instância

- **Definição:** modelo reutilizável salvo na Biblioteca, identificado por ID estável e versão.
- **Rascunho de instância:** cópia temporária das configurações no Inspector, editável antes da inserção.
- **Instância:** cópia inserida no layout de um Actor, com ID próprio, referência à definição de origem e overrides próprios.

A inserção não altera a definição. A edição de uma instância não altera outras instâncias nem o modelo. A edição de um modelo não propaga mudanças automaticamente para instâncias existentes.

### Componentes

As funções `createLibraryDefinition` e `createLibraryComponentInstance` normalizam uma definição e criam uma cópia independente, com novo ID e campos `libraryDefinitionId`, `libraryDefinitionVersion` e `libraryOverrides`.

As personalizações feitas no Inspector são passadas como overrides; os valores não alterados continuam herdados do modelo no momento da criação da instância. Restaurar o padrão significa descartar o rascunho de overrides antes de inserir.

### Grupos

Um grupo salvo é uma composição autocontida de componentes e subgrupos. Ao inserir, os IDs dos componentes e grupos são recriados e as referências internas remapeadas. Os overrides do Inspector afetam apenas o grupo raiz da nova composição.

### Temas

Temas padrão são somente leitura. Temas pessoais podem ser editados como definições independentes. Nunca substituir um tema padrão silenciosamente.

## Persistência e compatibilidade

- Definições pessoais e preferências de organização permanecem no escopo do usuário.
- Instâncias pertencem ao layout do Actor.
- Pastas, favoritos e recentes são preferências; não são armazenados dentro da definição reutilizável.
- Importar/duplicar deve criar identidades novas e relatar conflitos, sem sobrescrever silenciosamente.
- Dados legados continuam legíveis; a primeira gravação canônica preserva as coleções migradas.
- Operações de CRUD atualizam o armazenamento canônico e espelham as flags legadas correspondentes.
- Conteúdo importado permanece dado inerte: não executar HTML, CSS ou JavaScript vindo de pacotes.
- Atualizações de definições não modificam instâncias existentes automaticamente.
- Exclusão de ativos lógicos deve respeitar dependências registradas.

## Estado da implementação — 1.0.0.90

Implementado nesta etapa:
- visão universal de itens salvos, favoritos e recentes;
- navegação sem agrupamentos técnicos separados por Lógica/Aparência/Outros;
- pastas livres e pastas vinculadas a coleção;
- chips de etiquetas derivados dos dados existentes;
- barra de pesquisa compacta e alternância grade/lista;
- cartões genéricos com prévia e dimensões padronizadas;
- Inspector de metadados com atribuição de pasta;
- duplicação e exclusão com identidades novas e proteção de dependências;
- espelhamento de CRUD para flags legadas.

Limitações que permanecem:
- editores especializados completos para cada tipo lógico ainda precisam ser desenvolvidos;
- nem todo tipo possui ação de aplicação direta a partir da visão universal; os fluxos especializados continuam responsáveis por inserir/aplicar conteúdos;
- a aparência, persistência e os fluxos devem ser testados no Foundry VTT 14 build 360 antes de declarar estabilidade funcional.

## Catálogo universal e provedores

O explorador deve apresentar uma única coleção de recursos, sem exigir uma área ou botão permanente por módulo/tipo. Os provedores entregam cartões ao mesmo catálogo; a classificação técnica é metadado e filtro contextual, não uma arquitetura de janelas separadas.

O contrato `LibraryResourceRegistry` foi iniciado com dois provedores:
- **Biblioteca NEXUS:** definições pessoais, catálogo padrão e coleções de Lógica.
- **Foundry:** referências UUID de Actors, Items, Scenes, Journal Entries, Macros, Playlists, RollTables e Cards.

Cada resultado contém identidade estável, provedor de origem, tipo, nome, descrição, etiquetas, miniatura, pasta, referência e capacidades declaradas. A listagem retorna metadados; `resolve(reference)` só obtém o objeto completo quando o Inspector ou uma ação realmente precisa dele. A paginação mantém cursores independentes por provedor.

Módulos podem registrar provedores adicionais em `game.nexus.library.registerProvider()`. Isso permite integrar conteúdo sem acrescentar um botão, aba ou janela por módulo. A Biblioteca controla descoberta e organização; o provedor continua responsável por resolver seu conteúdo e respeitar suas permissões.

### Importação integrada — direção inspirada no Plutonium

O fluxo desejado é: **origem → prévia/validação → destino compatível → confirmação**. Origens poderão incluir recursos NEXUS, documentos Foundry, compêndios explicitamente selecionados, arquivos do usuário e fontes externas compatíveis. Destinos poderão incluir documentos nativos, compêndios, fichas e coleções NEXUS.

A descoberta universal está implementada na camada de serviço. Os adaptadores de importação, validação de formatos e destinos ainda são etapas futuras. Conteúdo externo não será executado automaticamente; scripts, macros e comportamentos precisam de validação, permissões e confirmação explícita. Não incluir conteúdo protegido de terceiros no NEXUS: a integração deve operar sobre fontes e arquivos que o usuário tenha direito de utilizar.

A interface final deve manter uma barra compacta de pesquisa e um único controle de filtros; ações aparecem contextualmente no Inspector/menu do recurso, não como uma fileira de botões permanentes para cada categoria.

## Área unificada Lógica

Propriedades, Regras, Comportamentos, Fluxos e Funções/Expressões continuam sendo tipos distintos. A visão universal unifica descoberta e organização, não seus schemas, editores ou executores. Metadados comuns (origem, namespace, versão, permissões, etiquetas e dependências) podem ser apresentados de forma consistente sem colapsar os contratos especializados.
