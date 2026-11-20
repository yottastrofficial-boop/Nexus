# NEXUS — Arquitetura técnica e plano de estabilização 1.0.0.2

## Estado deste documento

Este documento registra os limites de responsabilidade desejados para a refatoração incremental. Ele não declara que os módulos descritos já existem nem autoriza uma reescrita integral.

## Princípios que não podem regredir

1. Dados do personagem e configuração/aparência da ficha têm ownership separado.
2. Preparação de contexto deve ser predominantemente leitura; migrações persistentes devem ser explícitas, idempotentes e controladas.
3. Alterações visuais não podem alterar regras ou valores do personagem.
4. IDs internos permanecem estáveis e independentes dos rótulos exibidos.
5. A extração de módulos deve preservar os contratos e o comportamento existentes.
6. Usar APIs públicas compatíveis com Foundry VTT V14.
7. Não declarar teste real no Foundry sem executá-lo em uma instalação real.

## Responsabilidades-alvo

| Área | Responsabilidade | Não deve assumir |
|---|---|---|
| Inicialização | Registrar sistema, documentos e fichas | Persistência de layouts |
| Sheet coordinator | Ciclo de vida da ficha e coordenação da interface | Implementar todos os serviços |
| Persistence | Ler/gravar dados de layout e configuração | Definir apresentação visual |
| Migration | Detectar e converter estruturas legadas | Rodar gravações dentro de preparação de contexto |
| Component registry | Definições e metadados dos componentes | Guardar estado específico de cada personagem |
| Component renderer | Transformar instâncias em contexto/renderização | Decidir regras de jogo |
| Editor/Canvas | Seleção, gestos, posicionamento e ferramentas | Persistir diretamente o mapa completo |
| Groups | Relações estruturais e operações de grupo | Ser apenas decoração CSS |
| Library | Definições reutilizáveis e importação/exportação | Alterar instâncias sem confirmação |
| Design system | Tokens, temas e estilos | Alterar dados ou mecânicas |
| Media | Resolver e apresentar mídia | Executar conteúdo não confiável |

## Sequência segura de refatoração

### Etapa 0 — Linha de base
- Preservar a implementação estável 1.0.0.1.
- Validar manifesto, imports relativos, sintaxe, templates e pacote.
- Registrar limitações e cenários ainda não testados.

### Etapa 1 — Persistência e migrações
- Mapear todos os leitores e escritores de layouts, aliases e flags.
- Definir invariantes e ownership de cada campo.
- Separar normalização em memória de migração persistente.
- Garantir idempotência e comportamento de falha seguro.
- Investigar concorrência com testes reproduzíveis antes de introduzir fila, lock ou merge.

### Etapa 2 — Testes de regressão
- Testar valores zero, strings vazias, checkbox, select, tabelas, campos locais e propriedades vinculadas.
- Testar criar, renomear, alternar e excluir layouts.
- Testar migração de formatos antigos e repetição da migração.
- Testar duas alterações concorrentes e comprovar que nenhuma atualização é perdida.

### Etapa 3 — Extração incremental
- Extrair primeiro funções puras e registries sem dependência de DOM.
- Em seguida separar persistência e migrações com contratos explícitos.
- Depois separar renderer, biblioteca e ferramentas do Canvas.
- Manter a classe da ficha como coordenadora até que cada módulo esteja validado.
- Atualizar imports e executar a suíte após cada extração.

### Etapa 4 — CSS e templates
- Organizar CSS por domínio (base, ficha, Canvas/editor, biblioteca, painéis, temas).
- Preservar a ordem da cascata durante a primeira reorganização.
- Remover regras duplicadas somente após comparação visual e testes de regressão.
- Extrair Handlebars para partials por região funcional, mantendo a estrutura e os seletores esperados.

### Etapa 5 — Validação de release
- Instalação limpa e atualização sobre 1.0.0.1.
- Verificação de preservação dos Actors e layouts existentes.
- Teste de abrir/fechar/reabrir fichas, múltiplas fichas e múltiplas janelas.
- Teste real no Foundry VTT V14.
- Gerar ZIP, validar sua raiz e confirmar o manifesto de distribuição.

## Implementação registrada na 1.0.0.2

- A migração de flags/aliases foi extraída para `scripts/core/migration-manager.js`; `_prepareContext()` permanece sem gravações persistentes.
- A primeira renderização é refeita quando a migração altera dados, evitando exibir valores antigos até a próxima abertura.
- A lógica de merge de snapshots está isolada em `scripts/core/layout-merge.js`. A ficha serializa gravações por Actor no cliente e combina alterações concorrentes por propriedade e por ID de componente/grupo/vínculo.
- O merge de três vias reduz a perda de alterações simultâneas no mesmo cliente. Não é um bloqueio transacional entre clientes/usuários diferentes; esse cenário ainda exige teste funcional no Foundry e pode exigir controle de versão no servidor.
- Os testes automatizados cobrem a preservação de edições em componentes distintos e propriedades diferentes, além da idempotência da migração. Ainda não substituem testes de concorrência com duas janelas/usuários no Foundry real.

