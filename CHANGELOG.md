## 1.0.0.146 — Biblioteca: cascata CSS, cartões e Inspector quadrado

- Corrige a cascata sem alterar a ordem oficial: o Design System continua como última folha e recebe um bloco final de regras da Biblioteca, que prevalece sobre os seletores antigos.
- Remove os controles de favorito dos cartões da grade; a ação continua disponível no Inspector, eliminando estrelas residuais e conflitos de posicionamento.
- Reconstrói a miniatura dos temas como uma interface compacta com cabeçalho, navegação, conteúdo, controles e amostras cromáticas.
- Reconstrói o contrato da grade com linhas reservadas para miniatura, título e etiqueta, evitando sobreposição entre elementos.
- Mantém miniaturas quadradas de 32 × 32, 64 × 64 e 128 × 128 px e dimensiona os espécimes tipográficos conforme a seleção.
- Torna a demonstração completa do tema no Inspector quadrada e organiza navegação, painel, destaque, barra de recurso, cartão, campo e botões.
- Atualiza testes e documentação para validar a cascata, a ausência de favoritos nos cartões e a proporção quadrada da prévia.
- CI, regressões, pacote ZIP íntegro, Release v1.0.0.146, asset `nexus.zip` (509.981 bytes) e manifesto estável foram confirmados pelo workflow 46121574486.
- A validação visual/funcional dentro do Foundry VTT 14 build 360 continua sendo um gate manual; o último checkpoint funcional confirmado permanece na 1.0.0.70.

## 1.0.0.147 — Reestruturação da amostragem da Biblioteca

- Separa a grade em `catalog-grid-renderer.js`, com cartões de recurso/pasta, ícones semânticos, labels, seleção e drag-and-drop.
- Extrai as prévias tipadas para `catalog-preview-renderers.js`, compartilhadas pelo Grid e Inspector.
- Unifica a amostra de tema: paleta compacta em 32 px, mini-interface em 64/128 px e variante quadrada completa no Inspector.
- Unifica a amostra tipográfica e aplica a família real da fonte aos espécimes.
- Cria `nexus-library-catalog.css` para geometria, dimensões, tipografia e estados dos cartões.
- Remove 677 linhas de estilos duplicados de grade/miniaturas/prévias do final do Design System e 1.018 linhas de seletores de cartões/prévias legados do Universal Library stylesheet.
- Preserva IDs, schemas, provedores, preferências, favoritos, pastas, referências e ações do catálogo.
- CI e validação do pacote Foundry aprovados na branch de release. A conferência visual final deve ser feita na instância Foundry após instalar o pacote publicado.

## 1.0.0.145 — Biblioteca: miniaturas, temas completos e tipografia

- Corrige a cascata da grade: os três tamanhos configuráveis voltam a controlar miniaturas quadradas de 32 × 32, 64 × 64 e 128 × 128 px.
- Ajusta a largura mínima dos cartões conforme o tamanho da miniatura, com espaçamento consistente e sem comprimir nomes.
- Remove a sobreposição absoluta dos controles de favoritos; as estrelas passam a ocupar uma linha própria no cartão, preservando a ação e seu estado.
- Substitui os presets cromáticos parciais por paletas semânticas completas, incluindo superfícies, campos, bordas, cabeçalhos, cartões, acentos e botões.
- Corrige a aplicação de fontes na prévia: a família de corpo e a família de títulos passam a ser consumidas pelos componentes da amostra; as miniaturas de fontes continuam usando a família registrada.
- Adiciona contratos automatizados para os três tamanhos, posicionamento dos favoritos e cobertura das paletas.
- Validação automatizada e publicação do pacote serão registradas pelo workflow desta versão. Teste visual/funcional no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.144 — Biblioteca de temas curada e tipografia (em validação)

- Reorganiza a coleção de temas-base em 12 opções: Padrão, sete cores e quatro estilos.
- Adiciona etiquetas de categoria, cor e estilo; o filtro da Biblioteca combina etiquetas com busca, origem, tipo e pasta.
- Faz temas internos resolverem para perfis visuais completos aplicáveis pelo Design System.
- Adiciona pares tipográficos: Cinzel/Cormorant Garamond (Medieval), Orbitron/Space Grotesk (Futurista), IM Fell English SC/Cormorant Garamond (Horror Cósmico) e Bangers/Barlow Condensed (Super-heróis).
- Mantém fallbacks locais quando as fontes web não estiverem disponíveis.
- Separa a miniatura da grade do viewer completo do Inspector e mantém os dois derivados dos tokens do tema.
- Preserva tokens legados e o schema atual dos perfis; `displayFamily` é opcional e normalizado.
- A capa do livro de regras não estava disponível entre os arquivos do projeto consultados; as paletas desta versão partem da identidade-base NEXUS e podem receber ajuste fino com a capa.
- CI, regressões, pacote ZIP, release v1.0.0.144, asset `nexus.zip` (507.118 bytes) e manifesto estável foram confirmados pelo workflow 46114908001. Teste visual real no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.143 — Diagnóstico do sistema e cache de mídia sob demanda

- Move a criação do objeto de cache IndexedDB para o primeiro acesso a `game.nexus.media.cache`; o bootstrap mantém a compatibilidade da fachada e não instancia o cache durante `init`.
- Adiciona `game.nexus.getDiagnostics()`, snapshot somente leitura de versão NEXUS/Foundry, readiness e estados/dependências dos serviços.
- O snapshot usa somente `serviceRegistry.list()`; consultar diagnóstico não resolve nem instancia serviços lazy.
- Adiciona testes unitários para contagem de estados, imutabilidade, validação e ausência de efeitos de resolução.
- Expande o contrato de bootstrap para garantir cache e diagnóstico lazy.
- Suíte de regressão, validação do pacote, release v1.0.0.143, asset `nexus.zip` (502.627 bytes) e manifesto estável foram confirmados pelo workflow 46100665229. Teste funcional no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.142 — Serviços sob demanda e fachada pública estável

- Introduz `defineAccessor()` no Service Registry para expor serviços como propriedades de objeto sem instanciá-los até o primeiro acesso.
- Mantém a fachada pública `game.nexus.*` e permite substituir uma factory por uma instância antes da primeira resolução; após inicialização, substituição continua protegida.
- Defer os serviços sem side effects de `resources`, transferências/backup da Biblioteca, registries/capabilities/pipeline/storage de mídia e registry/runtime de lógica.
- Mantém eager os serviços necessários durante `init`, incluindo Design System, catálogo da Biblioteca e classes ApplicationV2.
- Adiciona contrato de regressão para a classificação eager/lazy do bootstrap.
- CI, suíte de regressão, pacote ZIP, release v1.0.0.142, asset `nexus.zip` (501.325 bytes) e manifesto estável foram confirmados pelo workflow 46099909950. Teste funcional no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.141 — Lifecycle seguro do Service Registry

- Corrige o encerramento concorrente do registro de serviços: todas as chamadas simultâneas a `dispose()` compartilham a mesma Promise.
- Bloqueia novos registros e resoluções assim que o registry entra em encerramento.
- Aguarda factories já iniciadas terminarem antes de descartar as instâncias prontas.
- Executa o cleanup em ordem inversa de criação e aguarda também os cleanups assíncronos.
- Adiciona testes de regressão para factory em andamento, chamadas concorrentes, bloqueio durante encerramento e cleanup assíncrono.
- CI passou; pacote, release e manifesto serão confirmados pelo workflow oficial. Validação funcional no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.140 — Revisão arquitetural inicial e lifecycle de Actor

