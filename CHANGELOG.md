## 1.0.0.90 — Biblioteca Explorer unificada

- Substitui a navegação fragmentada por uma experiência universal com Todos os itens, Favoritos, Recentes e acesso direto às coleções especializadas.
- Agrega as coleções persistidas em uma visão transversal sem alterar os tipos semânticos dos itens.
- Adiciona pastas pessoais livres ou vinculadas a uma coleção; pastas e atribuições permanecem nas preferências do usuário.
- Gera chips de filtro a partir das etiquetas realmente salvas, sem manter opções técnicas hard-coded.
- Padroniza cartões genéricos com prévia, título e metadados; aplica o mesmo modo de grade/lista às coleções visíveis.
- Amplia o Inspector com prévias seguras e edição de nome, descrição, etiquetas e pasta.
- Adiciona duplicação com nova identidade e exclusão controlada; ativos lógicos com dependentes registrados não podem ser excluídos.
- Espelha operações de CRUD nas flags legadas correspondentes, preservando compatibilidade com consumidores existentes.
- Mantém o armazenamento canônico, as estruturas legadas e a separação entre definições reutilizáveis e instâncias.
- Ações específicas de aplicação/inserção continuam nos espaços especializados quando o tipo exige configuração própria.
- Inclui testes de regressão e atualiza README, roadmap, visão do projeto e contrato da Biblioteca.
- Candidata para Foundry VTT 14 build 360. CI e pacote não substituem o teste visual/funcional no Foundry real; esta versão não é checkpoint funcional confirmado.

## 1.0.0.89 — build de teste da ficha no Foundry VTT 14

- Gera uma versão identificável para a rodada de testes manuais da ficha de personagem no Foundry VTT 14 build 360.
- Não inclui correções funcionais na ficha nesta versão: o código de execução permanece igual ao estado publicado na 1.0.0.88.
- A ficha ainda não é considerada concluída; problemas encontrados durante o teste devem ser registrados e corrigidos em alterações posteriores.
- O manifesto estável permanece apontando para 1.0.0.88 até que o GitHub Actions valide e publique o pacote `nexus.zip` da 1.0.0.89.

## 1.0.0.88 — build para teste no Foundry VTT 14

- Prepara a publicação da etapa atual da Biblioteca, incluindo o menu contextual para excluir pastas pessoais sem remover os itens armazenados.
- Mantém a versão identificada como build de teste; a validação visual e funcional no Foundry VTT 14 build 360 continua pendente.
- O manifesto estável será atualizado somente depois que o GitHub Actions validar e anexar `nexus.zip` à Release `v1.0.0.88`.

## Em desenvolvimento — revisão da Biblioteca e do Inspector

- Reorganiza o Inspector em seções compactas com navegação por ícones para aparência, dados, interações e opções avançadas.
- Adiciona exclusão de pastas pessoais pelo menu contextual; os itens permanecem na Biblioteca e apenas perdem a associação com a pasta.
- Atualiza o Inspector após salvar metadados para evitar exibir dados antigos.
- Substitui filtros textuais repetidos por seletores compactos e mantém os controles de grade/lista por ícones.
- Consolida regras visuais da grade, cartões e rolagem com uma camada de estilos compartilhada.
- Torna a predefinição de barra neutra e sem vínculo automático com PV; remove o marcador de proficiência da Biblioteca sem remover a mecânica das perícias.
- Acrescenta testes estáticos para os novos contratos da Biblioteca.
- A validação visual e funcional no Foundry VTT 14 build 360 continua pendente; esta etapa não altera a versão estável nem o manifesto.

## 1.0.0.87

### Biblioteca e área Lógica
- Agrupa Propriedades, Regras, Comportamentos, Fluxos e Funções sob a seção Lógica da navegação, preservando seus tipos e contratos especializados.
- Adiciona Propriedades e Funções às coleções visíveis da Biblioteca, incluindo leitura das flags legadas.
- O Inspector passa a apresentar a prévia visual de mídia/estilos e uma representação somente leitura do payload lógico, com esquema, estado, dependências e permissões.
- Alterações de metadados dos ativos lógicos atualizam também o registry em memória quando possível.
- Adiciona alternância entre grade e lista e controle de tamanho das miniaturas nas coleções.
- Mantém os payloads como dados inertes; a prévia não executa HTML, CSS, JavaScript ou expressões.

### Correções e validação
- Inclui uma verificação adicional dos controles de visualização e da prévia anexada ao Inspector.
- Corrige a ausência da prévia contextual no Inspector genérico.
- Adiciona testes de regressão para navegação Lógica, preview seguro, compatibilidade legada e modos de visualização.
- A validação visual/funcional no Foundry VTT 14 build 360 continua necessária antes de considerar a interface confirmada.

## 1.0.0.86

### Biblioteca — correção da apresentação dos cartões
- Corrige a estrutura dos cartões para manter a prévia quadrada na parte superior e o título em uma faixa separada abaixo.
- Neutraliza regras antigas de grid com duas colunas que podiam reposicionar o título ao lado do visualizador.
- Aplica a mesma orientação vertical aos cartões das coleções genéricas, mantendo o nome legível e quebrando linhas quando necessário.
- Mantém navegação, seleção, dados persistidos e configurações dos itens sem alterações.

### Validação e limites
- Acrescenta verificações automatizadas para a ordem vertical entre prévia e título.
- A confirmação visual final ainda depende de abrir a Biblioteca no Foundry VTT 14 build 360.
- Esta versão corrige a apresentação da Biblioteca; a área visual unificada Lógica e seus editores especializados continuam como próxima etapa.

## 1.0.0.85

### Núcleo Lógica
- Adiciona registry de ativos tipados: Propriedades, Regras, Comportamentos, Fluxos e Funções.
- Adiciona validação plugável por subtipo, dependências tipadas, detecção de referências ausentes e ciclos.
- Adiciona persistência da Lógica na Biblioteca, com leitura compatível das coleções antigas e proteção contra exclusão de ativos referenciados.
- Adiciona runtime declarativo com condições avaliadas pelo parser seguro, ações/funções registradas explicitamente, permissões, limites e diagnóstico.
- Evolui o armazenamento da Biblioteca para schema 2 e inclui coleções de Propriedades e Funções nos backups.