## Critério de conclusão

A versão 1.0.0.2 só deve ser publicada quando os fluxos essenciais tiverem sido validados. Se um teste depender do Foundry real e ainda não tiver sido executado, a limitação deve permanecer explícita e a release não deve ser descrita como integralmente validada.

## Revisão incremental da base 1.0.0.70

Esta seção registra mudanças reais feitas na branch de auditoria, sem declarar a versão publicada como estável.

### Ciclo de vida de eventos

- `scripts/core/listener-scope.js` fornece `createListenerScope()`, um escopo de listeners controlado por `AbortController`.
- `scripts/sheets/canvas-interactions.js` registra os eventos da ativação atual por esse escopo e o encerra por meio do cleanup da ficha.
- O encerramento remove listeners locais e globais registrados pelo controlador e impede que uma ativação anterior continue reagindo após a substituição da interface.
- O escopo é testado com `EventTarget`: o listener responde antes do cancelamento e deixa de responder depois dele.

### Autocomplete e seletor de propriedades

- `scripts/sheets/actor-property-picker-listeners.js` controla o portal de autocomplete, posicionamento, filtragem por contexto e inserção de caminhos/fórmulas.
- O catálogo de propriedades e o renderer são dependências injetadas; o controlador não define o schema nem a semântica de avaliação.
- O módulo mantém os eventos namespaced pelo identificador da ficha, permitindo que o ciclo de vida existente encerre seus listeners sem introduzir um segundo mecanismo de registro.
- A ficha principal de listeners apenas instancia o controlador e fornece suas dependências.

### Renderização de mídia e previews

- `scripts/sheets/actor-sheet-media.js` concentra a classificação de fontes de mídia e os helpers reutilizáveis de preview de recursos.
- A resolução de imagem do token, que depende do Actor e do resolvedor de propriedades, permanece na fachada da ficha; a classificação de formatos e a construção/atualização do preview são responsabilidades separadas.
- Os testes cobrem URLs HTTP(S) assinadas sem extensão, caminhos locais por extensão, expressões não resolvidas e esquemas executáveis.

### Persistência de propriedades do Actor

- `scripts/core/actor-property-writes.js` concentra a fila serializada por Actor e a persistência de expressões de propriedades.
- O listener da ficha e os métodos da classe usam o mesmo serviço, evitando que a fila dependa do módulo visual.
- A fila continua sendo local ao cliente. Ela não equivale a uma transação ou lock compartilhado entre usuários diferentes.

### Contratos de dependência

- `activateCanvasInteractions` recebe somente `COMPONENTS`, `clone` e `clamp`, as dependências utilizadas pelo controlador.
- `activateActorSheetListeners` deixou de receber dependências não utilizadas.
- Essas reduções diminuem acoplamento e tornam explícito o contrato de cada módulo.

### Limitações ainda abertas

- A suíte automatizada não substitui o teste no Foundry VTT 14.
- A fila por Actor ainda precisa de validação com múltiplas janelas e usuários.
- O CSS requer consolidação por domínio, mas alterações de cascata e tema devem ser acompanhadas de comparação visual.
- A extração de partes do listener da ficha e da classe principal deve ocorrer por domínio, após mapear as variáveis compartilhadas e os pontos de persistência.

### Editor de valores de propriedades

- `scripts/sheets/actor-property-value-listeners.js` contém o ciclo de entrada e salvamento dos campos `data-property-value`.
- `activateActorSheetListeners` delega esse domínio ao módulo especializado, mantendo os demais eventos do Inspector no controlador geral.
- O módulo recebe a ficha, o namespace do Inspector, a verificação de propriedade do controle e as dependências de domínio; não mantém estado global próprio.
- A serialização de gravações e a persistência de expressões continuam centralizadas em `scripts/core/actor-property-writes.js`.
- A extração preserva o comportamento de fórmulas, literais entre aspas, valores numéricos vazios, aliases, caminhos virtuais, imagens e propriedades somente de leitura.
- As verificações de regressão foram redirecionadas para o módulo especializado e a validação automatizada do pacote passou.



### Regras reutilizáveis de identificadores de aliases

- `scripts/core/actor-aliases.js` concentra a normalização de rótulos, validação de caminhos e geração de identificadores únicos.
- A geração considera identificadores atuais e históricos (`legacyKeys`) tanto de aliases personalizados quanto de propriedades nativas, evitando reutilizar caminhos que ainda podem ser referenciados por layouts antigos.
- Criação, cópia e renomeação usam a mesma regra de colisão; o identificador interno (`id`) permanece independente do caminho editável.
- Os testes cobrem acentos, entradas vazias, prefixos de caminho, segmentos perigosos, colisões com chaves históricas e exclusão do próprio registro durante a renomeação.

### Migração de identificadores de aliases