- Registra o mapa integrado dos subsistemas, contratos de comunicação, hotspots, etapas de refatoração e ferramentas de validação em `docs/ARCHITECTURE_MAP_2026-11-27.md`.
- Atualiza o plano estrutural para uma revisão por domínios, preservando dados, IDs, APIs e ownership.
- Extrai defaults de Actor e sincronização de textura do Token de protótipo do bootstrap para `scripts/core/actor-document-lifecycle.js`, com dependências Foundry injetadas e disposer idempotente.
- Adiciona testes unitários para defaults, preservação de textura personalizada, atualização de retrato e remoção de hooks.
- Atualiza os contratos de validação do pacote para refletir a nova fronteira de lifecycle.
- CI, pacote, release v1.0.0.140, asset `nexus.zip` (500.214 bytes) e manifesto estável foram confirmados pelo workflow 46095904917. Teste visual/funcional no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.139 — Prévia fiel de temas e fontes

- Resolve o preset e o perfil visual do próprio tema selecionado, em vez de normalizar temas legados como o preset global NEXUS Escuro.
- Preserva metadados visuais seguros de temas pessoais para o grid: paleta semântica, tipografia, layout e estilos por categoria de componente; custom CSS importado permanece excluído da prévia.
- Usa um modelo de perfil compartilhado no grid e no Inspector, incluindo 18 tokens de paleta e configurações de botões, painéis, containers, destaques e campos.
- Reescreve a mini-interface temática conforme o protótipo v6, com cabeçalho, navegação, painel, cartão, destaque, barra de recurso, campo e botões; o CSS da amostra fica isolado do tema global do Foundry/NEXUS.
- Aplica a família tipográfica escolhida diretamente aos espécimes Aa, Lorem Epsum e 12345 !@#$%, e reforça o escopo para impedir que regras globais sobrescrevam a amostra.
- Adiciona regressões para tema Medieval/Georgia, paleta personalizada, estilos de componentes e metadados seguros.
- CI, pacote e publicação estável foram confirmados pelo workflow 46075237452; asset `nexus.zip` publicado (499.335 bytes) e manifesto sincronizado em 1.0.0.139. Teste visual no Foundry VTT 14 build 360 permanece manual.

## 1.0.0.138 — Biblioteca: contrato visual unificado e prévias reais

- Remove as regras concorrentes antigas da barra de pesquisa em CSS legado e substitui por um único contrato responsivo com ícone, campo e botão de limpar.
- Reutiliza um renderizador de prévia temática em grade e Inspector, usando tokens semânticos por chave canônica; aplica paleta, tipografia, geometria e controles do tema.
- Reordena a aba Padrão para mostrar identidade, metadados resumidos e a prévia; descrição, etiquetas, resumo/tipo/dimensões e fatos ficam em Detalhes.
- Move a paleta para um dropdown abaixo da amostra do tema e garante que a amostra inclua uma barra de recurso visível.
- Adiciona prévia de barra/medidor de recurso aos cartões da Biblioteca e documenta o padrão compartilhado para futuros recursos.
- CI, validação do pacote, release v1.0.0.138, asset `nexus.zip` (496.309 bytes) e manifesto estável foram confirmados pelo workflow. Teste visual real no Foundry VTT 14 build 360 continua sendo um passo manual.

## 1.0.0.137 — Correções visuais e prévias da Biblioteca
- Reescreve a prévia de fontes sem o bloco de specimen legado; a amostra mostra Aa, Lorem Epsum e 12345 !@#$% com a família real aplicada.
- Expande a prévia de tema com navegação, painel, destaque, barras e ações; move a paleta para um dropdown.
- Consolida a grade em previews 64×64, títulos limitados a três linhas, favoritos em estrela e regras finais de estilo para neutralizar a cascata antiga.
- Coloca nome e metadados resumidos dentro da aba Padrão; mantém tags, resumo e dados complementares em Detalhes.
- CI, regressões, pacote, release v1.0.0.137, asset `nexus.zip` (494.905 bytes) e manifesto sincronizado foram confirmados. A validação visual/funcional no Foundry VTT 14 build 360 ainda é necessária.

## 1.0.0.136 — Backup da Biblioteca e API de transferência

- Expõe operações públicas de backup da Biblioteca em `game.nexus.library`: exportação, preparação de importação, confirmação e importação direta.
- Mantém o fluxo de importação separado em validação/prévia e confirmação, preservando conflitos e recusando prévias desatualizadas.
- Atualiza a versão do sistema Foundry para 1.0.0.136 e o endereço do pacote da release.
- Importação/exportação é para backups de recursos da Biblioteca NEXUS; não representa transferência direta de Actors ou inventários entre fichas.
- A validação automatizada e a publicação do ZIP serão confirmadas pelo workflow de release. A validação visual/funcional no Foundry VTT 14 build 360 permanece necessária.

## 1.0.0.135 — Prévia Padrão, Inspector refinado e controles de Lista

- Renomeia a aba principal do Inspector para **Padrão** e melhora os tab buttons em um controle segmentado acessível, com estado ativo claro.
- Move as abas para o topo do Inspector; nome, descrição e metadados resumidos permanecem na aba Padrão.
- Move resumo técnico, fatos, etiquetas (incluindo tags como `style-font-core`) e metadados para Detalhes.
- Remove o título redundante da prévia de recurso e evita que o resumo de tipo/dimensões ocupe a área visual.
- Restaura a prévia tipográfica no Inspector usando a família resolvida, com espécime Aa e amostra de texto.
- Expande a leitura de paletas de tema para aceitar tokens hex personalizados e cria uma amostra de interface com as cores reais do perfil/tema.
- Faz os cabeçalhos Nome, Categoria e Tipo ocuparem toda a célula como controles funcionais; os separadores de redimensionamento permanecem independentes.
- Remove highlights de borda/outline no modo Lista; seleção fica indicada por uma superfície discreta.
- Selecionar um recurso abre o Inspector diretamente na aba Padrão.
- Adiciona contratos para organização das abas, tags, resumo técnico, fontes, temas e cabeçalhos de Lista.
- CI, regressões, pacote, release, asset `nexus.zip` (492.313 bytes) e manifesto 1.0.0.135 foram confirmados; a validação visual/funcional no Foundry VTT 14 build 360 ainda deve ser realizada após a instalação.

## 1.0.0.134 — Biblioteca compacta, Inspector separado e correção do Estúdio

- Corrige a cascata de CSS que sobrescrevia o tamanho configurado das miniaturas e impedia o Grid de aproveitar os 64 × 64 px disponíveis.
- Reorganiza os cartões para usar miniatura de 64 × 64 px, título abaixo com até três linhas e altura determinada pelo conteúdo, sem espaço vazio artificial.
- Remove padding e contornos redundantes dos cartões; mantém realce discreto para seleção e favorito compacto.
- Mostra paletas reais nos cartões de temas, em vez de um ícone genérico quando as cores estão disponíveis.
- Separa a prévia visual da aba Detalhes no Inspector; metadados, fatos técnicos, ações e atribuição de pasta ficam fora da prévia.
- Remove espécimes tipográficos e listas de fatos do bloco principal de prévia; informações da fonte ficam na aba de detalhes.
- Pastas passam a ser selecionadas com um clique e abertas com duplo clique; Enter também abre a pasta selecionada.
- Faz o Estúdio de Aparência fornecer opções ApplicationV2 mutáveis por instância e clonar profundamente as opções recebidas do submenu.
- Adiciona regressões para opções congeladas, seleção/abertura de pastas, dimensões do Grid e separação entre prévia e detalhes.
- CI, regressões, pacote, release, asset `nexus.zip` e manifesto da 1.0.0.134 foram aprovados/publicados. A validação visual/funcional no Foundry VTT 14 build 360 continua pendente.

## 1.0.0.133 — Biblioteca: Grid adaptativo e prévias proporcionais