### Infraestrutura de mídia
- Adiciona serviço de capabilities nativas e decodificação de imagem via createImageBitmap quando suportada pelo ambiente.
- Adiciona pipeline de adaptadores sob demanda, com fallback quando um adaptador não consegue processar o arquivo.
- Adiciona contrato de Workers de mesma origem para processamentos pesados, com timeout e mensagens correlacionadas.
- Adiciona adaptador de upload Foundry usando FilePicker.upload e respeitando CONST.UPLOADABLE_FILE_EXTENSIONS.
- Adiciona roteador para storage externo configurado, cache IndexedDB local e chave de cache SHA-256.
- Expõe os serviços em game.nexus.logic e game.nexus.media.

### Limitações e validação
- Não inclui binários FFmpeg/libdav1d/libopus/libjxl; decodificação AV1/JXL via WASM permanece pendente.
- Nenhum backend externo vem configurado por padrão.
- A interface unificada Lógica ainda não está implementada.
- A versão precisa de teste funcional no Foundry VTT 14 build 360; CI automatizado não substitui essa validação.

## 1.0.0.84

### Biblioteca — nomenclatura final e títulos dos cartões

- Padroniza as origens como **Padrão**, **Pessoais**, **Módulos** e **Complementos**, mantendo os mesmos termos na navegação e nos filtros.
- Mantém a distinção entre tipo de conteúdo e origem: componentes, composições, modelos, temas, fluxos, regras, estilos visuais, comportamentos e mídia.
- Ajusta os nomes visíveis das coleções para a terminologia aprovada, sem alterar IDs internos ou formatos persistidos.
- Reforça a exibição dos títulos abaixo das prévias quadradas, com quebra em até duas linhas para evitar que nomes desapareçam ou sejam cortados.
- Preserva o layout de três áreas: navegação, grade de conteúdos e painel de detalhes/configuração.

### Validação e limites

- Acrescenta verificações automatizadas para os nomes Padrão/Pessoais e para a presença dos títulos nos cartões.
- A aparência final ainda precisa ser conferida no Foundry VTT 14 build 360; testes automatizados não substituem a inspeção no cliente real.

## 1.0.0.83

### Biblioteca — navegação, nomenclatura e apresentação

- Corrige a seleção exclusiva das origens da Biblioteca: elementos NEXUS, módulos, extras e conteúdo pessoal.
- Remove listeners duplicados que podiam disputar a seleção da origem e o estado ativo dos botões laterais.
- Corrige a filtragem entre elementos padrão e elementos pessoais, evitando que os dois conjuntos apareçam/ocultem incorretamente.
- Introduz filtros de origem nas coleções: NEXUS, módulos, extras e criados por mim, com classificação por metadados de origem.
- Padroniza os cartões em proporção quadrada, com miniaturas contidas e nomes legíveis.
- Isola a rolagem das grades para impedir que cabeçalhos, cards e inspector disputem a mesma área e cortem itens.
- Torna as ações de salvar elemento e salvar composição mais explícitas na interface.
- Remove a nota interna `nexus-library-definition-note` dos inspetores.
- Renomeia os conceitos visíveis para termos mais claros: Elementos, Composições, Automações, Aparências, Modelos de ficha e Interações.
- Preserva os identificadores internos e o formato dos dados para não quebrar fichas, módulos ou conteúdo já salvo.

### Validação e limites

- Testes automatizados de navegação por origem, exclusividade do estado ativo, proporção quadrada, rolagem independente e remoção da nota interna.
- Validação de pacote aprovada no GitHub Actions.
- A confirmação de aparência e comportamento no Foundry VTT 14 build 360 ainda depende de teste no cliente real.

## 1.0.0.82

### Biblioteca — reconstrução da interface e persistência

- Reconstrói a janela da Biblioteca com estrutura fixa e consistente: barra superior, busca/filtros, navegação lateral, área central de cards e inspector contextual.
- Todas as categorias passam a usar o mesmo padrão de layout, com rolagem independente e limites explícitos para miniaturas, cards e detalhes.
- Corrige a sobreposição vertical e a disputa entre regras antigas de grid/flex que causavam a navegação e os cards a ocuparem áreas incompatíveis.
- Permite salvar a configuração de um asset diretamente do inspector como modelo reutilizável, antes mesmo de inseri-lo na ficha.
- Centraliza a persistência de componentes/cards, grupos/blocos, layouts, temas e coleções no armazenamento unificado da Biblioteca.
- Mantém sincronização das flags legadas para compatibilidade com leitores existentes e migração progressiva.
- Salvamento de metadados das coleções passa a criar/atualizar sempre o armazenamento canônico.
- Mantém a separação entre modelo e instância: alterações aplicadas na ficha não modificam o modelo salvo.
- Adiciona testes de regressão para persistência canônica e compatibilidade legada.

### Validação e limites

- Validação de pacote, sintaxe, templates, estilos e testes de regressão automatizados aprovada.
- A aparência e os fluxos precisam de confirmação visual dentro do Foundry VTT 14 build 360; o screenshot do cliente real ainda é necessário para validar dimensões, rolagem, foco e interação.

## 1.0.0.81

### Biblioteca — janela unificada estilo Explorador

- Consolida a Biblioteca em navegação lateral, área central de itens e inspector contextual.
- Expõe categorias de modelos de ficha, assets salvos, mídia, estilos visuais, regras e comportamentos, lendo o armazenamento unificado com fallback para as flags legadas.
- Adiciona pastas personalizadas por coleção, atribuição de itens a pastas e navegação pelas pastas na barra lateral.
- Adiciona favoritos e itens recentes, com filtros dedicados.
- Permite editar metadados seguros (nome, descrição, etiquetas e pasta) sem executar conteúdo importado.
- Adiciona prévias seguras para mídia compatível, amostras de cores, expressões de regras e resumo de comportamentos.
- Adiciona overrides de nome, dimensões e cores ao inserir um layout salvo; o modelo original permanece intacto.
- Padroniza os painéis de detalhes e os controles da Biblioteca em diferentes larguras.