- `scripts/core/actor-aliases.js` concentra também a movimentação de dados personalizados e a atualização de referências de componentes quando uma chave muda.
- `moveActorAliasCustomData()` move o payload entre caminhos sem sobrescrever um destino já existente; a função altera apenas o objeto recebido, por isso os chamadores passam um clone e mantêm a persistência sob responsabilidade da ficha.
- `replaceActorAliasLayoutReferences()` atualiza `dataPath`, `currentPath`, `maxPath` e `customBinding` em todos os layouts, reconhecendo raízes legadas singulares `attribute.` e `resource.`.
- Os fluxos de renomeação e restauração de aliases/propriedades nativas reutilizam os mesmos helpers, em vez de manter cópias da lógica de movimentação e substituição de caminhos.
- Testes comportamentais verificam movimentação de payload, proteção contra sobrescrita, migração de referências canônicas e legadas.


### Operações de aliases — integridade e persistência

- `moveActorAliasCustomData()` retorna um resultado explícito (`moved`, `missing`, `conflict` ou `invalid`) para que a interface não conclua uma renomeação quando o destino já possui dados ou quando os caminhos se sobrepõem. A função muta somente o objeto recebido após validar origem e destino; os chamadores fornecem um clone antes de persistir.
- A validação do destino ocorre antes de qualquer mutação; conflitos não deixam estruturas parcialmente criadas nem sobrescrevem o payload original.
- `createActorAliasDefaultValue()` concentra os valores iniciais de atributos, recursos e aliases escalares. `createActorAliasCopyDefinition()` prepara a cópia com novo ID, armazenamento personalizado e sem vínculo externo.
- A renomeação e a restauração só gravam layouts quando pelo menos uma referência de componente realmente foi alterada.
- O listener usa o mesmo normalizador de slug do serviço de domínio, eliminando a implementação local duplicada.
- Os testes comportamentais cobrem conflitos, caminhos sobrepostos, ausência de payload, entradas inválidas, preservação do estado em falhas, valores padrão e preparação de cópias.


### Controlador de aliases da ficha

- `scripts/sheets/actor-alias-listeners.js` concentra os eventos de criação, edição, renomeação, cópia, restauração e exclusão, além da restauração de foco/rolagem do editor.
- `activateActorSheetListeners()` delega esse domínio ao controlador especializado; o módulo recebe somente as dependências de leitura, normalização e persistência necessárias.
- A regra de negócio e os helpers puros permanecem em `scripts/core/actor-aliases.js`; o controlador não passa a ser dono do schema de Actor nem do armazenamento.
- A extração reduz o controlador geral de eventos sem alterar a classe da ficha nem introduzir um segundo mecanismo de persistência.


### Normalização e migração de aliases legados

- `normalizeActorAliasDefinition()` foi movida para `scripts/core/actor-aliases.js`, com geração de ID injetada para manter o serviço independente do ambiente Foundry.
- Quando uma chave antiga é normalizada (por exemplo, prefixos de categoria repetidos), a chave original é adicionada a `legacyKeys`. Layouts e fórmulas que ainda usam o caminho anterior continuam resolvendo para a definição canônica.
- `migration-manager.js` reutiliza `moveActorAliasCustomData()` para mover payloads, removendo a lógica de movimentação duplicada.
- Se o destino já contém dados, a migração preserva ambos os caminhos no armazenamento, mantém o destino canônico e informa a quantidade de conflitos no resultado. A ficha registra o aviso no console; nenhum payload é sobrescrito.
- Os testes verificam a normalização de caminhos repetidos, a preservação da chave legada, a idempotência e a não sobrescrita em caso de colisão.


### Serialização das operações do editor de aliases

- Criação, edição, renomeação, cópia, restauração e exclusão de aliases passam por `serializeActorPropertyWrite()`, compartilhando a fila local por Actor com as demais gravações de propriedades.
- A fila impede que operações concorrentes da mesma sessão usem snapshots antigos umas sobre as outras. Ela não é um lock distribuído e não impede conflito entre clientes diferentes.
- `getActorAliasCustomValue()` prioriza o caminho canônico e consulta `legacyKeys` quando o payload ainda não pôde ser movido por conflito. Isso mantém os dados legíveis sem sobrescrever o destino.
- Falhas são reportadas pelo serviço central da fila; o controlador não emite uma segunda notificação para o mesmo erro.


### Controladores de perícias e recursos da ficha

- `actor-sheet-skill-listeners.js` agrupa os eventos de rolagem e proficiência; os cálculos e a persistência continuam nos métodos da classe da ficha.
- `actor-sheet-resource-listeners.js` concentra interação por ponteiro, atualização visual dos medidores e envio do valor final ao atualizador da ficha.
- `actor-sheet-listeners.js` permanece como ponto de composição dos controladores, sem duplicar as regras desses domínios.
- As dependências usadas por cada controlador são recebidas explicitamente, reduzindo referências implícitas ao escopo do módulo.