- Isola o Grid da Biblioteca Universal das regras legadas de `nexus-library-assets`.
- Reconstrói a grade com colunas adaptativas que ocupam a largura disponível, sem impor largura máxima fixa aos cartões.
- Faz Pequeno/Médio/Grande controlar a dimensão de exibição das prévias (32/64/128 CSS px), sem exigir que os arquivos originais tenham essas dimensões.
- Redimensiona imagens preservando proporção e sem recorte; quando a miniatura não existe ou falha, apresenta um ícone representativo do recurso.
- Separa a estrutura dos cartões Grid e das linhas Lista; o Grid mostra miniatura e nome, sem rótulos de categoria/tipo.
- Trata pastas como elementos de navegação, sem tipo/categoria e sem participação nas facetas.
- Mostra “Aa” na prévia de fontes e reduz o espécime do Inspector para “Aa” + “Lorem ipsum dolor sit amet.”.
- Reposiciona o favorito no canto superior direito dos cartões.
- Atualiza os contratos de regressão para o novo comportamento.
- CI, validação automatizada e geração do pacote aprovadas; validação visual/funcional no Foundry VTT 14 build 360 ainda pendente.

## 1.0.0.132 — Biblioteca: lista, previews e organização de mídia

- Corrige a tabela da Biblioteca para usar exatamente as colunas Nome, Categoria e Tipo; pastas mantêm o nome na primeira coluna e são identificadas como pasta na coluna Tipo.
- Nome passa a alternar a ordenação A–Z/Z–A ao clicar no cabeçalho; a ordenação de pastas acompanha a direção selecionada.
- Fontes e temas usam somente ícone e nome no grid, mantendo prévias detalhadas no Inspector.
- Descrição do recurso passa a aparecer abaixo da prévia no Inspector.
- Ícone da Biblioteca fica no cabeçalho nativo da janela; breadcrumb mantém apenas o caminho e os separadores.
- Documenta a movimentação lógica de recursos entre pastas e a limitação da API pública FilePicker V14 para movimentação física.
- Define o armazenamento canônico de configurações pequenas como registros JSON no libraryStore, evitando arquivos minúsculos separados.
- Mantém a correção de opções mutáveis da ApplicationV2 no Estúdio de Aparência; não reintroduz objetos congelados.

## 1.0.0.131 — Prévias de temas e fontes, filtros de lista

- Expande a prévia de temas em grade com título, subtítulo, texto normal, bold/italic, highlight, barras de progresso, botões primário/secundário, campo e paleta de cores derivada do próprio tema.
- Na lista, temas usam um marcador compacto com fundo, cor de destaque e borda correspondentes ao tema.
- Fontes passam a mostrar Aa em destaque e Lorem ipsum com amostras bold/italic; o Inspector mostra espécime completo com a família tipográfica resolvida.
- Amplia o catálogo de fontes de sistema com pilhas distintas para Roboto, Impact/display, Segoe Script/cursiva, Georgia/serifada e Monospace, sempre com fallback local.
- Lista simplificada para Nome, Categoria e Tipo; remove Tamanho, Modificado e Etiquetas das colunas.
- Categoria e Tipo abrem filtros pesquisáveis diretamente nos cabeçalhos da lista; as opções disponíveis são sugeridas pelo catálogo. Etiquetas permanecem nos detalhes e podem ser encontradas pela busca global.
- Mantém pastas primeiro em ordem alfabética e recursos depois em ordem alfabética; remove qualquer seletor redundante de ordenação de pastas.
- Breadcrumb passa a usar separadores /, mantendo a navegação de caminho.
- Atualiza contratos de regressão para fontes, miniaturas de tema, filtros, cabeçalhos e colunas redimensionáveis.
- A validação automatizada e a publicação do pacote serão confirmadas pelo workflow. A validação visual/funcional manual permanece necessária no Foundry VTT 14 build 360.
## 1.0.0.130 — Navegação real de pastas e prévias visuais ampliadas

- A Biblioteca agora mostra as pastas filhas diretamente no conteúdo, como o Explorador de Arquivos; abrir uma pasta altera o caminho e permite navegar de volta/subir.
- Corrige Assets globais para atuar como pasta-pai e exibir Fontes, Imagens, Ícones, Texturas e Outros arquivos, em vez de filtrar apenas recursos do tipo asset.
- Mantém a estrutura de pastas ao navegar e mostra itens correspondentes às pastas de categoria; as fontes nativas continuam classificadas em Assets globais → Fontes.
- Amostras de fonte aplicam explicitamente a família CSS resolvida em cada elemento; a pilha Monospace usa uma fonte monoespaçada tanto no Aa quanto na amostra maior.
- Prévia de tema em grade agora ocupa aproximadamente 84% da área útil do cartão e mostra painel, hierarquia de texto, botão e campo em tamanho legível.
- Prévia de fontes em grade ampliada e com família tipográfica real; a lista permanece compacta.
- A janela padrão da ficha de personagem foi ampliada para 1100 × 920 e agora pode ser redimensionada, permitindo que o Canvas padrão de 800 × 800 apareça mais próximo do tamanho configurado.
- Adiciona contratos de regressão para navegação de pastas, classificação de fontes, amostras tipográficas, mockup de temas e tamanho inicial da ficha.

## 1.0.0.129 — Biblioteca: pesquisa única, lista alinhada e prévias reais

- Corrige a barra de pesquisa para ter uma única borda externa; input, ícone e botão de limpar permanecem sem molduras internas ou focus ring duplicado.
- Reposiciona o breadcrumb com alinhamento vertical, ícones de contexto (Biblioteca, Favoritos, Recentes, Coleção, Atalho e Pasta) e rótulo truncado corretamente.
- Reconstrói as linhas de lista com uma célula Nome composta por miniatura + texto, alinhada com os cabeçalhos; ícones não invadem nem deslocam o nome.
- Mostra categoria, tamanho, modificação e etiquetas nas colunas correspondentes; metadados ausentes permanecem como —.
- Implementa redimensionamento individual das colunas Nome, Categoria, Tamanho e Modificado por arraste e teclado, com largura mínima e persistência durante re-renderização da janela.
- Corrige o contrato de classificação da barra: A–Z/Z–A, categoria, origem, tamanho, modificação e etiqueta agora aceitam todos os modos ascendentes e descendentes, sem voltar silenciosamente para Nome A–Z.
- Categoria e etiqueta têm listas de sugestões pesquisáveis por datalist, usando categorias e etiquetas existentes no catálogo.
- Fontes nativas exibem uma amostra tipográfica (Aa, Lorem ipsum e caracteres acentuados) com a família resolvida.
- Temas/perfis visuais exibem miniatura de painel, botão e campo; o Inspector mostra a prévia do perfil com sua tipografia, paleta e geometria.
- Categoriza os temas como **Coleções visuais** na Biblioteca e migra apenas o nome da pasta padrão “Temas” para “Coleções visuais”, sem alterar pastas personalizadas nem os dados dos perfis.
- Mantém as fontes em Assets globais → Fontes e os temas em NEXUS → Coleções visuais, preservando referências e ações de aplicação.
- Adiciona contratos de regressão para pesquisa, breadcrumb, lista, colunas redimensionáveis, opções de ordenação e prévias de fonte/tema.

## 1.0.0.128 — Biblioteca: Explorer limpo, pastas reais e lista compacta