### Validação e limites

- Testes automatizados de organização da Biblioteca, preservação de modelos, overrides e regressões de pacote.
- Conteúdos executáveis importados permanecem inertes.
- A renderização visual e o fluxo de uso ainda precisam de confirmação em uma instância real do Foundry VTT 14 build 360.

## 1.0.0.80

### Comportamentos
- Renderiza a combinação salva no próprio botão de atalho, em um elemento de texto explícito; mantém a label durante captura, Escape e persistência.
- Alinha os cabeçalhos de gatilhos e condições com o botão + fixado à direita.
- Força os painéis de gatilhos e condições a usar a mesma largura de grid, box sizing e espaçamento.
- Mantém a edição de condição sem um controle Ativo fictício: condições são expressões avaliadas no fluxo; a ativação individual pertence às ações e a ativação geral pertence ao fluxo.

### Biblioteca — fundação
- Adiciona `scripts/core/library-store.js`, serviço independente do DOM com contrato unificado de coleções.
- Define coleções para componentes, grupos, layouts, modelos, assets, mídia, temas, estilos, regras, comportamentos e fluxos.
- Adiciona normalização JSON, limites de profundidade/tamanho/quantidade, migração explícita das flags legadas e merge com políticas skip, duplicate e replace.
- Expande backup para `NEXUS-LIBRARY/2`, preservando leitura retrocompatível de `NEXUS-LIBRARY/1`.
- Backup e restauração agora carregam também modelos, mídia, estilos, regras e comportamentos armazenados nas coleções pessoais.

### Limitações e validação
- A nova estrutura é a fundação de dados; a interface unificada e a migração persistente para armazenamento canônico ainda não estão concluídas.
- Conteúdo avançado permanece dado inerte durante importação; nenhuma string de código é executada pelo parser.
- Esta versão será empacotada e validada pelo workflow de release da `main` antes da publicação do manifesto.
- Teste funcional no Foundry VTT 14 build 360 continua necessário; esta publicação disponibiliza a etapa atual para teste, não representa a conclusão da Biblioteca unificada.

## Próxima versão — Biblioteca Explorer (em desenvolvimento)

### Interface
- Reorganiza a Biblioteca como uma janela única estilo Explorador de Arquivos, com navegação vertical à esquerda, área de itens ao centro e inspector contextual à direita.
- Padroniza grade, seleção, superfícies, espaçamento e largura dos painéis de detalhes entre Assets, Fluxos, Temas e Layouts.
- Adiciona navegação em árvore por Assets, itens pessoais, Fluxos, Temas, Layouts, Modelos de ficha, Assets salvos, Mídia, Estilos, Regras e Comportamentos.
- Conecta as coleções complementares ao armazenamento unificado com fallback de leitura das flags legadas.
- Apresenta itens dessas coleções em cartões e permite consultar metadados no inspector, sem executar conteúdo importado.
- Inclui itens das coleções complementares na busca compartilhada.
- Mantém a interface responsiva: em larguras menores, a navegação vira faixa horizontal e o inspector passa abaixo da listagem.

### Escopo ainda pendente
- Pastas hierárquicas personalizáveis, favoritos, recentes e filtros completos.
- Editores e prévias específicos para modelos de ficha, assets salvos, mídia, estilos, regras e comportamentos; por enquanto, essas coleções têm visualização de metadados.
- Editor de overrides para layouts e integração plena de todas as coleções com aplicação na ficha.
- Validação visual e funcional no Foundry VTT 14 build 360.

## 1.0.0.79

### Refinamento do editor de comportamento
- Novo fluxo começa vazio, sem gatilho, condição ou ação predefinidos.
- Remove o botão duplicado "Novo fluxo" do estado vazio; o botão + da barra é o único ponto de criação.
- Reorganiza gatilhos com seletor e combinação de teclas em colunas proporcionais; remove o painel escurecido e a legenda "Interação".
- Corrige a exibição dos atalhos para combinações legíveis, como "Shift + C".
- Alinha gatilhos e condições em colunas simétricas, sem cartões internos escurecidos.
- Padroniza os botões + de gatilhos, condições e ações.
- Condições e fórmulas passam a usar campos expansíveis até cinco linhas, com rolagem após esse limite.
- Remove a legenda "Fórmula" e mantém nome acessível no campo.
- Habilita o buscador de propriedades em expressões de condição com {{...}}, fórmulas e demais campos textuais de configuração de ações.
- Remove a divisória inferior da barra de fluxos.
- Transforma o estado ativo do fluxo em um controle visual de alternância ligado ao checkbox real.

### Validação
- Testes de regressão adicionados para fluxo inicialmente vazio e campos expansíveis com buscador de propriedades.
- Validação automatizada e teste de pacote Foundry serão executados pela CI.
- Teste visual e funcional no Foundry VTT 14 build 360 permanece necessário.

## 1.0.0.78

### Editor de comportamento e expressões
- Reorganiza a barra de fluxos: adicionar, ativar/desativar, renomear, salvar na biblioteca, duplicar e excluir ficam juntos, ao lado das abas.
- Permite renomear o fluxo pela ação de edição na barra, sem manter um campo de nome grande dentro do painel.
- Exibe atalhos diretamente no botão de captura (ex.: Shift + C), sem legenda auxiliar abaixo.
- Alinha os gatilhos em colunas consistentes e padroniza o botão de adicionar em Gatilhos, Condições e Ações.
- Remove o seletor visual Todas/Qualquer; expressões de condição passam a aceitar AND, OR, NOT, XOR, NAND e NOR, além de &&, || e !.
- Preserva a semântica de combinação antiga dos fluxos salvos para compatibilidade.
- Permite editar o nome de cada ação; ordem numérica, tipo, setas de reordenação e exclusão ficam na mesma linha.
- Mantém ações, gatilhos e condições existentes e adiciona duplicação de fluxos com novos identificadores internos.
- Padroniza a cor de fundo e a borda das superfícies de grupos, independentemente da profundidade e das cores individuais anteriormente salvas.