- Remove o item pseudo-pasta "Todas as pastas"; o texto passa a ser o cabeçalho da árvore e a Biblioteca abre os recursos no painel principal.
- Mantém a árvore hierárquica e faz pastas pai incluir recursos atribuídos às subpastas.
- Mapeia pastas padrão para o conteúdo correspondente do catálogo: documentos Foundry, assets, fontes, temas, componentes, layouts, templates e lógica.
- Adiciona ao catálogo as pilhas de fontes nativas usadas pelo NEXUS (Inter, System UI, Arial e Monospace), com metadados e resolução para prévia/inspeção.
- Esconde a seção Coleções quando não há coleções; criação de coleção passa a ser uma ação contextual após seleção múltipla e clique direito.
- Adiciona seleção múltipla com Ctrl/Cmd e Shift; o menu contextual cria uma coleção com as referências selecionadas sem duplicar documentos.
- Reconstrói a visualização em lista como linhas compactas com ícone adaptativo e colunas Nome, Categoria, Tamanho, Modificado e Etiquetas.
- Adiciona classificação por tamanho, data de modificação e etiqueta, além de nome, categoria e origem; sugere etiquetas disponíveis no filtro.
- Preserva o tamanho e a data de modificação quando o provedor os fornece; documentos do mundo Foundry expõem o timestamp real de modificação. Valores ausentes são exibidos como —, sem inventar metadados.
- Implementa redimensionamento funcional da navegação e do Inspector por alças de 6 px sem moldura permanente, com mouse/touch e teclado; largura limitada para manter o conteúdo utilizável.
- Remove bordas duplicadas de botões de expandir pasta, breadcrumbs, navegação, pesquisa e comandos; bordas de highlight aparecem apenas em hover, foco ou seleção.
- Atualiza contratos de regressão para árvore, lista, fontes, seleção múltipla, coleções contextuais e redimensionamento.
- CI e pacote de validação aprovados; teste visual/funcional no Foundry VTT 14 build 360 ainda depende do usuário.

## 1.0.0.127 — Biblioteca: janela nativa e interface compacta

- Move as abas para o cabeçalho nativo da janela ApplicationV2, removendo o título duplicado e a sensação de uma janela interna.
- Remove a moldura externa de painel da Biblioteca e elimina os divisores/botões aparentes de redimensionamento; mantém a organização em navegação, conteúdo e Inspector sem caixas redundantes.
- Reorganiza a navegação em uma única barra plana com voltar, avançar, subir nível, breadcrumb e um único campo de pesquisa.
- Consolida Novo, Recortar, Copiar, Colar, Renomear, Excluir, Atualizar, Classificar, Visualizar, Filtros e opções adicionais em uma única barra de comandos.
- Converte os comandos principais em ícones com rótulos acessíveis e tooltips, sem texto repetido nos botões.
- Move o menu Novo para junto do botão na barra de comandos, abrindo o menu ancorado ao botão em vez de exibi-lo no rodapé da árvore.
- Reduz densidade visual e dimensões da navegação, das visões inteligentes, pastas e cartões; remove bordas, fundos e superfícies internas redundantes.
- Adiciona classificação por nome crescente/decrescente, tipo e origem, preservando o estado independente por aba.
- Preserva catálogo universal, preferências, IDs, referências e operações de recursos já existentes.
- Testes automatizados e pacote Foundry aprovados; validação visual/funcional no Foundry VTT 14 build 360 ainda necessária.

## 1.0.0.126 — Biblioteca em janela com abas e comandos

- Converte a experiência da Biblioteca em uma janela de navegação com abas independentes e estado próprio por aba.
- Adiciona histórico Voltar/Avançar, navegação por breadcrumb, retorno ao nível superior e pesquisa posicionada junto ao caminho.
- Adiciona barra de comandos para Novo, Atualizar, Recortar, Copiar, Colar, Renomear e Excluir, conectada às operações existentes.
- Permite redimensionar a árvore de navegação e o Inspector, com persistência das dimensões e controles acessíveis.
- Compacta os controles e recuos da árvore hierárquica e elimina indicadores de expansão duplicados.
- Reconcilia o estado e o histórico das abas quando pastas são excluídas.
- Reutiliza o catálogo, as preferências e os serviços existentes da Biblioteca; não cria um armazenamento paralelo.
- Inclui contratos automatizados para abas, histórico, comandos, separadores e hierarquia.
- Validação visual e funcional no Foundry VTT 14 build 360 necessária após instalação; CI e empacotamento não substituem o teste no cliente real.

## 1.0.0.125 — bootstrap orientado a dependências

- Adiciona `resolveSync` e `initializeSync` ao registro de serviços para construção síncrona e ordenada durante o hook `init` do Foundry.
- Migra Design System, biblioteca de perfis, Estúdio, recursos, bridge de documentos, Registry/Transfer/Backup/Aplicação da Biblioteca, serviços de Mídia e Registry/Runtime/integração da Lógica para factories com dependências explícitas.
- Mantém as fachadas públicas `game.nexus.*` e a ordem de inicialização compatível com o Foundry.
- Adiciona testes de resolução síncrona, dependências, lazy creation e rejeição explícita de factories assíncronas no caminho síncrono.
- CI: sintaxe, grafo de módulos e regressões passaram; validação do pacote aprovada.
- A extração da ficha, listeners, CSS, templates e validador segue planejada por domínio; teste visual/funcional no Foundry VTT 14 continua pendente.

## 1.0.0.124 — revisão arquitetural e contratos de serviço

- Adiciona registro de serviços NEXUS com factories, dependências explícitas, resolução sob demanda, compartilhamento de instâncias, detecção de dependências circulares, diagnóstico e encerramento reverso.
- Publica os serviços centrais existentes em `game.nexus.services`, mantendo as APIs `game.nexus.*` para compatibilidade.
- Extrai os contratos de eventos de interação e Foundry para `scripts/core/logic-events.js`; schemas deixam de depender dos módulos de engine/integração.
- Adiciona testes do registro de serviços e do grafo de imports para caminhos locais quebrados e ciclos estáticos.
- Adiciona revisão arquitetural de ponta a ponta e plano incremental, com hotspots, ownership, riscos e etapas de modernização.
- Corrige o estado e a formatação do README.
- CI validou 70/70 scripts/assets por sintaxe e 50/50 arquivos de teste; validação do pacote aprovada.
- A migração completa do bootstrap para DI, extração da ficha/CSS/templates e teste visual no Foundry VTT 14 permanecem etapas futuras.

## 1.0.0.123 — Biblioteca: taxonomia, hierarquia e criação universal

- Inicializa uma estrutura de pastas por domínio (Atores, Itens, Cenas, Documentos, Baralhos, Tabelas de rolagem, Áudio, Compêndios, Macros, Assets globais e NEXUS) apenas uma vez, preservando pastas existentes.
- A estrutura de Atores usa tags para classificar Player/NPC/criatura; não cria subpastas rígidas por tipo de ator.
- Organiza Itens em Classes, Origens, Legados, Ações e Itens, com subpastas de equipamentos, armas, armaduras, consumíveis e contêineres; não adiciona categoria de itens mágicos.
- Localiza os tipos de elementos de cena e mantém a taxonomia livre e reorganizável.
- Adiciona árvore hierárquica com expandir/recolher, recorte, cópia organizacional, colagem, movimentação, renomeação e exclusão segura por menu contextual.
- Adiciona ação universal Novo: pasta, importação de asset por FilePicker do Foundry, atalho por UUID/referência, layout e componente.
- Importação de mídia cria metadados na Biblioteca pessoal; os arquivos são enviados para a pasta de dados NEXUS pelo serviço nativo do Foundry.
- Padroniza previews quadrados e sem moldura interna; seleção de recurso destaca apenas a borda, sem painel preenchido.
- Adiciona testes de migração, taxonomia, atalhos, duplicação de árvore e contratos visuais/contextuais.
- A validação visual/funcional no Foundry VTT 14 build 360 permanece necessária.

## 1.0.0.122 — Biblioteca: pesquisa estruturada e transferência nativa