### Referências futuras
- A resolução de propriedades de outros atores e itens por UUID ou aliases legíveis não faz parte desta versão. A base atual continua usando caminhos de propriedades seguros; referências cruzadas exigirão um resolvedor contextual e identificadores estáveis.

### Validação
- Testes automatizados adicionados para precedência e operadores booleanos.
- GitHub Actions: validação estática, regressões e geração do pacote Foundry aprovadas.
- Teste visual e funcional no Foundry VTT 14 build 360 ainda necessário.

## 1.0.0.77

### Grupos e editor de comportamento
- Corrige o cálculo de cantos conectados para preservar os quatro cantos arredondados das superfícies de grupos.
- Remove contornos externos duplicados e padroniza bordas e fundos de grupos aninhados, sem inserir espaçamento artificial entre grupos adjacentes.
- Uniformiza o desenho de Gatilhos, Condições e Ações no editor de Comportamento, com cartões, cabeçalhos, campos e espaçamentos consistentes.
- Remove o seletor genérico de modificadores dos gatilhos. Atalhos de teclado passam a ser configurados pela captura da combinação completa (por exemplo, Shift + C).
- Sinaliza conflitos quando a mesma combinação e fase (pressionar/soltar) já está atribuída a outro fluxo de componente no mesmo Canvas.
- Mantém a leitura de modificadores de atalhos já salvos para compatibilidade com fluxos existentes.

### Validação
- GitHub Actions: validação estática, regressões, sintaxe e geração do pacote Foundry aprovadas.
- O aviso de conflito cobre os atalhos NEXUS presentes no Canvas; não declara detectar todos os atalhos globais registrados por módulos externos do Foundry.
- Teste visual e funcional real no Foundry VTT 14 build 360 ainda necessário para confirmar cantos, grupos aninhados, editor em diferentes larguras e execução de atalhos.

## 1.0.0.76

### Estabilidade de mídia, condições e campos vazios
- Permite expressões seguras do motor de regras nas condições de gatilhos.
- Converte condições legadas no formato `path/operator/value` para expressões equivalentes, preservando os valores e operadores existentes.
- Ignora condições ainda vazias durante a configuração, mantendo as combinações Todas/Qualquer.
- Adiciona suporte restrito aos operadores `contains`, `isEmpty` e `isNotEmpty`.
- Reconhece URLs HTTP(S) diretas e URLs resolvidas por propriedades na renderização de conteúdo.
- Normaliza espaços invisíveis em origens de mídia antes de renderizar.
- Permite origens diretas ou vinculadas a propriedades nos componentes de imagem e token.
- Permite limpar o retrato do Actor e mantém o fallback nativo do Foundry para o token.
- Melhora o contorno visual de grupos aninhados.

### Validação
- GitHub Actions: validação de pacote, sintaxe, regressões e geração do pacote Foundry aprovadas.
- Testes funcionais no Foundry VTT 14 build 360 ainda necessários: retrato/token, URLs diretas e interpoladas, expressões de condição, campos vazios e grupos aninhados.

## 1.0.0.75

### Estabilização e compatibilidade
- Corrige a ordem e a remoção dos listeners do Inspector de propriedades.
- Coordena migrações e inicialização de atributos/perícias por Actor para evitar gravações simultâneas duplicadas no mesmo cliente.
- Preserva metadados de atributos aninhados durante a inicialização.
- Separa falhas de persistência de falhas de atualização visual da ficha.
- Trata rejeições de Promises nos limites dos listeners.
- Protege operações assíncronas do Floating UI contra resultados obsoletos e limpa timers durante a desmontagem.
- Torna iterativos os percursos de hierarquia e snapshot de grupos, evitando estouro de pilha em árvores profundas.
- Reutiliza índices de profundidade na composição e renderização do Canvas.
- Reduz comparações desnecessárias entre superfícies dispersas por meio de varredura espacial.

### Validação
- CI valida sintaxe, manifesto, templates, estilos, regressões e geração do pacote Foundry.
- A validação funcional e visual em instalação real do Foundry VTT 14 build 360 continua necessária, especialmente para persistência de propriedades, migrações e múltiplas fichas do mesmo Actor.

## 1.0.0.74

### Mídia, ícones e comportamento
- Corrige a expressão regular que impedia a conversão de tokens Font Awesome em elementos de ícone nas prévias.
- Incorpora URLs de imagem, áudio e vídeo coladas diretamente em conteúdo quando a extensão identifica o formato, inclusive URLs com parâmetros e fragmentos.
- Mantém a prévia de mídia logo abaixo do campo de valor/conteúdo nas propriedades, regras e ações compatíveis.
- Torna mais claros os gatilhos de foco, segurar e atalhos personalizados, com captura de tecla e modificadores como Ctrl + Shift + S.
- Remove o texto auxiliar legado de gatilhos, sem alterar a lógica de fluxos independentes.

### Validação
- Adiciona testes de regressão para classificação de mídia e interface de atalhos.
- Validação automatizada e teste funcional/visual no Foundry VTT 14 são necessários antes de declarar estabilidade.

---

## 1.0.0.73

### Mídia, ícones e propriedades
- Move a prévia de mídia da propriedade para imediatamente abaixo do campo Valor no Inspector, antes das regras de apresentação.
- Adiciona prévias individuais para conteúdos de regras e valores de ações que aceitam imagens, áudio e vídeo.
- Atualiza as prévias enquanto os valores são editados, sem exigir nova seleção do componente.
- Renderiza tokens de classes Font Awesome, como `fa-solid fa-circle`, como elementos de ícone em vez de texto literal.
- Mantém imagens, áudio e vídeo em elementos próprios, com controles nativos para mídia reproduzível.

### Comportamentos
- Remove `nexus-interaction-group-help` do editor.
- Adiciona o gatilho Segurar com duração configurável de 100 a 5000 ms.
- Torna mais claro o gatilho de teclado, com captura de combinações como Ctrl + Shift + S.
- Preserva gatilhos existentes de foco, perda de foco, hover, pressionar, soltar e cliques.

### Validação
- Adiciona testes para duração de hold, combinações de teclado, prévias por campo, ordem do Inspector e renderização de Font Awesome.
- A validação funcional/visual no Foundry VTT 14 ainda precisa ser realizada após a instalação.

---

## 1.0.0.72

### Compatibilidade e atualização
- Publica um pacote com versão própria para que o Foundry reconheça a atualização em vez de reutilizar a versão 1.0.0.71.
- Inclui a correção do contrato de dependências dos listeners que impedia a inicialização da ficha e a montagem dos menus e painéis flutuantes.
- Registra `NEXUS_PROPERTY_SCHEMA_VERSION` em `flags.nexus.propertySchemaVersion` após a migração do Actor.
- Protege Actors gravados por versões mais novas: uma versão antiga do NEXUS não executa migrações nem grava dados nesses Actors.
- Mantém dados mecânicos, layouts, componentes, grupos e personalizações fora do escopo de cada migração; mudanças futuras exigem migrações explícitas e idempotentes.

### Validação
- CI automatizado valida sintaxe, contrato de dependências, migrações idempotentes, proteção contra esquemas futuros e empacotamento.
- Teste funcional/visual no Foundry VTT 14 continua obrigatório antes de declarar esta versão estável.

---

## 1.0.0.71

### Correções de manutenção (mesma versão 1.0.0.71)
- Corrige a dependência `isMediaSource` ausente na ativação dos listeners da ficha, que impedia a renderização de Actors.
- Reduz operações repetidas na preparação da ficha: indexa componentes por ID, reutiliza o estado herdado dos grupos e calcula linhas de perícias uma vez por ciclo.
- Introduz `manifest.json` como canal estável de instalação e atualização. O workflow só sincroniza esse manifesto depois de confirmar que o ZIP da release foi enviado.
- O pacote da release `v1.0.0.71` será reconstruído com essas correções, sem alterar o número da versão.
- A validação funcional e visual no Foundry VTT 14 ainda precisa ser confirmada após a instalação do pacote atualizado.

### Estabilização da ficha e integridade de dados
- Corrige a execução duplicada de interações quando o mesmo fluxo está associado a `pointerDown` e `click`, sem bloquear cliques independentes nem gestos convertidos em arraste.
- Introduz escopos descartáveis para listeners do Canvas, permitindo encerrar juntos os listeners locais, globais e hooks associados ao ciclo de vida.
- Centraliza a serialização local de gravações de propriedades por Actor e a persistência de expressões.
- Extrai os controladores de valores de propriedades, seleção/autocomplete de caminhos e fórmulas, mídia, aliases, perícias e recursos da ficha.
- Centraliza validação, normalização, colisões, migração de identificadores e leitura compatível de dados legados de aliases.
- Preserva payloads de aliases em conflitos de migração, prioriza dados canônicos e mantém fallback para chaves históricas.
- Remove blocos CSS exatamente duplicados e dependências não utilizadas dos contratos de listeners.
- Amplia os testes de regressão e comportamentais dos fluxos extraídos.

### Validação e limitações
- GitHub Actions: validação de pacote, sintaxe, regressões e empacotamento aprovados no commit `f5bba318ac6900b2c9fe69cdd64af60b61d1db8f`.
- A publicação foi ignorada durante a validação da PR e concluída após a integração: release `v1.0.0.71` publicada com o asset `nexus.zip`.
- A serialização por Actor é local ao cliente; não fornece lock distribuído entre usuários ou janelas independentes.
- Persistência de aliases, dados personalizados e layouts envolve múltiplas gravações e ainda não constitui uma transação única.
- A validação funcional e visual em uma instalação real do Foundry VTT 14 continua pendente. Esta atualização não deve ser declarada estável nem distribuída como release final antes desses testes.

---

## 1.0.0.70

### Biblioteca e compartilhamento
- Adiciona backup completo da Biblioteca em formato versionado `NEXUS-LIBRARY/1`, incluindo componentes, grupos, layouts, fluxos, assets e temas.
- Adiciona exportação JSON e importação de backup pela interface da Biblioteca.
- Preserva assets e temas personalizados como coleções pessoais; assets importados também ficam disponíveis entre os componentes pessoais.
- Adiciona aplicação de temas personalizados importados sem alterar o catálogo de temas padrão.
- Valida estrutura, tipos, cores, limites de tamanho e conteúdo JSON sem executar código importado.

### Organização e foco
- Mantém a organização hierárquica sem arraste e o tratamento de Escape por janela implementados na etapa anterior.

### Validação
- Inclui teste de ida e volta do backup completo da Biblioteca.
- Aguardar CI e teste funcional no Foundry VTT 14 antes de integrar à `main`.

---

## 1.0.0.69

## Próxima atualização — organização hierárquica e foco das janelas

### Canvas e grupos
- Mantém a hierarquia recursiva existente e adiciona uma ação explícita para mover componentes e grupos para qualquer grupo de destino ou para a raiz do Canvas.
- Substitui o arraste nativo da árvore de camadas por comandos de organização, preservando seleção individual e seleção de grupos completos.
- Atualiza as opções de destino conforme a seleção e exclui destinos que criariam ciclos hierárquicos.
- Superfícies de grupo deixam de apresentar cursor de arraste e passam a selecionar o grupo; componentes continuam com suas interações individuais.
- Adiciona controles para trazer a seleção para frente ou enviá-la para trás.

### Janelas e teclado
- Faz com que Escape seja tratado primeiro pela janela flutuante em foco, sem propagar o evento para fechar a ficha principal.
- Permite que popovers e diálogos internos consumam Escape antes do fechamento da janela.

### Validação pendente
- Aguardar execução do GitHub Actions.
- Testar no Foundry VTT 14 a movimentação entre níveis, prevenção de ciclos, seleção de grupos aninhados, comandos de camada e fechamento por Escape.
- A experiência visual e funcional ainda não foi validada em uma instalação real do Foundry.

---


### Grupos compostos e experiência do editor
- Ao selecionar um componente, destaca discretamente os demais membros do seu grupo sem alterar a seleção funcional.
- Reorganiza o Inspector de grupos em blocos contextuais de identificação, organização interna, seção e aparência.
- Oculta configurações que não se aplicam ao modo atual, reduzindo ruído e evitando opções sem efeito.
- Diferencia visualmente Pasta, Container e Seção e passa a renderizar títulos de cabeçalho para grupos do tipo Seção.
- Atualiza o escopo pessoal da Biblioteca após salvar grupos e força a atualização dos itens pessoais disponíveis.
- Preserva a hierarquia e a identidade dos componentes; nenhuma regra ou dado do Actor é alterado por estas melhorias.