- Adiciona consulta avançada com termos combinados, frases entre aspas, qualificadores type:, source:, folder:, tag:, name: e exclusão por -termo.
- Amplia o índice de compêndios com campos de metadados e descrição, usando CompendiumCollection.getIndex({ fields }) sem carregar documentos completos em massa.
- A pesquisa considera nome, subtipo, pasta, descrição, identificador e metadados indexados; mantém carregamento paginado e verificação de permissões.
- Cards de documentos Foundry emitem o formato nativo de arraste por UUID, permitindo que diretórios, Canvas e fichas compatíveis executem seus próprios fluxos de drop.
- Componentes pessoais salvos podem ser arrastados diretamente para o Canvas da ficha; a posição respeita escala, limites e snap da grade ativa.
- A janela da ficha passa a permanecer fixa em 800 × 836 px; as dimensões internas do Canvas continuam independentes.
- Adiciona testes de consulta, metadados indexados, contratos de arraste, inserção no Canvas e geometria fixa.
- A validação visual e funcional no Foundry VTT 14 build 360 permanece pendente.
## 1.0.0.121 — Biblioteca NEXUS e refinamento da ficha

- Corrige a chamada dos métodos estáticos de DialogV2 na Biblioteca e no adaptador de temas, preservando o contexto da classe; isso corrige o caminho que podia causar o erro de leitura de `prompt` ao gerenciar pastas e coleções.
- Reorganiza os filtros como popover compacto sobre a área de trabalho, sem reservar uma linha alta no layout.
- Corrige a pesquisa para ter uma única superfície visual: o contêiner mantém borda/fundo e o input interno fica transparente e sem borda própria.
- Padroniza a área de miniatura dos cards e apresenta paletas de temas em prévias compactas.
- Permite definir/remover miniaturas personalizadas por URL HTTP(S) ou caminho relativo seguro, com validação no Core.
- Aumenta a altura inicial da ficha de 800 para 836 px, mantendo largura 800 px e redimensionamento.
- Amplia contratos automatizados para os fluxos alterados. Validação visual e funcional no Foundry VTT 14 build 360 permanece pendente.

## 1.0.0.119 — sidebar nativa e workspace sem colunas fantasmas

- Remove o override que reconstruía a geometria da sidebar do Foundry e aplicava dimensões aos painéis em vez dos controles de navegação.
- Estiliza os botões V14 pela estrutura real documentada no projeto: #sidebar-tabs > menu > li > button[role=tab], preservando a geometria e o controlador nativos.
- Corrige o workspace para ocupar uma única coluna útil; os rails flutuantes não deixam 72 px reservados no Canvas.
- Ao limpar a seleção, invalida o alvo retido do Inspector; seleção singular continua sendo autoritativa e a seleção múltipla não aponta para um componente arbitrário.
- Adiciona contratos de regressão para a estrutura de sidebar, geometria do workspace e limpeza de foco.
- CI, pacote e release devem ser confirmados pelo workflow; teste visual/funcional no Foundry VTT 14 build 360 permanece necessário.

## 1.0.0.118 — sidebar nativa, foco inteligente e Canvas

- Preserva a estrutura e a geometria nativas da sidebar do Foundry, apresentando os tab buttons como controles individuais no rail, sem convertê-los em conteúdo do painel.
- Centraliza normalização da seleção e resolução do alvo do Inspector; IDs inválidos e referências obsoletas não alimentam mais os editores.
- Faz o Estúdio de Aparência usar a mesma classe ApplicationV2 no menu de Configurações e na abertura direta, com referência singleton limpa no fechamento.
- Corrige a composição de colunas do modo padrão/play para que o Canvas ocupe o workspace, sem colunas editoriais ocultas.
- Aumenta a altura inicial da ficha de 850 para 900 px e normaliza o dimensionamento interno para reduzir cortes.
- Adiciona contratos de regressão para foco, sidebar, modo play e abertura do Estúdio.

## 1.0.0.117 — rails independentes e seleção contextual do inspetor

- Corrige a especificidade do CSS legado que reaplicava superfície de painel ao rail direito; o contêiner agora é explicitamente transparente e somente os botões individuais recebem fundo, borda e sombra.
- Unifica a apresentação de Biblioteca, layouts e adicionar página no mesmo padrão de botões independentes do rail esquerdo.
- Invalida o alvo do inspetor ao mudar para seleção múltipla e sincroniza/limpa os atributos de destino dos campos, impedindo que propriedades antigas continuem apontando para outro componente.
- Faz o duplo clique no Canvas abrir a janela flutuante ApplicationV2 de Propriedades, eliminando o caminho legado de edição inline.
- Testes de contrato adicionados para portal flutuante, estilos independentes, seleção e abertura do inspetor.
- **Validação no Foundry VTT 14 build 360 pendente:** testar visualmente o rail direito e o fluxo completo de seleção/edição após instalar o pacote.

## 1.0.0.116 — navegação flutuante, chrome limpo e compatibilidade de ícones

- Remove o contêiner de sidebar direita da ficha; os botões de layout e o acesso à Biblioteca são portados para controles flutuantes independentes.
- Mantém os botões de layout com superfícies individuais, sem painel compartilhado atrás deles.
- Remove o fundo/borda/sombra externos da action bar atrás dos 10 slots da Hotbar e da moldura da lista de jogadores, preservando slots, macros, controles e entradas de jogadores.
- Corrige o seletor global de tipografia: as exclusões de ícones passam a ser condições compostas do mesmo elemento, evitando que fontes de perfil substituam a família nativa do Foundry/Font Awesome.
- Atualiza contratos de regressão para a nova navegação e para as superfícies nativas.
- CI: 64/64 scripts e 43/43 arquivos de teste; pacote ZIP validado.
- **Validação manual pendente:** conferir visualmente botões flutuantes, ícones, fontes, Hotbar e lista de jogadores no Foundry VTT 14 build 360.

## 1.0.0.115 — preservação ampliada de ícones

- Amplia a auditoria de Font Awesome para regras legadas de controles de ApplicationV2, conteúdo de componentes, trilhos flutuantes, Hotbar e navegação.
- Corrige seletores genéricos de `font-family: inherit` que podiam sobrescrever a família de fonte de botões ou spans com classes Font Awesome.
- Corrige o seletor global de tipografia: as exclusões de classes de ícone passam a ser aplicadas ao próprio controle, não a seus descendentes.
- Adiciona teste automatizado dedicado à preservação das fontes de ícones em controles nativos e superfícies NEXUS.
- Mantém a sidebar vertical nativa, o Estúdio responsivo e o restante das correções da 1.0.0.114.
- **Teste manual pendente:** conferir glifos na sidebar, Canvas, Hotbar, ficha, Biblioteca, Estúdio, controles de janela e painéis no Foundry VTT 14 build 360.

## 1.0.0.114 — Sidebar nativa, Estúdio responsivo e correção de ícones

- Restaura a navegação vertical original do Foundry VTT, removendo o bloco de CSS que convertia a navegação e os painéis da sidebar para uma faixa horizontal.
- Mantém a largura padrão do Foundry e preserva todas as abas nativas e adicionadas por módulos; o NEXUS continua aplicando apenas o tema das superfícies e diretórios.
- Preserva os ajustes independentes de largura e espaçamento do Chat, sem interferir na orientação da navegação.
- Corrige a tipografia compartilhada dos botões para que controles com classes Font Awesome próprias não recebam um reset de fonte/peso que possa quebrar seus glifos.
- Torna o Estúdio de Aparência mais responsivo, reduzindo os limites mínimos da janela e permitindo reutilizar a mesma instância pelo menu de Configurações e pela abertura direta.
- Acrescenta contratos de regressão para a sidebar vertical, o dimensionamento responsivo do Estúdio e a preservação das fontes de ícones.
- **Teste manual pendente:** abrir o Estúdio no Foundry VTT 14 build 360; conferir os ícones gerais, controles de janela, barra de ferramentas, painéis, sidebar vertical e compatibilidade com módulos.
- Sem alterações em regras mecânicas, schemas de Actors/Items ou dados persistidos.

## 1.0.0.113 — Dock compacto de navegação do sidebar

- Reorganiza as abas nativas do Foundry VTT 14 em uma única faixa horizontal contínua.
- Substitui os slots fixos de 34 px por espaços flexíveis, distribuídos igualmente na largura já disponível da sidebar.
- Remove a quebra em múltiplas linhas e evita rolagem horizontal na navegação.
- Usa estados de hover discretos e indicador inferior para a aba ativa, preservando foco visível por teclado.
- Mantém todos os elementos, a ordem DOM, os ícones Font Awesome/SVG, os handlers e o controlador nativo de abas; nenhuma aba de recurso é ocultada.
- Não altera a largura padrão da sidebar nem a estrutura dos painéis.
- Atualiza o contrato automatizado para exigir navegação em linha única e slots flexíveis.
- **Teste manual pendente:** verificar a quantidade real de abas, legibilidade e precisão dos alvos de clique, módulos que acrescentam abas, recolhimento da sidebar e troca entre todas as abas no Foundry VTT 14 build 360.
- Sem alterações em regras de RPG, schemas ou dados persistidos.

## 1.0.0.112 — Chat lateral com densidade adaptativa

- Adapta o espaçamento interno do chat à largura real disponível, por meio de CSS Container Queries, sem modificar a largura padrão da sidebar.
- Em áreas estreitas, reduz margens e padding dos cartões sem diminuir o tamanho da fonte.
- Em áreas mais largas, aplica espaçamento moderadamente mais confortável.
- Mantém imagens, vídeos e iframes dentro da largura da mensagem; tabelas extensas podem rolar dentro do próprio conteúdo.
- Preserva a estrutura DOM, os handlers, o controlador de abas e os dados de mensagens nativos do Foundry.
- Inclui contratos de regressão para os breakpoints do contêiner e para o comportamento de mídia/tabelas.
- **Teste manual pendente:** conferir no Foundry VTT 14 build 360 o chat em larguras diferentes, mensagens com mídia/tabelas, compositor e rolagem.
- Sem alterações em regras de RPG, schemas ou dados persistidos.

## 1.0.0.111 — Chat lateral de largura completa e visual compacto

- Corrige os seletores para o DOM real do Foundry VTT 14: o histórico é OL.chat-log, sem o ID #chat-log usado por regras antigas.
- Faz histórico, controles e formulário de mensagem ocuparem a largura disponível da sidebar, removendo a restrição estreita de 300 px.
- Compacta espaçamentos, cabeçalhos e conteúdo dos cartões para uma apresentação mais densa e integrada, inspirada na ergonomia de temas compactos.
- Mantém o controlador nativo de abas, os handlers, a estrutura de mensagens e os dados persistidos.
- Adiciona testes de contrato para os seletores e dimensões do DOM real.
- **Teste manual pendente:** conferir largura, quebra de conteúdo, rolagem, controles e composição de mensagem no Foundry VTT 14 build 360.
- Sem alterações em regras de RPG, schemas ou dados persistidos.

## 1.0.0.110 — Correção da estrutura real da navegação lateral

- Corrige a navegação da sidebar no DOM real do Foundry VTT 14: transforma `#sidebar-tabs > menu.flexcol` em faixa horizontal com quebra de linha.
- Dimensiona os controles na hierarquia observada `NAV > MENU > LI > BUTTON`, sem substituir elementos, handlers, ordem ou controlador nativo de abas.
- Mantém a correção tipográfica Font Awesome da 1.0.0.109 e acrescenta testes de regressão para o DOM real.
- **Teste manual pendente:** confirmar no Foundry VTT 14 a disposição horizontal, os ícones, o recolhimento e a troca de abas.
- Sem alterações em regras, dados persistidos ou schemas.

## 1.0.0.109 — Correção da fonte dos ícones nativos da sidebar

- Pacote preparado e validado automaticamente no GitHub Actions; disponibilizado para teste no Foundry VTT 14.

- Corrige a herança tipográfica global que substituía a fonte Font Awesome em botões nativos do Foundry VTT 14, fazendo os glifos aparecerem como quadrados.
- Mantém a fonte de perfil nos controles comuns e preserva as classes/fonte nativas dos controles Font Awesome.
- Adiciona teste de contrato para impedir regressão dessa regra.
- **Limitação conhecida:** a navegação ainda aparece vertical na captura enviada. Esta versão corrige a causa confirmada dos ícones; o layout horizontal continua sob investigação e não é declarado concluído.
- Sem alterações nas regras, dados persistidos ou schemas do sistema.

## 1.0.0.108 — Consolidação do sidebar Foundry V14 e pacote para teste

- Publicação estável autorizada pelo mantenedor antes da validação manual; o pacote será disponibilizado para teste e poderá ser substituído se necessário.

- A publicação estável foi autorizada pelo mantenedor antes da validação manual; a confirmação visual/funcional no Foundry permanece pendente.

- Inclui a reconstrução completa do layout da sidebar integrada na PR #95, com navegação horizontal, painéis dimensionados de forma isolada e preservação do controlador nativo do Foundry.
- Atualiza os contratos de regressão do layout e mantém a cobertura automatizada da estrutura CSS.
- Não altera regras mecânicas, dados persistidos de Actors/Items ou schemas de campanha.
- Pacote disponibilizado para teste do mantenedor no Foundry VTT 14 build 360.
- **Validação manual pendente:** posição da navegação, ícones, troca de abas, rolagem/altura dos painéis e compatibilidade com abas de módulos. CI e empacotamento não substituem esse teste no cliente real.

## 1.0.0.107 — Pacote de teste do sidebar Foundry V14

- Publica na branch `main` a revisão consolidada do CSS do sidebar, com navegação horizontal e separação entre controles de abas e painéis de conteúdo.
- CI, validação de regressões, empacotamento, publicação do GitHub Release `v1.0.0.107`, confirmação do asset `nexus.zip` e sincronização do manifesto foram concluídos.
- Mantém os elementos, a ordem DOM, os handlers de navegação e os glifos nativos do Foundry.
- Destina-se à validação manual no Foundry VTT 14 build 360: orientação das abas, ícones, troca de abas e apresentação dos painéis.
- Não altera regras de mesa, dados de Actors/Items ou schemas persistidos.
- A validação funcional no cliente real permanece pendente até o teste do mantenedor. A publicação e o empacotamento automatizados não equivalem à confirmação visual/funcional.

## 1.0.0.106 — Correção dos seletores nativos do sidebar V14

- Revisa o CSS da navegação lateral após a correção anterior não produzir alteração visual no cliente.
- Passa a dimensionar explicitamente os controles nativos `.tab.sidebar-tab` dentro de `.sidebar-tabs`, além dos seletores de compatibilidade.
- Mantém a faixa de navegação horizontal com quebra de linha para abas adicionais, sem reordenar elementos nem substituir handlers.
- Preserva a fonte, o peso e os glifos Font Awesome fornecidos pelo Foundry.
- Atualiza os testes de contrato para exigir os seletores específicos dos controles V14.
- A validação automatizada e o empacotamento são executados pelo workflow. A confirmação visual/funcional no Foundry VTT 14 build 360 permanece pendente; esta publicação não altera o último checkpoint funcional.

## 1.0.0.105 — Correção estrutural do sidebar Minimal UI

- Corrige os seletores do sidebar para alcançar a navegação e o painel de conteúdo dentro da estrutura ApplicationV2 do Foundry VTT 14.
- Reorganiza a faixa de abas horizontalmente, com rolagem horizontal para conjuntos de abas extensos.
- Ajusta dimensões, alinhamento, espaçamento e estados visuais dos botões de navegação.
- Preserva a ordem DOM, os elementos, os handlers e a seleção nativos do Foundry; não recria nem reordena abas.
- Mantém a família e o mapeamento dos ícones sob responsabilidade do Foundry/Font Awesome, sem impor uma fonte substituta pelo NEXUS.
- Atualiza testes de contrato para a estrutura ApplicationV2, orientação horizontal, rolagem e preservação da fonte dos ícones.
- CI e empacotamento automatizados serão confirmados pelo workflow desta publicação. A validação visual/funcional no Foundry VTT 14 build 360 permanece pendente; esta versão é destinada à rodada de testes do mantenedor.