### Validação
- JavaScript: sintaxe aprovada.
- Manifesto, templates, estilos e testes de regressão: aprovados no GitHub Actions.
- Pacote Foundry: gerado e verificado com sucesso.
- Teste visual e funcional no Foundry VTT 14 permanece pendente.

## 1.0.0.68

### Composição universal de grupos
- Separa hierarquia, organização espacial e apresentação visual dos grupos.
- Adiciona os tipos Pasta, Container e Seção, com cabeçalho opcional e título configurável.
- Adiciona layouts Livre, Horizontal, Vertical e Grade, com espaçamento, margem interna, colunas e alinhamento.
- Aplica layouts automáticos de dentro para fora, preservando o tamanho dos componentes e tratando grupos aninhados como unidades.
- Mantém o modo Livre como padrão para grupos existentes, sem reorganizar automaticamente fichas antigas.
- Corrige a normalização para preservar grupos pais que não possuem componentes diretos, mas contêm subgrupos.
- Amplia o Inspector de grupos e mantém as configurações de composição nos pacotes compartilhados existentes.

### Validação
- Inclui testes para compatibilidade de grupos antigos, layout automático, cabeçalho de seção e preservação de coordenadas.
- Testes automatizados e CI precisam concluir após o commit.
- Teste visual e funcional dentro do Foundry VTT 14 permanece necessário.

## 1.0.0.67

### Comportamentos e experiência do editor
- Organiza os gatilhos com rótulos explícitos para evento, modificadores e tecla, texto de orientação e ação para limpar uma tecla capturada.
- Aprimora a captura de atalhos, preservando a combinação de modificadores e exibindo a tecla de forma legível.
- Torna componentes com atalhos de teclado acessíveis por foco: clicar no componente dá foco, e Tab também permite alcançá-lo.
- Evita executar atalhos em campos de edição, ignora repetição automática da tecla e desativa gatilhos de teclado sem tecla definida.
- Refina visualmente os cartões da Biblioteca e os painéis de comportamento, com hierarquia, estados de foco e adaptação a painéis estreitos.

### Grupos e Biblioteca
- Permite selecionar grupos completos com Ctrl/Cmd ou Shift pela árvore de camadas e pelo espaço livre da superfície no Canvas; a seleção combinada pode ser agrupada novamente como um grupo pai.
- Preserva a identidade do grupo selecionado ao resolver seleções hierárquicas com descendentes compartilhados.
- Corrige a importação de grupos aninhados, persistindo a árvore de grupos junto aos componentes.
- Normaliza composições antigas e gera identificadores de origem estáveis para religar os componentes ao grupo durante a inserção.
- Regenera IDs de componentes e grupos ao inserir uma composição, remapeando referências internas e vínculos de hierarquia.
- Adiciona ações claras na Biblioteca para salvar a seleção, copiar a configuração, importar código e importar arquivo JSON.
- Permite exportar grupos como JSON puro e importar tanto JSON puro quanto códigos versionados.
- Mantém compatibilidade com `NEXUS-GROUP/1` e valida IDs, referências, propriedade direta de componentes e ciclos na hierarquia.
- Adiciona testes de regressão para grupos aninhados, grupos legados e importação/exportação JSON.
- Adiciona nome editável e seletor de grupo superior no Inspector, permitindo mover grupos entre níveis sem recriar seus componentes; destinos que causariam ciclos são bloqueados.
- Introduz o formato unificado e versionado `NEXUS-PACK/1` para componentes individuais, grupos hierárquicos e layouts completos.
- Componentes salvos preservam todas as configurações serializáveis, inclusive propriedades futuras, sem carregar IDs ou posições específicas da instância original.
- A Biblioteca permite copiar ou exportar componentes, grupos e layouts como pacotes JSON e importar esses pacotes em seus respectivos espaços pessoais.
- A importação mantém compatibilidade com arquivos e códigos legados `NEXUS-GROUP/1`, `NEXUS-GROUP/2` e `NEXUS-LAYOUT/1`.
- Os pacotes compartilham apenas dados JSON inertes; fórmulas, caminhos e interações são preservados como configuração, sem executar código recebido.

### Validação
- A suíte automatizada continua sendo executada pelo GitHub Actions.
- O teste funcional de seleção, movimentação e persistência no Foundry VTT 14 ainda precisa ser realizado em uma instalação real.

## 1.0.0.67

### Correções
- Corrige o erro `ReferenceError: groups is not defined` ao preparar o contexto da ficha.
- Obtém os grupos e componentes diretamente do layout ativo normalizado antes de construir a hierarquia.
- Adiciona teste de regressão para garantir que os arrays existam antes da montagem das camadas.

## 1.0.0.66

### Grupos e camadas
- Remove as alças/cabeçalhos visuais dos grupos; eles não consomem altura nem criam espaçamento adicional.
- Substitui a associação plana por hierarquia real com `parentGroupId` e `componentIds` diretos, mantendo componentes e superfícies como elementos independentes no Canvas.
- Grupos externos calculam seus limites incluindo todos os descendentes; mover, ocultar e bloquear um grupo respeita sua hierarquia.
- Superfícies aninhadas preservam a separação visual por contornos em camadas, sem padding ou redimensionamento dos componentes.
- A árvore de camadas agora representa níveis ilimitados, permite recolher descendentes e arrastar grupos para dentro de outros grupos.
- Salvar, importar, copiar e inserir grupos na Biblioteca preserva a árvore interna e as configurações dos subgrupos.
- Grupos legados sem `parentGroupId` continuam sendo interpretados como grupos de nível superior.

### Biblioteca de layouts completos
- Adiciona uma seção Layouts à Biblioteca pessoal.
- Permite salvar o layout atual completo, incluindo dimensões, tema, aparência, componentes, grupos, vínculos e comportamentos.
- Permite importar/exportar layouts por código JSON legível e versionado.
- Inserir um layout da Biblioteca cria uma nova aba na ficha, preservando a aba atual.
- IDs de componentes e grupos são regenerados durante a inserção, incluindo referências internas e vínculos entre componentes.
- Limites e validações impedem códigos com tipos de componentes desconhecidos, grupos inexistentes ou ciclos na hierarquia. O importador de layouts também rejeita IDs de componentes ausentes/duplicados e referências de grupo sem destino.

### Compatibilidade e validação
- Mantém compatibilidade de importação com códigos antigos `NEXUS-GROUP/1`; novos grupos usam `NEXUS-GROUP/2`.
- Inclui testes de regressão para hierarquia, prevenção de ciclos, compartilhamento de grupos aninhados e compartilhamento de layouts completos.
- A validação automatizada não substitui o teste funcional no Foundry VTT 14.

# NEXUS RPG

<p align="center">
  <strong>Uma base modular para fichas de RPG no Foundry Virtual Tabletop.</strong><br>
  Projeto em desenvolvimento · Versão 1.0.0.66 · Foundry VTT 14
</p>

<p align="center">
  <img alt="Versão" src="https://img.shields.io/badge/vers%C3%A3o-1.0.0.66-6750A4">
  <img alt="Foundry VTT" src="https://img.shields.io/badge/Foundry%20VTT-v14-orange">
  <img alt="Idioma" src="https://img.shields.io/badge/idioma-pt--BR-009739">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-blue">
</p>

O **NEXUS** é um projeto de RPG que também busca oferecer uma experiência flexível de criação e utilização de fichas. Este repositório contém a implementação do sistema para **Foundry VTT**, com foco atual em uma ficha Canvas modular, componentes configuráveis e uma biblioteca de elementos.

> **Versão atual:** 1.0.0.66. Adiciona grupos hierárquicos sem cabeçalhos, superfícies independentes, seleção pela árvore de camadas e compartilhamento de grupos aninhados. A Biblioteca passa a salvar, importar, exportar e inserir layouts completos como novas abas, sem sobrescrever o layout atual.

## Visão geral

A proposta de longo prazo é separar três responsabilidades:

- **Regras e módulos:** definem atributos, recursos, propriedades e comportamentos de cada experiência de RPG.
- **Ficha e componentes:** determinam como os dados são apresentados e organizados na interface.
- **Estilo e mídia:** controlam a aparência e os recursos visuais sem precisar alterar as mecânicas.

Essa separação orienta o planejamento do projeto. Nem todos esses recursos estão implementados na versão atual; consulte [Visão do projeto](docs/PROJECT_OVERVIEW.md) e [Roadmap](docs/ROADMAP.md).

## Base funcional herdada da versão 1.0.0.1

Com base no código e na documentação presentes neste repositório, a versão inclui:

- Ficha Canvas modular para os tipos de Actor registrados pelo sistema.
- Biblioteca de elementos organizada por categorias, com busca, prévia e configuração antes da inserção.
- Componentes para informações de personagem, recursos, atributos, perícias, ações, imagens, textos e estruturas visuais.
- Configuração visual da ficha, incluindo seletor de cores com HSV e opacidade.
- Editor de propriedades que percorre estruturas de dados de `Actor.system`.
- Prévia de mídia no editor de dados quando o valor vinculado corresponde a uma imagem, áudio ou vídeo reconhecível.
- Configurações iniciais de dados para novos Actors e tokens de protótipo vinculados ao Actor.

A lista descreve o escopo observado no pacote; não significa que todas as possibilidades de personalização ou todos os fluxos estejam livres de limitações.

## Compatibilidade

| Requisito | Versão |
|---|---|
| Foundry Virtual Tabletop | V14 |
| Versão atual | 1.0.0.66 |
| Idioma incluído | Português (Brasil) |

A compatibilidade declarada em `system.json` é Foundry VTT 14. Não presuma compatibilidade com versões anteriores ou posteriores sem validação específica.

## Instalação

### Instalação manual