## 1.0.0.104 — CSS avançado no Estúdio de Aparência

- Adiciona modo CSS avançado com edição independente por categoria visual.
- Permite personalizar estados base, hover, foco e ativo, incluindo sombras, transformações, transições e animações predefinidas.
- Aplica o CSS em tempo real na prévia e salva no perfil NEXUS-DESIGN/3.
- Mantém importação compatível com perfis NEXUS-DESIGN/1 e /2.
- Valida propriedades e seletores permitidos; bloqueia URLs, imports, código executável e seletores globais.
- A versão 1.0.0.104 foi publicada após aprovação do CI, empacotamento e confirmação do asset.

## 1.0.0.103 — Estúdio, navegação Minimal UI e ícones

- Corrige a construção do Estúdio de Aparência: opções herdadas e opções recebidas pelo menu do Foundry são copiadas para estruturas mutáveis antes de chegar ao ApplicationV2.
- Adiciona regressão para opções de janela congeladas e para o contrato de construção do Estúdio.
- Reorganiza a navegação nativa do sidebar em uma faixa horizontal superior, preservando a ordem DOM original: a sequência vertical passa a ser lida da esquerda para a direita.
- Mantém os handlers e a seleção de abas do Foundry; nenhuma aba é recriada ou reordenada pelo NEXUS.
- Amplia as exclusões de tipografia global para aliases Font Awesome legados.
- A validação visual final depende de execução no Foundry VTT 14 build 360.

## 1.0.0.102 — Restauração dos ícones nativos do Foundry

- Remove a regra global que forçava todos os ícones Font Awesome para a mesma família e peso, causando glifos ausentes em controles nativos do Foundry VTT 14.
- Devolve ao Foundry o controle da família, peso e mapeamento dos ícones solid, regular, light e demais estilos.
- Mantém a tipografia personalizada do NEXUS isolada dos elementos de ícone.
- Preserva as correções de layout dos diretórios e do Estúdio de Aparência integradas na versão anterior.
- Adiciona teste de regressão para impedir que uma regra global volte a sobrescrever a fonte dos ícones.
- Publicação autorizada pelo mantenedor após CI e empacotamento; a validação visual no cliente Foundry VTT 14 build 360 continua necessária. A publicação não promove o checkpoint funcional.

## 1.0.0.101 — Refinamento do Estúdio e correções da interface Foundry

- Reorganiza o Estúdio de Aparência com melhor distribuição de espaço: navegação compacta, filtro de categoria no editor central e catálogo de elementos com prévias individuais à direita.
- Aumenta a largura inicial da janela e melhora o comportamento responsivo para reduzir cortes e compressão dos controles.
- Reforça a preservação da fonte dos ícones Font Awesome do Foundry ao aplicar tipografia de tema.
- Corrige molduras e bordas redundantes nos wrappers de diretórios nativos (Actors, Items, Scenes e demais abas), mantendo separadores discretos nos itens e estados de hover/foco.
- Adiciona contratos automatizados para a estrutura do Estúdio e o escopo das correções do chrome.
- CI e empacotamento automatizados aprovados. O workflow publicou o GitHub Release v1.0.0.101 como release padrão; como a validação visual no Foundry VTT 14 build 360 permanece pendente, o manifesto estável foi restaurado para 1.0.0.100. A release .101 está disponível no GitHub, mas não foi validada manualmente no cliente.

## 1.0.0.100 — Estabilização da interface e estilos por categoria

- Adiciona o preset **Foundry VTT**, preservando a aparência nativa das janelas, diretórios, navegação e superfícies do Foundry; aplicações próprias do NEXUS continuam usando os tokens do sistema.
- Restringe a tipografia global às superfícies temáticas do NEXUS e preserva a renderização nativa dos ícones; valores numéricos usam tipografia monoespaçada com algarismos tabulares para manter alinhamento.
- Expande o Estúdio de Aparência com categorias recolhíveis para botões, painéis, containers, destaques e campos, incluindo cores, bordas, espessura e arredondamento.
- Evolui os perfis para NEXUS-DESIGN/2, mantendo a importação de perfis NEXUS-DESIGN/1 e a normalização segura dos novos estilos.
- Adiciona acesso à Biblioteca Universal pelo menu de configurações do sistema, reutilizando a mesma instância e o mesmo contexto já usados pela ficha.
- Inclui contratos de regressão para estilos por categoria, tema nativo do Foundry, tipografia de dados e abertura da Biblioteca.
- Mantém a compatibilidade declarada com Foundry VTT 14 build 360. A publicação de distribuição 1.0.0.100 foi autorizada pelo mantenedor após CI e empacotamento aprovados; a validação visual e funcional no cliente real permanece pendente, e o checkpoint funcional confirmado continua sendo 1.0.0.70. A validação visual e funcional no cliente real continua necessária antes de considerar a interface confirmada.

## 1.0.0.99 — Editor flutuante, tipografia nativa e refinamento visual

- Restaura os trilhos flutuantes do editor da ficha e a abertura das ferramentas em janelas ApplicationV2 independentes, removendo o menu lateral permanente da área útil da ficha.
- Reassocia o ciclo de vida das janelas à renderização e ao fechamento da ficha, preservando painéis abertos durante atualizações e limpando recursos ao fechar.
- Ajusta o Design System para não reconstruir a antiga barra lateral interna da ficha.
- Preserva a família tipográfica nativa dos ícones Font Awesome do Foundry; a tipografia configurada no perfil continua aplicada às superfícies de texto sem substituir fontes de ícones.
- Refina o Estúdio de Aparência: compacta a toolbar, equilibra a coluna de pré-visualização e melhora as amostras de botões, painéis, campos e barras de rolagem.
- Adiciona contratos de regressão para a arquitetura flutuante, o ciclo de vida das janelas, a preservação dos ícones nativos e a densidade visual do Estúdio.
- Mantém a compatibilidade declarada com Foundry VTT 14 build 360; a validação visual e funcional no cliente real continua pendente.
- O manifesto original só é sincronizado com a versão 1.0.0.99 depois que o workflow aprova os testes, gera o pacote e confirma o asset `nexus.zip`.

## 1.0.0.98 — Consistência de seleção e temas

- Unifica a cor de destaque dos grupos selecionados e em inspeção com o token semântico `--nexus-highlight-color`, evitando que regras legadas substituam a paleta ativa.
- Alinha os contornos de seleção compartilhados entre componentes e grupos ao mesmo token de destaque.
- Adiciona contratos de regressão para impedir o retorno de cores fixas ou divergentes nos estados de seleção e inspeção de grupos.
- Publicada como release estável 1.0.0.98 após aprovação da validação automatizada e confirmação do asset `nexus.zip`; a validação visual e funcional dentro do Foundry VTT 14 build 360 continua pendente.

## 1.0.0.97 — Em desenvolvimento

- Reorganiza o Estúdio de Aparência com navegação interna por seções e prévia conjunta de painéis, containers, botões, tipografia, campos de texto, seletores, áreas de texto e rolagem.
- Aplica a tipografia do perfil globalmente às superfícies do Foundry, preservando fontes de ícones e código; unifica as superfícies do Chat e arredonda os controles de janela.
- Remove os trilhos flutuantes externos da ficha e restaura a navegação minimalista pelos painéis internos, sem alterar os controles nativos de navegação do Foundry.
- Conecta a ficha à Biblioteca Universal e remove a antiga visualização embutida da Biblioteca.
- Mantém estados acessíveis nas abas do Estúdio e limpa a seleção do Canvas ao fechar os painéis Propriedades/Comportamento.
- A validação visual e funcional no Foundry VTT 14 build 360 continua pendente.
- Recupera a inserção segura de imagens da coleção de mídia na Biblioteca da ficha.
- Protege a atualização de definições reutilizáveis contra versões desatualizadas e alterações concorrentes da instância.
- Consolida o histórico do changelog e alinha os metadados da release estável.
- Adiciona contratos de regressão para a integração da Biblioteca e para a consistência documental.
- Esta versão é uma base de desenvolvimento, ainda não publicada; a última release estável é a 1.0.0.96.

## 1.0.0.96 — Integração nativa e geometria responsiva do Foundry

- Consolida a integração do Design System com as superfícies nativas de configuração do Foundry, sem substituir nem reimplementar `UIConfig` ou `SettingsConfig`.
- Padroniza a geometria dos controles nativos a partir da altura configurada no perfil visual, com limites responsivos e dimensionamento coerente dos ícones.
- Evita cortes nos controles laterais, permite navegação horizontal em listas longas de cenas e diferencia estados de cena visualizada e ativa.
- Mantém trilhos flutuantes da ficha com rolagem vertical independente e dimensões alinhadas aos controles nativos.
- Preserva foco visível por teclado e respeita `prefers-reduced-motion`.
- Adiciona contratos automatizados e roteiro de validação manual para telas estreitas, cenas numerosas, temas, acessibilidade e clientes GM/jogador.
- Publicada como release estável 1.0.0.96 após validação automatizada do pacote e confirmação do asset `nexus.zip`.
- A validação funcional e visual no Foundry VTT 14 build 360 continua pendente; a publicação não representa aprovação desses testes manuais.

## 1.0.0.95 — Design System global e Biblioteca Explorer

- Consolida o Design System estrutural para fichas, aplicações NEXUS e superfícies nativas selecionadas do Foundry, preservando handlers e janelas de módulos de terceiros.
- Vincula os trilhos flutuantes à janela ApplicationV2 da ficha para acompanhar o empilhamento nativo do Foundry, sem camada global independente.
- Remove o efeito de vidro dos controles flutuantes, unifica botões/ícones e remove sombras de texto do padrão visual.
- Simplifica a barra da Biblioteca com pesquisa unificada, filtros recolhíveis e controles compactos.
- Reorganiza favoritos e pastas, adicionando hierarquia, subpastas, movimentação por arrastar/soltar e exclusão recursiva sem apagar recursos.
- Corrige a prévia de paletas no Inspector e adiciona prévias visuais tipadas e seguras para componentes e assets.
- Normaliza dimensões do Canvas e dos componentes em múltiplos de 10 px; ajusta a barra de recurso para 220×60.
- Adiciona testes automatizados de regressão, contratos do Design System, migração/hierarquia de pastas e grade de dimensões.
- Não altera regras mecânicas do RPG nem schemas mecânicos de Actors/Items. Validação visual e funcional no Foundry VTT 14 build 360 continua necessária após a instalação.

## 1.0.0.94 — Biblioteca Universal e shell visual estabilizados

- Consolida a janela independente da Biblioteca Universal em três áreas: navegação por categorias, exploração de recursos e Inspector contextual.
- Isola a rolagem da navegação, da lista de recursos e do Inspector; adapta a disposição para janelas estreitas.
- Restringe dimensões de miniaturas e prévias de mídia para evitar transbordamento; mantém controles nativos de áudio e vídeo sem pré-carregamento.
- Adiciona prévias tipadas no Inspector para mídia, composições, layouts, modelos, componentes, estilos e definições lógicas, sem executar payloads importados.
- Corrige a chave de filtragem das RollTables e padroniza a apresentação de controles nativos do Foundry preservando seus handlers.
- Inclui testes de contrato e regressão para a interface da Biblioteca e seus filtros.
- Não altera regras mecânicas, schemas persistidos de Actor/Item ou dados de campanha.
- Build destinada à validação no Foundry VTT 14 build 360; inspeção visual e funcional no cliente real continua pendente.

## 1.0.0.93 — Refinamento da interface NEXUS

- Corrige a precedência visual dos trilhos flutuantes da ficha: ao focar a ficha, seus controles voltam à frente de painéis inativos; o painel realmente focado continua acima dos trilhos.
- Ao interagir com a ficha ou com seus trilhos, solicita a elevação da janela da ficha pela API da própria ApplicationV2, sem impor z-index global às janelas de terceiros.
- Expande a aplicação do shell visual compartilhado para todas as aplicações NEXUS ApplicationV2, não apenas diretórios nativos allowlisted.
- Redesenha a Biblioteca com tokens semânticos do Design System, filtros responsivos, navegação, cartões e Inspector consistentes.
- Padroniza controles nativos do Foundry como grupos flutuantes e atualiza Sidebar, navegação, Hotbar e lista de jogadores.
- Apresenta mensagens do Chat como cartões unificados e adapta mídia enriquecida nativa (imagens, GIFs, vídeos, áudio, links e embeds) ao tema, sem executar conteúdo importado.
- Inclui teste unitário para a precedência dos trilhos flutuantes.
- Build para validação no Foundry VTT 14 build 360; a inspeção visual/funcional real continua pendente.

## 1.0.0.92 — Design System e Inspector de Aparências para Foundry VTT 14

- Integra o Design System global do NEXUS às superfícies nativas selecionadas do Foundry, com temas de sistema, campanha e usuário.
- Adiciona perfis visuais versionados com 18 cores semânticas, tipografia, densidade, espaçamento, geometria e opções de acessibilidade.
- Adiciona o Estúdio de Aparência ApplicationV2, com prévia local, diagnóstico de contraste, importação/exportação e salvamento explícito por escopo.
- Integra perfis completos à coleção canônica de temas da Biblioteca Universal e preserva compatibilidade dos backups NEXUS-LIBRARY/1 e /2 com o formato /3.
- Adiciona prévia isolada de perfis no Inspector e ações explícitas para aplicar à campanha (GM, com confirmação) ou à aparência pessoal, respeitando permissões.
- Inclui testes automatizados para normalização, permissões, persistência, prévias, importação/exportação, aplicação contextual e proteção contra schemas futuros.
- Build de teste para Foundry VTT 14 build 360. A validação visual e funcional em clientes GM e jogador continua pendente; esta versão não é checkpoint funcional confirmado.

## 1.0.0.91 — Biblioteca universal integrada

- Integra a Biblioteca universal com provedores NEXUS e Foundry, catálogo paginado e resolução sob demanda de recursos.
- Adiciona janela independente e Explorer integrado à ficha, com filtros, favoritos, recentes, pastas, coleções e ações contextuais respeitando permissões.
- Adiciona backup completo, prévia e mesclagem de importação sem sobrescrita automática, além de contrato extensível para adaptadores de transferência.
- Expande a área Lógica com integração de eventos do Foundry, executores Core seguros, simulação de Fluxos e editores sequenciais/grafo com schemas visuais e acessibilidade por teclado.
- Mantém dados importados inertes e verifica permissões do usuário originador para ações sobre Actors.
- A publicação pelo GitHub Actions ocorre somente após aprovação do CI, incluindo sintaxe, regressões, schemas, manifestos, templates, estilos e empacotamento do ZIP.
- Testes funcionais no Foundry VTT 14 build 360 ainda pendentes; esta versão não deve ser considerada validada no cliente até essa etapa.

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
- Publicada como release de teste para Foundry VTT 14 build 360 após CI e pacote aprovados. O teste visual/funcional no Foundry real continua pendente; esta versão não é checkpoint funcional confirmado.

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

---

## Histórico anterior à versão 1.0.0.70

As entradas anteriores foram movidas para [`docs/archive/CHANGELOG_PRE_1.0.0.70.md`](docs/archive/CHANGELOG_PRE_1.0.0.70.md) para manter este changelog focado nas versões recentes, sem descartar o registro histórico.