1. Abra a página do repositório: [NEXUS RPG no GitHub](https://github.com/yottastrofficial-boop/Nexus).
2. Use **Code → Download ZIP**.
3. Extraia o conteúdo para a pasta de sistemas do Foundry:
   `Data/systems/nexus/`.
4. Confirme que o arquivo `system.json` está diretamente dentro da pasta `nexus`.
5. Reinicie o Foundry VTT e selecione **NEXUS RPG** ao criar um mundo.

A estrutura final deve ficar semelhante a:

```text
Data/
└── systems/
    └── nexus/
        ├── system.json
        ├── scripts/
        ├── styles/
        ├── templates/
        ├── lang/
        └── assets/
```

### Instalação por manifesto

O manifesto do sistema está definido em:

```text
https://raw.githubusercontent.com/yottastrofficial-boop/Nexus/main/system.json
```

A instalação por manifesto depende de um pacote de distribuição válido e acessível. Caso o Foundry não consiga baixar o sistema, utilize a instalação manual acima.

## Estrutura do repositório

```text
.
├── assets/
│   └── library/       # Catálogo e documentação da biblioteca
├── docs/              # Contexto, arquitetura e planejamento
├── lang/              # Traduções
├── scripts/           # Inicialização e lógica da ficha
│   ├── core/          # Serviços centrais extraídos gradualmente
│   └── sheets/        # Fachadas e controladores da ficha
├── styles/            # Estilos visuais
├── templates/         # Templates Handlebars
├── CHANGELOG.md
├── CONTRIBUTING.md
├── README.md
└── system.json        # Manifesto do sistema Foundry
```

## Documentação

- [Visão do projeto e arquitetura](docs/PROJECT_OVERVIEW.md)
- [Arquitetura técnica e refatoração 1.0.0.4](docs/ARCHITECTURE.md)
- [Contrato de propriedades e interações](docs/PROPERTY_AND_INTERACTION_SYSTEM.md)
- [Roadmap e funcionalidades planejadas](docs/ROADMAP.md)
- [Como contribuir](CONTRIBUTING.md)
- [Histórico de alterações](CHANGELOG.md)
- [Documentação da biblioteca](assets/library/README.md)

## Interações de componentes

O painel Comportamento oferece um editor de fluxos Trigger → Conditions → Actions. Um componente pode ter vários fluxos independentes; cada fluxo aceita múltiplos Triggers, condições AND/OR e Actions configuráveis e reordenáveis. A execução é sequencial e oferece política de erro. Ações antigas de rolagem e alternância continuam legíveis. Consulte [o contrato de propriedades e interações](docs/PROPERTY_AND_INTERACTION_SYSTEM.md).

## Estado e validação

A versão 1.0.0.66 reduz consultas repetidas ao DOM durante atualizações reativas de texto, agrupa ajustes de escala do Canvas em um único frame e respeita a preferência de movimento reduzido. O pacote é validado pelo CI; testes funcionais e visuais em uma instalação real do Foundry VTT 14 continuam necessários.

**Validação pendente:** instalação limpa, criação e edição de Actors, persistência de dados, interação entre janelas, biblioteca, mídia e comportamento em diferentes resoluções e cenários de uso.

Consulte o [CHANGELOG](CHANGELOG.md) para os detalhes registrados desta versão.

## Princípios do projeto

- Preservar identificadores e referências de dados estáveis.
- Separar dados, comportamento e apresentação sempre que possível.
- Preferir APIs públicas e padrões oficiais do Foundry VTT.
- Construir funcionalidades em etapas pequenas e verificáveis.
- Distinguir claramente recursos implementados de ideias em planejamento.

## Contribuição

Sugestões, relatos de problemas e melhorias são bem-vindos. Antes de propor uma alteração, leia [CONTRIBUTING.md](CONTRIBUTING.md) e descreva o comportamento esperado, o cenário em que ocorre e a versão utilizada.

---

<p align="center">
  <strong>NEXUS RPG</strong><br>
  <sub>Uma fundação flexível para experiências de RPG.</sub>
</p>


## Organização modular do código

A ficha continua sendo a fachada que integra o Foundry VTT, mas suas responsabilidades estão sendo extraídas gradualmente para módulos menores. A primeira etapa separa:

- `scripts/core/theme.js`: padrões de layout, tokens e aplicação de temas.
- `scripts/core/property-catalog.js`: catálogo, nomes e árvore hierárquica de propriedades.
- `scripts/sheets/panel-window.js`: janela flutuante dos painéis.
- `scripts/sheets/property-picker-view.js`: renderização da navegação e das sugestões do seletor.
- `scripts/sheets/actor-sheet-listeners.js`: ligações de eventos separadas da classe principal.
- `scripts/sheets/canvas-interactions.js`: gestos, seleção, teclado e interações do Canvas.
- `scripts/core/skills.js`: fonte das perícias e dos valores derivados.

A separação preserva os contratos entre módulos e o formato de dados já salvo nos Actors. Ela melhora a manutenção e permite testar cada domínio isoladamente; dividir arquivos, por si só, não reduz o trabalho executado pelo navegador. Otimizações de carregamento sob demanda serão avaliadas depois, com medições e sem comprometer a inicialização do Foundry.


## Regras de apresentação e expressões

- `@atalho`: referência abreviada ao valor apresentado pela propriedade.
- `{{caminho.direto}}`: leitura direta do caminho de dados, sem depender do atalho visual.
- `{{@atalho}}`: forma entre chaves compatível com regras existentes.
- `{{2 + 2 + 2}}`: soma numérica, resultado `6`.
- `{{"2" + "2" + "2"}}`: concatenação textual, resultado `222`.
- `{{"1" + "1"}}`: concatenação textual, resultado `11`.
- Texto fora de `{{...}}` é literal: `"1"+"1"="1"+"1"` permanece exatamente assim na exibição.

Os comparadores são `=` e `==` (igual), `!=` (diferente), `>` (maior), `>=` (maior ou igual), `<` (menor) e `<=` (menor ou igual). Multiplicação, divisão, subtração e módulo permanecem operações numéricas.

Texto literal e referências podem coexistir no conteúdo. Imagens e ícones são segmentos próprios, por exemplo `{{image:@retrato}}` e `{{icon:fa-solid fa-star}}`, evitando misturar recursos visuais com operações matemáticas.

A geometria de contato das bordas é compartilhada pelos modos Padrão, Configuração e Aparência; imagens e ícones são interpretados como segmentos próprios do conteúdo.
## 1.0.0.68

### Distribuição
- Publicação do pacote Foundry `nexus.zip` automatizada pelo GitHub Actions após a validação do pacote.
- O arquivo de distribuição contém `system.json` na raiz e é anexado à Release correspondente à versão do manifesto.
- A instalação manual deve utilizar o asset `nexus.zip` da Release, e não o ZIP automático do repositório-fonte.



## Em desenvolvimento — fundação da modernização

- Adiciona registry de formatos e adaptadores de mídia, com identificação por assinatura, MIME e extensão.
- Integra o registry ao ciclo de inicialização do NEXUS e expõe o serviço em game.nexus.media.formats.
- Adiciona testes de regressão para JXL, Opus, contêineres e carregamento sob demanda de adaptadores.
- Documenta a área unificada Lógica e a estratégia de compatibilidade de mídia via WASM e storage adapters.
- A decodificação JXL/AV1/Opus por WASM, a interface da Biblioteca reformulada e as migrações permanecem em etapas futuras.


## Em desenvolvimento — auditoria e hardening da base

- Corrige a identificação por assinatura de AVIF e valida o cabeçalho de contêiner JPEG XL.
- Serializa gravações de coleções e atualizações read-modify-write da Biblioteca por usuário; remove gravações duplicadas de flags legadas.
- Preserva metadados compatíveis desconhecidos no envelope da Biblioteca.
- Impede que a execução manual do workflow publique uma release; publicação exige push explícito com marcador [release] na main.
- Adiciona regressões automatizadas para fórmulas, Biblioteca, propriedades, isolamento de componentes e identificação de mídia.
- Registra o escopo da auditoria e as funcionalidades que ainda permanecem planejadas.
- Nenhuma regra mecânica ou versão estável foi alterada.
