## Em desenvolvimento — próxima versão

### Integridade e resolução de propriedades
- Removidas fórmulas padrão do Core para perícias e propriedades derivadas; valores só usam fórmula explicitamente salva ou valor armazenado.
- Removido o cálculo implícito de MB a partir do nível e o cálculo automático de valores de perícia a partir de atributo/proficiência.
- Fórmulas personalizadas continuam isoladas por Actor e podem usar referências a atributos, MB e proficiência.
- Corrigida a inicialização de atributos legados no formato `{ value }`, evitando substituir o objeto inteiro por zero.

### Migrações e interações
- Migrações passam a gravar por caminhos específicos e remover campos legados com `ForcedDeletion`, respeitando a mesclagem diferencial do Foundry.
- Condições de interação consultam o resolvedor de propriedades da ficha; ações de escrita resolvem aliases para destinos físicos graváveis.
- Preservados metadados canônicos ao combinar propriedades de perícias legadas.

### Ciclo de vida da interface
- Corrigido o fechamento atrasado do seletor de propriedades ao alternar rapidamente entre campos.
- Listeners globais, temporizadores de abas e observadores do Canvas recebem limpeza explícita ao renderizar ou fechar a ficha.
- Validação automatizada e teste funcional no Foundry VTT 14 ainda são necessários antes da publicação.

## 1.0.0.61

### Propriedades e fórmulas
- Padronizado o campo editável de propriedades com o único rótulo **Valor**.
- Fórmulas de perícias e de propriedades derivadas passam pela mesma validação de expressões e resolução de caminhos; a persistência continua respeitando o armazenamento interno de cada tipo para preservar compatibilidade.
- Caminhos de propriedades normalizam aliases legados e caminhos hierárquicos usados na navegação do seletor, incluindo agrupamentos por núcleo de atributo e atributo associado à perícia.
- Fórmulas internas de perícias deixaram de aparecer como propriedades separadas no seletor.
- Adicionadas regressões para a fórmula completa de Atletismo, funções matemáticas, proficiência assinada e caminhos legados.

### Interface
- Reformulado o Inspector com hierarquia plana, menos contêineres, sem faixas decorativas, sombras em cascata ou cartões aninhados.
- O mostrador de propriedades exibe somente o nome e o caminho canônico abaixo, com altura reduzida e sem prévia de valor.
- Categorias do seletor deixaram de exibir caminhos de navegação que poderiam ser confundidos com caminhos reais de dados.
- Campos, abas, espaçamentos e estados de foco foram refinados para uma interface mais legível e consistente.

### Referências de design
- Aplicados princípios de hierarquia por tipografia e espaçamento, superfícies planas, rótulos curtos, tokens semânticos e remoção de decoração sem função.
- A identidade visual do NEXUS foi preservada; as referências externas foram usadas como critérios de qualidade, não como modelos para copiar.

### Validação
- Incluídos testes de regressão para caminhos canônicos, compatibilidade de aliases, padronização do rótulo e fórmulas de perícias.
- A validação automatizada não substitui o teste visual e funcional dentro do Foundry VTT 14.

## 1.0.0.60

### Motor de fórmulas
- A normalização de atalhos de propriedades foi centralizada e compartilhada entre a ficha e o Editor de Propriedades.
- A validação de expressões agora resolve referências como `level`, `nivel`, `mb` e os atalhos de atributos pelo mesmo caminho usado na leitura das fórmulas.
- Adicionados testes de integração para fórmulas com caminhos completos, propriedades derivadas, proficiência e funções matemáticas como `ceil()`.

### Interface
- Reorganizado o Inspector com cabeçalho visível, navegação segmentada e painéis de seção com hierarquia mais clara.
- Campos de vínculo e valor receberam superfícies próprias, melhor separação e apresentação monoespaçada para expressões.
- Os painéis de Comportamento e Estrutura de Dados receberam agrupamento visual mais consistente.
- A alteração é focada no ambiente de edição; não representa uma reformulação completa da ficha Canvas.

### Validação
- Adicionadas regressões para as duas expressões relatadas.
- A validação automatizada não substitui o teste visual e funcional dentro do Foundry VTT 14.

## 1.0.0.59

> Publicação oficial acionada para disponibilizar o pacote instalável pelo manifesto.

### Editor de propriedades
- A digitação deixou de disparar salvamentos automáticos a cada pausa; a validação ocorre ao confirmar o campo, permitindo escrever expressões sem alertas intermediários.
- Valores numéricos vazios são normalizados para zero; valores textuais vazios permanecem strings vazias e booleanos vazios assumem falso.
- Literais textuais entre aspas são interpretados sem manter as aspas no valor salvo; expressões no formato `{{"texto"}}` usam o avaliador seguro.
- Fórmulas anteriores só são removidas depois que o novo valor passa pela validação.
- O seletor apresenta **Nome | Caminho** na primeira linha e **Valor** abaixo, reduzindo a altura de cada opção.

### Interface e Design System
- Refinada a hierarquia tipográfica dos painéis e do Inspector, com campos, bordas e estados de foco consistentes.
- Ampliados os tokens centrais de tipografia, espaçamento, altura de controles e altura de linha, sem alterar os dados ou regras dos Actors.
- Mantida a linguagem visual sóbria e funcional, sem efeitos decorativos que prejudiquem a leitura.

### Validação
- Adicionados testes para strings entre aspas, expressões textuais entre chaves, valores vazios e salvamento apenas na confirmação do campo.
- A validação automatizada não substitui o teste funcional e visual dentro do Foundry VTT 14.

## 1.0.0.58

### Inspector e fórmulas
- Removidos os textos de dica do campo de valor e seus estilos.
- O campo de texto cresce conforme o conteúdo e passa a usar rolagem somente quando ultrapassa cinco linhas; uma linha não exibe barra de rolagem.
- Fórmulas padrão de MB, defesa, iniciativa, deslocamento em metros, recuperação, recuperação de PE e carga agora são apresentadas no próprio campo de valor e podem ser substituídas por outra fórmula ou por um valor manual.
- Fórmulas padrão das perícias também ficam visíveis e editáveis; o cálculo padrão é expresso com a mesma sintaxe de fórmulas persistentes.

### Salvamento e atualização dinâmica
- Gravações de expressões em `flags.nexus.propertyExpressions` são serializadas por Actor e sempre partem do estado mais recente, evitando que edições rápidas em propriedades diferentes sobrescrevam umas às outras.
- Mantido o rastreamento reativo das dependências das propriedades calculadas e atualização imediata após alterações no Inspector.

### Motor de fórmulas
- Adicionadas funções seguras `min`, `max`, `ceil`, `floor`, `round`, `abs`, `sign` e `if`, sem executar JavaScript arbitrário.
- Os valores derivados podem ser substituídos por números, textos ou expressões persistidas.

### Validação
- Adicionados testes de fórmulas padrão, funções seguras, valores manuais, ausência de hints e serialização das gravações.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.
- Pacote 1.0.0.58 publicado após aprovação das verificações automatizadas.

## 1.0.0.57

### Correções do motor de fórmulas e atualização reativa
- Campos textuais numéricos vazios agora equivalem a zero em operações aritméticas, sem alterar a concatenação textual.
- Documentada e testada a sintaxe de fórmulas personalizadas de perícias, incluindo os atalhos `@FOR` e `@MB`.
- O editor de fórmula da perícia fica claramente identificado e aceita tanto o vínculo ao resultado `.value` quanto o caminho explícito `.formula`; apagar a fórmula restaura o cálculo padrão.
- O Inspector explica propriedades derivadas, incluindo o MB, que depende do nível e não é um valor manual.

### Correções do Inspector e do buscador
- Removidas regras CSS conflitantes do buscador e consolidados os estilos em uma única seção, com nome, valor atual e caminho em linhas legíveis e sem recorte.
- Reorganizados os campos de vínculo e edição para ocupar a largura disponível sem sobreposição.
- Preservados os dados existentes, aliases, expressões e layouts dos Actors.

### Atualização automática
- Ampliado o rastreamento de dependências de propriedades derivadas: MB, valores de perícia, proficiência, defesa, recuperação, carga e deslocamento.
- Corrigido o vínculo legado `skills.<pericia>.proficient` para observar o campo persistido `proficientLevel`.
- Alterações em expressões persistidas nas flags do Actor também invalidam os componentes dependentes.

### Validação
- Incluídos testes para campos vazios, fórmulas reais de perícia, atalhos, dependências e estrutura do buscador.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.
- Pacote 1.0.0.57 publicado após aprovação dos testes automatizados.

## 1.0.0.56

### Reestruturação do editor de propriedades
- Corrigida a identificação de caminhos `skills.<perícia>.value`: o campo agora reconhece corretamente o modo de fórmula da perícia, em vez de herdar o bloqueio de propriedades calculadas.
- Reorganizada cada opção do buscador em áreas independentes para nome, valor atual e caminho técnico, evitando sobreposição e conflitos de largura.
- Separados os contêineres do caminho vinculado e do editor de valor no Inspector, com largura e dimensionamento previsíveis.
- Mantidos os caminhos canônicos, os dados já salvos nos Actors, os aliases e as expressões dinâmicas; nenhuma propriedade ou valor persistido é apagado.

### Validação
- Adicionadas regressões para o reconhecimento de fórmulas de perícia e para a estrutura/layout do buscador.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.

## 1.0.0.55

### Correção do salvamento no Inspector
- Corrigida a delegação dos eventos do editor de propriedades depois que o Inspector é movido para sua janela flutuante.
- Valores de propriedades e campos de recursos atuais/máximos (PV, PM e PE) agora salvam por eventos delegados ao documento, limitados à ficha e às janelas pertencentes a ela.
- Corrigido o fluxo que impedia alterações no valor máximo de recursos e deixava os valores do Inspector sem persistência.
- Adicionadas regressões automatizadas para edição de propriedades e recursos em painéis flutuantes.

### Validação
- A validação automatizada verifica a delegação e o isolamento dos eventos de edição.
- O teste funcional final deve ser confirmado no Foundry VTT 14.
- Pacote 1.0.0.55 publicado após aprovação da validação automatizada.
- Correção aplicada à versão distribuída do sistema.

## 1.0.0.54

### Publicação do pacote
- Geração e publicação do arquivo instalável `nexus.zip` correspondente ao manifesto desta versão.


### Proteção do Canvas e tokens
- Delete/Backspace não excluem tokens por engano enquanto os painéis do Inspector ou Comportamento estão ativos.
- A exclusão de tokens continua permitida quando o token está diretamente controlado/selecionado na cena.
- A edição de componentes do Canvas continua usando a seleção própria da ficha, sem confundir a seleção de tokens da cena.

### Propriedades e valores dinâmicos
- Removido o elemento visual `data-property-value-path`.
- Todos os valores editáveis usam um campo textual inteligente, preservando a tipagem da propriedade ao salvar.
- Propriedades numéricas, textuais e booleanas aceitam expressões entre `{{ }}`; expressões válidas ficam vinculadas e são reavaliadas quando suas referências mudam.
- Corrigida a leitura de atributos armazenados como objetos `{ value }` no cálculo de perícias e fórmulas, evitando resultados incorretos iguais a zero.
- A validação impede expressões inválidas ou resultados incompatíveis com o tipo da propriedade.

### Validação
- Adicionados testes para atributos aninhados, fórmulas, expressões persistidas e bloqueio de exclusão acidental de tokens.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.

## 1.0.0.53

### Inspector e propriedades
- Removido o painel visual separado de valor; o editor utiliza diretamente o campo `data-property-value`, expansível até cinco linhas e com rolagem interna.
- Padronizados os campos de Conteúdo, Propriedade relacionada e Valor/Conteúdo da propriedade para todos os cards selecionados.
- Centralizada a normalização de caminhos canônicos, singulares e abreviados, incluindo `for.value`, `attribute.for.value`, `resource.pv.value` e `skill.*`.
- Corrigida a leitura e a gravação de atributos armazenados como números ou como objetos legados com `value`, incluindo os seis atributos do NEXUS.
- O campo de valor permanece visível sem vínculo, mas fica desativado até que uma propriedade seja selecionada.

### Foco e interação
- As barras laterais respeitam a camada das janelas abertas e não ultrapassam o Inspector ou o editor de Comportamento quando o Canvas recebe foco.
- Cards com gatilhos de interação exibem consistentemente o cursor de mão no Modo Padrão.
- Botões do editor de Comportamento recuperam o cursor de interação, mantendo o estado desativado visualmente distinto.

### Validação
- Incluídos testes de regressão para caminhos abreviados, atributos escalares/aninhados, campos padronizados, empilhamento das janelas e cursor de interação.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.

## 1.0.0.52

### Correções complementares de propriedades
- Normalizados os caminhos singulares attribute/resource/skill antes da busca de aliases, mantendo compatibilidade com expressões como `attribute.for.value`.
- A versão reúne as correções de inicialização do Modo Padrão, persistência de aliases personalizados, edição de campos aninhados e organização visual do Inspector.
- O caminho configurado do alias permanece visível e estável no editor, mesmo quando o destino é armazenado em dados personalizados.

### Validação
- Atualizados os testes de regressão e os metadados de distribuição para a versão 1.0.0.52.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.

## 1.0.0.51

### Modo da ficha e propriedades
- O estado interno da ficha é inicializado explicitamente como Modo Padrão antes da preparação do contexto, mantendo o modo visual e os gatilhos sincronizados.
- O campo de vínculo preserva o identificador original do alias, inclusive quando a propriedade personalizada não possui caminho físico em Actor.system; caminhos legados como `attribute.for.value` também são normalizados para localizar o alias canônico.
- A edição de aliases personalizados e de metadados grava em flags.nexus.customData, em vez de tentar atualizar um caminho vazio em Actor.system.
- A resolução de aliases de atributos e recursos identifica destinos que são objetos e direciona a edição para .value ou .max, sem substituir a estrutura inteira.
- O Inspector separa o valor editável do nome e do caminho da propriedade, mostrando o caminho em uma área própria e legível.

### Validação
- Adicionadas regressões estáticas para inicialização do modo, resolução de aliases, persistência de propriedades personalizadas e organização do Inspector.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.

## 1.0.0.50

### Correções críticas da ficha
- Corrigida a importação ausente de `evaluateNexusSkillFormula`, que interrompia a ativação dos listeners e impedia a abertura normal da ficha.
- O método `_activateCanvas()` agora é chamado no fim de cada renderização, após a atualização dos componentes.
- Os listeners de interação do modo de jogo são registrados automaticamente ao abrir e re-renderizar a ficha; listeners anteriores são limpos antes da nova ativação.
- O registro dos listeners do editor Canvas também volta a ocorrer quando a ficha é renderizada no modo Aparência.

### Validação
- Adicionados testes de regressão para a importação explícita da função e para a chamada de ativação do Canvas no ciclo de renderização.
- A validação automatizada não substitui o teste funcional dentro do Foundry VTT 14.

## 1.0.0.49

### Gatilhos e interações
- Corrigido o despacho de cliques no modo de jogo: a execução não depende mais de um atributo HTML que podia permanecer desatualizado após salvar um fluxo no Inspector.
- A edição de comportamento sincroniza imediatamente o estado de ação do card no DOM e no layout em memória, sem exigir alternar para Aparência e voltar.
- Gatilhos aceitam modificadores independentes e combinações exatas de Shift, Ctrl, Alt e Meta.
- Ampliados os eventos suportados: clique esquerdo, direito e do meio, duplo clique, pressionar/soltar ponteiro, hover, alteração, envio, foco, perda de foco, teclas pressionadas/soltas e interação encadeada.
- A ação Interagir com componente continua chamando outro card pelo evento configurado, com limite de profundidade para evitar ciclos ilimitados.

### Propriedades e fórmulas
- Campos de texto das propriedades passam a usar área expansível até cinco linhas, com rolagem vertical apenas quando necessário.
- Descrições de perícias podem ser personalizadas por Actor sem alterar as descrições padrão do catálogo.
- Valores de perícias continuam calculados pelas regras-base quando não há fórmula personalizada.
- Cada perícia pode receber uma fórmula opcional em `skills.<pericia>.value`; a fórmula fica armazenada em `skills.<pericia>.formula`.
- Fórmulas de perícia aceitam `força`/`for`, `mb` e `proficiencia` (o sinal do nível de proficiência), além dos caminhos canônicos da perícia. Fórmula vazia restaura o cálculo padrão.
- Fórmulas inválidas são rejeitadas na edição e não substituem o cálculo padrão.

### Organização e estabilidade do repositório
- Adicionada uma política explícita de checkpoints estáveis, com critérios de CI, testes funcionais no Foundry e registro de limitações.
- Protótipos HTML antigos foram resumidos em documentação de arquivo e retirados da árvore ativa; continuam recuperáveis pelo histórico Git.
- Nenhuma Release/tag antiga foi apagada. O changelog e o histórico de commits permanecem como registro das versões anteriores.

### Validação
- Adicionados testes para combinações de modificadores, eventos expandidos, fórmulas personalizadas, descrições de perícias e campos textuais expansíveis.
- A aprovação automatizada é registrada pelo workflow associado à release; os testes funcionais no Foundry VTT 14 continuam necessários para confirmar a interação real e a edição de propriedades.

## 1.0.0.48

### Regras de apresentação e tipografia
- Corrigida a ligação entre o resultado calculado das regras (`representationContent`) e o template da ficha; a saída deixa de depender de campos que não são fornecidos pelo contexto.
- A renderização inicial utiliza o mesmo atualizador de representações da atualização reativa, preservando texto, ícones e imagens após renderizações da ficha.
- Removido o encolhimento automático da fonte do conteúdo com base na altura/largura do card, que podia sobrepor o tamanho definido na aparência e reduzir textos a aproximadamente 7 px.
- O valor da representação passa a respeitar o tamanho tipográfico configurado, sem ampliação adicional de 1,45×.

### Validação
- Adicionados testes para a correspondência entre o campo de saída do avaliador e o template, para o atualizador da primeira renderização e para a preservação do tamanho tipográfico.
- A validação automatizada do pacote e a publicação da Release são executadas pelo CI; a confirmação visual e funcional em Foundry VTT 14 continua necessária.

## 1.0.0.47

### Atualização reativa e regras de apresentação
- A saída de uma regra que resulte em conteúdo vazio agora recua para o valor da propriedade de origem; uma condição correspondente não deixa mais o card sem conteúdo.
- A origem das regras respeita o vínculo explícito do componente e, na ausência dele, o caminho configurado na apresentação antes do padrão do tipo de componente.
- A invalidação reativa considera os caminhos reais de origem de propriedades virtuais e aliases, não apenas seus identificadores de apresentação.
- A persistência de layouts mantém o snapshot em memória alinhado ao resultado do merge de três vias, evitando que edições posteriores reutilizem configurações antigas.
- Adicionados testes de regressão para os cinco estágios assinados de proficiência (-2 a +2), conteúdo interpolado vazio e preservação do valor original.

### Validação
- O workflow oficial valida o código e os testes, gera `nexus.zip` com os diretórios necessários do sistema e publica a Release correspondente.
- A suíte automatizada do repositório valida sintaxe, manifesto, regras, persistência e pacote.
- A confirmação visual e funcional em Foundry VTT 14 continua necessária; a automação não substitui o teste dentro do Foundry.

## 1.0.0.46

### Mídia flexível nas regras de apresentação
- URLs diretas terminadas em SVG, PNG, JPG/JPEG, WEBP, GIF ou AVIF passam a ser reconhecidas como imagens, sem exigir o marcador `{{image:...}}`.
- Caminhos locais em `icons/`, `systems/` e `modules/` também são reconhecidos quando apontam para formatos de imagem suportados.
- Classes Font Awesome isoladas, como `fa-solid fa-skull`, são reconhecidas automaticamente como ícones.
- Mantida a compatibilidade integral com `{{icon:...}}` e `{{image:...}}`.
- Tokens de imagem aceitam opções seguras de dimensão e ajuste: `{{image:URL|width=80px|height=80px|fit=contain}}`. Dimensões aceitas: px, %, em, rem, vw, vh, vmin e vmax; ajuste: contain, cover ou fill.
- Imagens exibidas sozinhas passam a usar o espaço disponível do card, preservando a proporção e sem corte por padrão; mídia misturada com texto continua em tamanho inline.
- Adicionados testes de regressão para reconhecimento automático, compatibilidade e dimensionamento.
- O pacote de distribuição é publicado automaticamente após a validação do repositório.

### Observação de validação
- A validação automatizada do pacote é executada pelo CI. A conferência visual e funcional em Foundry VTT 14 continua necessária para confirmar o comportamento em cards de diferentes dimensões.

## 1.0.0.45

### Interações e atualização dinâmica
- Corrigida a validação dos caminhos das ações `update` e `calculate`; destinos como `skills.athletics.proficientLevel` agora são aceitos e normalizados, mantendo a proteção contra caminhos inválidos.
- Ações de soma e subtração leem o valor numérico atual, validam o incremento e persistem sem forçar uma renderização integral da ficha.
- Após uma ação de atualização ou cálculo, os componentes e expressões dependentes são atualizados imediatamente.
- Propriedades virtuais com origem em `Actor.system` agora são gravadas no caminho `system.*`, corrigindo a edição de `proficientLevel` e outras propriedades calculadas com origem persistida.
- O editor de fluxos salva layouts sem renderizar a ficha inteira, mantém a aba selecionada e restaura foco/cursor no campo editado.
- A avaliação de rolagens utiliza `Roll.evaluate()` sem a opção `async` removida no Foundry VTT 14.

### Propriedades
- `proficientLevel` é reconhecida como propriedade numérica editável, não como campo derivado.
- O seletor de propriedades passa a exibir o valor atual de cada propriedade, inclusive proficiência, atributos, recursos e propriedades personalizadas resolvidas.
- Testes de regressão adicionados para caminhos de destino, edição de proficiência, exibição de valores, permanência da aba ativa e API de rolagem.
- O pacote desta revisão é gerado após a validação de sintaxe, regressões e estrutura do pacote no CI.
- A validação automatizada e o teste funcional/visual dentro do Foundry VTT 14 devem confirmar o comportamento integrado desta versão.

## 1.0.0.44

### Propriedades e proficiência
- Corrigida a migração para persistir `proficientLevel` como número, preservando valores negativos e positivos; booleanos antigos são convertidos para 1 ou 0 e o antigo estado `opposed` é convertido para -1.
- A leitura de proficiência prioriza o campo numérico canônico. O sinal do nível determina se MB é adicionado, subtraído ou não aplicado; a magnitude fica preservada no dado sem multiplicar MB.
- O catálogo e o registro passam a expor o campo numérico editável de proficiência. O estado `proficient` permanece somente como leitura derivada.
- As linhas de perícia usam campos numéricos editáveis; alterações atualizam valores e cards vinculados sem renderizar novamente a ficha.
- Cards de proficiência exibem ícones para níveis negativos, neutros e positivos. Clique aumenta um nível, Shift+clique reduz e Alt+clique redefine para zero.
- Regras de apresentação deixam de salvar durante cada tecla; a persistência ocorre ao concluir a edição, sem reconstruir o campo enquanto o usuário digita.

### Interface e validação
- Corrigido o seletor CSS excessivamente específico que impedia a regra do canto superior esquerdo de ser aplicada.
- Atualizada a versão do esquema de propriedades para 3.
- Testes de regressão atualizados para os valores assinados, migração de `opposed`, campo numérico e seletor do canto superior esquerdo.
- A validação automatizada e o teste funcional/visual no Foundry VTT 14 ainda precisam ser executados para confirmar esta versão.
- Referências de fórmulas a propriedades de Itens não foram incluídas nesta versão; o registro atual cobre propriedades do Actor, e a expansão para documentos Item precisa contemplar resolução de caminhos e atualização reativa de documentos incorporados.

## 1.0.0.43

### Validação
- A validação automatizada da versão 1.0.0.43 é executada pelo fluxo de release; a confirmação funcional/visual em Foundry VTT 14 continua necessária.

### Edição dinâmica e sincronização
- Valores editáveis de propriedades e recursos passam a atualizar as regras durante a digitação, sem depender de Enter.
- A gravação de layouts e valores evita renderizações integrais da ficha durante a edição, preservando foco e continuidade.
- Campos de condição e conteúdo das regras são persistidos sem substituir seus elementos, mantendo texto, cursor e seleção.
- O histórico captura o início da edição, sem criar uma entrada para cada tecla.

### Geometria dos cards
- A detecção de cantos conectados também acompanha mudanças de posição e inserção/remoção de superfícies, não apenas redimensionamentos.
- A varredura de cantos é adiada durante arrastes e movimentos por teclado, mantendo a atualização final sem custo por quadro.
- O pacote desta revisão é publicado após a validação automatizada do repositório.
- A alça de redimensionamento noroeste deixa livre a borda superior esquerda do card.
- Mantida a regra de achatar somente o canto que realmente toca outra superfície.

### Atalhos e propriedades
- Identificadores genéricos de metadados, como name, exib e attribute, deixam de ser tratados como abreviações de rolagem, inclusive quando aparecem nos rótulos com acentos.
- Candidatos que apontam para o mesmo valor são deduplicados antes da detecção de ambiguidades.
- Preservadas as convenções @atalho para valor exibido e {{caminho}} para leitura direta ou expressão, sem alterar dados já salvos.

## 1.0.0.42

### Exibição das regras e cards compactos
- Reavalia as representações por regra após o salvamento de movimentos e redimensionamentos no Canvas, evitando que a saída visual desapareça após alterar as dimensões.
- Cards com largura ou altura inferior a 100 px recebem padding interno de no máximo 2 px.
- A classificação de cards compactos acompanha redimensionamentos e também considera componentes dentro de grupos.

### Compatibilidade com Foundry VTT 14
- Substitui a sintaxe legada de exclusão de propriedades de perícias pelo operador `foundry.data.operators.ForcedDeletion`.
- Remove o aviso de compatibilidade associado à exclusão de `proficient`, `proficiency`, `opposed` e entradas antigas de perícia.
- Acrescenta testes de regressão para o modo compacto por largura e altura, reavaliação das regras após redimensionamento e contato parcial entre cantos. [release] [release]

## 1.0.0.41

### Bordas e cantos
- Corrigida a interferência de regras antigas de contato por lado: somente os cantos identificados individualmente como tocados perdem o arredondamento.
- Mantida a detecção geométrica compartilhada para componentes e superfícies de grupo.

### Edição dinâmica das regras
- Regras de apresentação passam a ser salvas durante a digitação, sem depender de Enter ou da perda de foco.
- A atualização durante a digitação não reconstrói os campos, preservando cursor e continuidade da edição.
- O histórico de alterações permanece associado à confirmação do campo, evitando registrar cada tecla como uma ação separada.
- Acrescentados testes de regressão para contato isolado entre cantos e salvamento automático durante a edição.

## 1.0.0.40

### Bordas e geometria
- Centralizada a detecção de contatos em um módulo compartilhado, executado nos modos Padrão, Configuração e Aparência.
- Componentes independentes e superfícies de grupos agora participam da mesma verificação, incluindo contatos entre grupos e componentes externos.
- A detecção acompanha alterações dimensionais por ResizeObserver e o editor de Aparência reutiliza o mesmo cálculo.

### Regras de apresentação e expressões
- O conteúdo fora de `{{...}}` permanece literal; somente expressões explicitamente delimitadas são avaliadas.
- Corrigida a interpolação de `@atalho`: o prefixo é preservado para buscar o valor de exibição; `{{caminho}}` continua sendo leitura direta. Exemplo: `{{"1"+"1"}}` resulta em `11`, enquanto `"1"+"1"` permanece texto.
- Rótulos “Condição” e “Conteúdo exibido” posicionados acima dos respectivos campos.
- Padronizadas as referências: `@atalho` solicita o valor apresentado; `{{caminho.direto}}` lê o caminho de dados; `{{@atalho}}` permanece compatível.
- O avaliador diferencia soma numérica de concatenação textual: `2 + 2 + 2` resulta em `6`; `"2" + "2" + "2"` resulta em `222`.
- Comparadores `=`, `==`, `!=`, `>`, `>=`, `<` e `<=` revisados e cobertos por testes; igualdade também aceita strings.
- Tokens de imagem resolvem referências, por exemplo `{{image:@retrato}}`, mantendo mídia separada de texto e operações.

### Validação
- Incluídos testes de geometria entre componentes e grupos, expressões, strings, comparadores e referências diretas/de exibição.
- A validação automatizada ocorre no GitHub Actions; confirmação visual em Foundry VTT 14 continua necessária.

## 1.0.0.39

### Apresentação de propriedades
- Corrigida a avaliação das condições para aceitar referências simples com `@caminho`, expressões completas entre `{{...}}` e referências entre chaves dentro de comparações.
- O conteúdo das regras aceita referências `@caminho`, tokens `{{@caminho}}` e expressões numéricas como `{{@nivel + @bonus}}`.
- Regras também podem usar uma referência direta como condição de presença, além de comparações numéricas.
- A atualização reativa agora observa dependências de `propertyPresentation`, incluindo referências usadas na condição e no conteúdo.
- Cada regra possui nome próprio editável e controles para mover para cima ou para baixo.
- Removidos os rótulos “Se” e “Conteúdo” e os placeholders dos campos.
- Simplificada a hierarquia visual do editor: removidas superfícies aninhadas, mantendo divisórias discretas e controles alinhados ao restante do Inspector.

### Aparência
- Corrigida a borda dos componentes para manter uma superfície consistente nos modos padrão, configuração e aparência, respeitando a cor personalizada e preservando a superfície compartilhada dos grupos.

### Validação
- Adicionadas regressões para sintaxe de condições, interpolação de conteúdo, nomes e ordenação de regras, atualização reativa e bordas nos modos da ficha.
- Testes automatizados do pacote executados pelo GitHub Actions; confirmação visual em Foundry VTT 14 continua necessária.

## 1.0.0.38

- Corrigida a preservação da rolagem durante renderizações completas da ficha: a captura agora contempla todos os contêineres roláveis encontrados nos painéis, abas do Inspector, Biblioteca, Comportamento e janelas flutuantes.
- A restauração usa o seletor e a posição de cada contêiner correspondente, preservando também painéis internos que antes não entravam na lista de rolagem.
- Mantidas as correções de atalhos de rolagem e o editor de apresentação simplificado: sem regras, o painel exibe somente “Adicionar regra”.
- Atualizados os testes de regressão para a nova versão e para a cobertura ampliada de rolagem.

**Validação:** sintaxe, manifesto, templates, estilos, regressões e build serão verificados pelo GitHub Actions. A confirmação visual em Foundry VTT 14 continua necessária.

## 1.0.0.37

- Reorganizado o editor: regras de apresentação agora ficam no painel Propriedades; Comportamento fica reservado aos fluxos.
- Substituídos os campos separados de ícone, rótulo e valor por um único campo de conteúdo com interpolação, ícones e imagens.
- Adicionada compatibilidade de leitura com regras antigas, suporte a `=` como igualdade e avisos de abreviações ambíguas.
- Ajustada a renderização para evitar substituir o conteúdo visual quando a saída não mudou; reforçada a superfície única de grupos.

**Validação:** sintaxe, testes automatizados, manifesto e build serão verificados pelo GitHub Actions. A validação visual em Foundry VTT 14 ainda é necessária.

## 1.0.0.36

- Refinada a atualização reativa: o NEXUS identifica os caminhos alterados no Actor e compara com as propriedades e expressões utilizadas por cada componente.
- Somente componentes afetados são reavaliados; suas interpolações de texto e regras de representação são atualizadas sem renderização integral da ficha, timer ou polling.
- Adicionadas regressões para a invalidação seletiva baseada em dependências.

**Validação:** sintaxe, testes automatizados, manifesto e build do pacote serão verificados pelo GitHub Actions. Testes funcionais e visuais dentro de uma instalação real do Foundry VTT 14 continuam necessários.

## 1.0.0.35

- Adicionadas regras de representação visual no menu Comportamento: cada componente pode mapear uma propriedade para ícones, rótulos e valores calculados por condições ordenadas.
- Condições aceitam comparações numéricas (`>`, `>=`, `<`, `<=`, `==`, `!=`); fórmulas aceitam módulo (`%`) além das operações aritméticas existentes.
- O mapeamento é somente visual: não altera a propriedade original e preserva a apresentação padrão quando nenhuma regra corresponde.
- Expressões interpoladas e componentes vinculados são reavaliados em resposta ao evento `updateActor` do Foundry. Não foi adicionado timer, polling ou renderização integral periódica.
- Adicionadas regressões para comparações, módulo, seleção de regras, persistência da configuração e atualização orientada a eventos.

**Validação:** sintaxe, testes automatizados, manifesto e build do pacote serão verificados pelo GitHub Actions. Testes funcionais e visuais dentro de uma instalação real do Foundry VTT 14 continuam necessários.

## 1.0.0.34

- Criado o registro central de leitura de propriedades, reunindo definições do Core, metadados nativos, propriedades personalizadas e caminhos externos do Actor.
- O seletor passa a incluir propriedades personalizadas e identificadores configurados, preservando os caminhos antigos como referências compatíveis.
- Propriedades numéricas personalizadas agora podem alternar entre valor manual e cálculo automático por fórmula.
- Fórmulas são avaliadas sob demanda com valores atuais do Actor; referências inválidas, ciclos, divisões inválidas e resultados não finitos não sobrescrevem os valores manuais persistidos.
- Mantidos os dados existentes em `Actor.system`, `flags.nexus.aliases`, `flags.nexus.customData` e `flags.nexus.nativeProperties`; nenhuma limpeza destrutiva ou reset de personagens foi realizado.

**Validação:** validação estática e regressões aprovadas no GitHub Actions. O build completo e testes funcionais/visuais em uma instalação real do Foundry VTT 14 continuam necessários.

## 1.0.0.33

- Corrigido o encaixe de bordas no Canvas: o controlador detecta contato real entre arestas, aplica estados nos dois elementos e recalcula os cantos quando a seleção muda.
- Consolidada a origem do token no seletor: `identity.token.img` e `identity.token.border` permanecem canônicos; os aliases de raiz `token.img` e `token.border` deixam de aparecer como propriedades separadas, mantendo compatibilidade de resolução.
- Reorganizada a categoria Carga: Base, Bônus, Capacidade, Atual e Excedida aparecem diretamente sob um único grupo, sem subgrupos redundantes. O caminho legado `encumbrance.current` não é listado em paralelo ao caminho canônico `encumbrance.current.value`.
- A Biblioteca de fluxos passa a exibir gatilhos, condições, combinação E/OU, ações, configurações e estado de ativação.
- Adicionada a exclusão de fluxos e grupos salvos na Biblioteca pessoal; a exclusão de componentes salvos permanece disponível.
- Padronizada a altura mínima inicial do grupo de gatilhos em 54 px.
- As barras laterais acompanham a pilha de janelas e ficam à frente quando a ficha está em foco, sem sobrepor outras aplicações quando perde o foco.
- Fechamento das janelas flutuantes passa a evitar a animação longa padrão do ApplicationV2.
- Avançada a etapa de desempenho de mídia: áudio e vídeo rich media só carregam a fonte ao se aproximarem da área visível; imagens continuam usando lazy loading nativo.
- Atualizados testes de regressão para catálogo de propriedades, exclusão, bordas conectadas, janelas e lazy loading.

**Validação:** sintaxe, manifesto, templates, estilos, regressões e build do pacote serão verificados pelo GitHub Actions. Testes funcionais e visuais em uma instalação real do Foundry VTT 14 ainda são necessários; nenhuma regra ou fórmula do livro-base foi alterada.

## 1.0.0.32

- Centralizado o esquema canônico de propriedades dos Actors, com versão própria e caminhos consistentes para atributos, perícias, recursos, identidade, progressão, recuperação, deslocamento, defesa, carga e condições.
- Seletor de propriedades passa a ser gerado a partir do registro central, incluindo caminhos virtuais de perícias como nome, exibição e valor calculado.
- Migração normaliza dados antigos e remove sobrescritas nativas obsoletas, preservando aliases e dados personalizados.
- Documentado o contrato do esquema em `docs/actor-property-schema.md`.
- Separados o viewport, as interações de uso e o editor visual do Canvas; o editor passa a ser importado somente ao entrar no modo de aparência.
- Reforçadas as proteções de ciclo de vida e limpeza de listeners/observers durante a troca de módulos.

**Validação:** validações automatizadas de sintaxe, manifesto, templates, estilos, regressões e build do pacote aprovadas no GitHub Actions. Testes funcionais e visuais em uma instalação real do Foundry VTT 14 ainda são necessários. A reformulação centraliza o registro e a resolução das propriedades; não representa uma substituição integral de todos os dados persistidos por um novo formato nem uma reformulação visual completa da ficha.

## 1.0.0.31

- Otimizado o cálculo de alinhamento do Canvas com busca binária sobre anchors ordenados, preservando a tolerância e os critérios de desempate.
- Reduzidas buscas repetidas de componentes e grupos durante salvamento e atualização da seleção, com índices em memória.
- Otimizada a atualização de cantos conectados, agrupando comparações por grupo e pré-calculando retângulos e cantos.
- Indexadas as superfícies dos grupos para evitar consultas DOM repetidas durante sincronização e seleção.
- Biblioteca passa a ser carregada sob demanda, somente quando o painel é aberto.
- Adicionados testes de regressão para geometria de alinhamento, seleção e carregamento sob demanda.

**Validação:** verificações automatizadas de sintaxe, manifesto, pacote, build Foundry e regressões aprovadas no GitHub Actions. Testes funcionais dentro do Foundry VTT 14 ainda são necessários, especialmente seleção, alinhamento, movimentação, redimensionamento, grupos e salvamento em layouts grandes.

## 1.0.0.30

- Otimizada a preparação da ficha: dados de aliases personalizados são obtidos uma vez e reutilizados durante a montagem do contexto.
- Substituídas buscas repetidas de componentes e grupos por índices em memória (Map e Set), preservando a ordem original e a associação dos componentes aos grupos.
- Otimizadas as atualizações de componentes vinculados, evitando consultas individuais repetidas ao DOM.
- Renderizadores de mídia adaptativa e rich media agora indexam componentes por ID em vez de percorrer a lista para cada elemento.
- Canvas passa a reutilizar a lista de elementos e índices de grupos durante a ativação, reduzindo consultas ao DOM e trabalho repetido nas operações de agrupamento.
- Verificação de cantos conectados é adiada durante o arraste de grupos e recalculada ao término do gesto, reduzindo o trabalho por quadro.

**Validação:** alterações integradas pelo PR #29. A validação funcional e visual em uma instalação real do Foundry VTT 14 permanece necessária; indicadores de cantos conectados durante o arraste são atualizados ao final do gesto.

## 1.0.0.29

- Reorganizado o catálogo de propriedades: Corpo, Mente e Alma são grupos; Força, Destreza, Sabedoria, Inteligência, Carisma e Vontade são as seis propriedades numéricas reais.
- Removidos do catálogo os antigos caminhos escalares `attributes.body`, `attributes.mind` e `attributes.soul`, preservando-os apenas para compatibilidade com fichas e layouts antigos.
- Perícias agora são agrupadas pelo atributo relacionado e expõem somente o modificador total e o nível de proficiência como propriedades principais.
- Proficiência normalizada para três estados: -1, 0 e +1. O estado legado `opposed` é convertido para -1 e removido; níveis antigos fora do intervalo são normalizados.
- Removida a apresentação separada de oposição/deficiência: o próprio valor numérico assinado representa a proficiência.
- Componentes de atributo, listas de caminhos e opções do Inspector alinhados aos seis atributos oficiais.
- Biblioteca e Aparência global agora compartilham o mesmo fluxo de aplicação de tema; mudar o tema atualiza os controles de ambas as áreas sem recriar a ficha.
- Estado da Biblioteca (seção, busca, filtro e rolagem) preservado entre renderizações.

**Validação:** regressões de catálogo, agrupamento, compatibilidade de proficiência e sincronização de temas adicionadas. Pacote automatizado validado; a confirmação visual final ainda depende de teste manual no Foundry VTT 14.

## 1.0.0.28

- Corrigido o visualizador de propriedades: removidos textos duplicados que causavam sobreposição entre nomes, caminhos e setas.
- Navegação por categorias agora mantém o foco no campo de origem, impedindo que o seletor feche ao abrir categorias como Recursos.
- Seleção de propriedades preserva a interação com o campo e dispara a atualização correspondente.
- Preservada a posição de rolagem dos painéis internos durante atualizações e renderizações do editor.
- Ampliados os tokens semânticos dos temas para Canvas, cabeçalhos de janela, botões ativos, superfícies e estados de foco.
- Confirmado que o asset “Indicador – Barra” continua no catálogo da Biblioteca; renderizadores de outros tipos permanecem como suporte extensível ao catálogo.

**Validação:** testes automatizados e validação do pacote no GitHub Actions. Pacote preparado para distribuição no Foundry VTT 14; a confirmação visual final ainda depende de teste manual no Foundry.

## 1.0.0.27

- Corrigida a inicialização de `activateCanvasInteractions`: os elementos raiz e Canvas agora são declarados localmente, evitando `ReferenceError` durante a renderização da ficha.
- Adicionadas regressões de execução para renderizações sem elemento raiz e sem Canvas.
- Atualizada a versão do pacote e o manifesto de download.

**Validação:** verificação de sintaxe JavaScript e testes automatizados do pacote aprovados no GitHub Actions. A validação de interface em uma instalação real do Foundry VTT 14 permanece necessária.

## 1.0.0.26

- Seletor de propriedades passa a navegar por categorias e níveis, com pesquisa global e sugestões progressivas; substitui a lista extensa e o controle de expandir/reduzir.
- Catálogo de propriedades centralizado em módulo próprio, com nomes localizados para atributos, perícias, recursos, combate e identidade.
- Perícias oferecem propriedades calculadas derivadas da regra ativa: modificador, bônus, atributo, proficiência e demais dados expostos por `getNexusSkillRows`.
- Selecionar uma opção no menu flutuante não dispara mais a limpeza global de seleção; o alvo de edição é mantido ao limpar somente a seleção visual.
- Menu fecha ao interagir fora dele e preserva o contexto ao clicar nas próprias opções.
- Tema, padrões de layout, janela flutuante, visualização do seletor, catálogo, ligações de eventos e interações do Canvas foram separados em módulos por responsabilidade, mantendo a ficha como ponto de integração.
- Barra de rolagem do portal do seletor recebe os mesmos tokens visuais das janelas NEXUS; campos focados deixam de ter seus destaques recortados pelo conteúdo do componente.
- Mantido o formato persistido de layouts, componentes, aliases e fluxos.

## Validação

- Verificações automatizadas de sintaxe, manifesto, integridade do pacote e regressões aprovadas no GitHub Actions.
- ZIP de distribuição será publicado como asset da release `v1.0.0.26`, no caminho declarado pelo manifesto.
- Validar no Foundry VTT 14 o seletor em Propriedades, Comportamento, fórmulas e Biblioteca; testar clique fora, seleção de área vazia, navegação hierárquica e propriedades calculadas de perícias.
- Confirmar visualmente os destaques/foco dos campos em componentes com diferentes formatos e dimensões.

## Correções em preparação para 1.0.0.25

- Biblioteca: miniaturas de indicadores e componentes pessoais passam a usar uma área de visualização quadrada independente das dimensões do componente no Canvas.
- Biblioteca: cartões personalizados salvos exibem uma prévia com título e conteúdo, em vez de apenas um glifo genérico.
- Biblioteca: busca e filtro recebem layout responsivo sem sobreposição; as seções Assets, Fluxos e Temas e a separação Padrão NEXUS / Meus itens são mantidas.
- Propriedades: removida a segunda montagem de opções no Inspector. A lista dinâmica passa a ter um único portal e um único fluxo de renderização, sem ser movida entre janelas.
- Propriedades: o mesmo seletor atende campos de vínculo, condições, fórmulas e campos de texto/textarea, incluindo conteúdo de cards personalizados.
- Propriedades: atualização da assinatura também considera aliases de rolagem; o campo proprietário é registrado antes do reposicionamento assíncrono.
- Propriedades: a seleção insere o texto no cursor, mantém o foco e usa uma rolagem padronizada com espaço reservado para a barra.
- Comportamento: após atualizar um campo e reconstruir o editor, o cursor e a seleção de texto são restaurados.
- Mantida a separação entre dados do Actor, configuração dos componentes e apresentação visual.

**Validação pendente:** testes de sintaxe/integração e execução funcional no Foundry VTT 14. Esta alteração ainda não deve ser tratada como release publicada.

## 1.0.0.24

- Biblioteca reorganizada em áreas de Assets, Fluxos e Temas, com separação entre conteúdo padrão e itens pessoais.
- Componentes individuais podem ser salvos e reutilizados pela Biblioteca; grupos mantêm prévias quadradas e independentes da proporção total do Canvas.
- Miniaturas de assets usam uma área quadrada fixa e ajustam o conteúdo interno sem deformar a proporção do componente.
- Biblioteca de Fluxos permite consultar comportamentos salvos e inserir um fluxo no componente selecionado.
- Temas integrados passam a ser apresentados diretamente na área Temas da Biblioteca.
- Busca da Biblioteca consolidada em um único campo, com filtragem entre assets, itens pessoais, fluxos e temas.
- Buscador de propriedades centralizado em uma única lista reutilizada nos painéis; inclui expansão/redução, posicionamento responsivo e atualização de opções.
- Campos de propriedade do editor de Comportamento passam a usar explicitamente o mesmo buscador.
- Fórmulas de rolagem e cálculo aceitam sugestões `{{propriedade}}`, resolvidas como referências de dados antes da avaliação da fórmula.
- CSS final padroniza miniaturas, cartões pessoais, fluxos, abas, busca e lista de propriedades, reduzindo conflitos de regras anteriores.

## 1.0.0.22

- Reconstrução do renderizador do editor de comportamento, preservando o motor e os dados dos fluxos existentes.
- Gatilhos e condições passam a usar cartões alinhados e consistentes; condições oferecem sugestões dos caminhos encontrados no ator via datalist, mantendo edição manual.
- Ações reorganizadas em cabeçalho compacto com título, ativação e ferramentas alinhados; configurações em coluna única.
- Biblioteca recupera miniaturas maiores e cartões verticais; composições personalizadas recebem área de prévia ampliada.
- Ajustes responsivos e testes de regressão para a nova estrutura.

## 1.0.0.21

- Remove legendas visuais redundantes de Propriedade, Operador e Valor nas condições, mantendo nomes acessíveis.
- Consolida a lista de ações em uma única coluna e organiza controles e configurações em linhas previsíveis.
- Reorganiza Aparência global com alinhamento consistente entre rótulos, seletores e color pickers.
- Padroniza as dimensões finais dos painéis compactos (400 × 600) e amplos (900 × 600).

## 1.0.0.20

### Editor de fluxos e sistema visual
- Painéis compactos padronizados em 400 × 600 px; Biblioteca e Comportamento em 900 × 600 px.
- Removido o cabeçalho redundante do painel Comportamento; o editor de fluxos assume a identificação e a navegação.
- Título, abas de fluxos, criação e inserção de modelos foram reunidos em uma única área de navegação.
- Removidas contagens auxiliares e legendas redundantes; nome do fluxo passa a usar campo direto com nome acessível.
- Gatilhos usam seletor direto sem a legenda "Evento".
- Condições passam a ser exibidas em blocos de superfície, com seletor E/OU integrado ao cabeçalho e colunas dedicadas para propriedade, operador, valor e remoção.
- Estado Ativa foi movido para a linha de identificação da ação; tipo e configurações permanecem abaixo.
- Mantida a estrutura persistida dos fluxos, IDs, ações e compatibilidade com interações existentes.

### Temas, cores e controles
- Ampliados os tokens semânticos para superfícies, bordas, texto, foco, campos, botões, estados e barras de rolagem.
- Cabeçalhos, conteúdo das janelas, campos, botões, foco e rolagem passam a consumir os mesmos papéis de tema.
- Paletas de tema continuam definidas centralmente; alternar tema atualiza os tokens de todos os painéis abertos.
- Color pickers reorganizados em linhas consistentes com rótulo e seletor de largura útil.
- Estados de foco visíveis, controles desativados e hover padronizados.

### Referências de design e validação
- Aplicados princípios de Fluent 2 para papéis de cor, estados semânticos e uso moderado de cores de destaque.
- Aplicados princípios do Atlassian Design System para tokens, escala de espaçamento, proximidade e hierarquia visual.
- Testes de regressão atualizados para dimensões, editor, temas e distribuição de color pickers.
- Necessária confirmação visual e funcional em instalação real do Foundry VTT 14.

## 1.0.0.19

### Correção da Biblioteca e distribuição de espaço
- Corrigido conflito de cascata em que o seletor genérico de painéis compactos também redimensionava a Biblioteca para 560 px.
- Biblioteca e Comportamento passam a ter dimensionamento explícito e independente; Biblioteca preserva 900 × 640 px.
- Navegação de pastas recebeu layout horizontal próprio, com estados ativos claros e rolagem horizontal quando necessário.
- Cartões da Biblioteca foram reorganizados em linhas compactas com miniatura, título e conteúdo lado a lado.
- Área de itens, grupos salvos e prévia/configuração recebeu distribuição de espaço mais previsível.
- Em painéis estreitos, a prévia passa abaixo da lista em vez de comprimir as colunas.
- Seletor de cor das Propriedades deixa de ocupar uma área horizontal excessiva sem conteúdo.
- Protótipo HTML revisado incluído em docs/prototypes/editor-ux-1.0.0.19.html.

### Compatibilidade e validação
- Sem alteração no formato dos componentes, IDs, dados salvos ou execução de interações.
- Atualizados testes de regressão para dimensionamento específico, navegação e layout responsivo.
- Necessária confirmação visual/funcional no Foundry VTT 14.

## 1.0.0.18

### Revisão de interface e padronização dos menus
- Reorganizado o editor de Comportamento para reduzir superfícies aninhadas, alinhar controles e dar largura útil ao título das ações.
- Título das ações agora tem layout flexível, quebra de linha segura e ferramentas compactas com ícones e rótulos acessíveis.
- Botões de mover, remover, salvar e excluir fluxos passam a usar ícones compactos com rótulos acessíveis e tooltips.
- Gatilhos, condições e ações utilizam separadores leves em vez de cartões aninhados.
- Campos de condição distribuem a largura priorizando Propriedade; operador e valor mantêm largura legível.
- Estrutura de dados reorganizada visualmente, com navegação plana e campos sem cartões internos redundantes.
- Dimensões dos painéis compactos padronizadas: Propriedades, Organização e Configurações em 560 × 620 px; Estrutura de dados em 620 × 620 px. Biblioteca e Comportamento permanecem em 900 × 640 px.
- Ícones da navegação revistos: Estrutura de dados usa diagrama de relações; Comportamento usa ação/evento.
- Incluído protótipo HTML de referência em docs/prototypes/editor-ux-1.0.0.18.html.

### Compatibilidade e validação
- Mantidos IDs, dados persistidos e modelo de execução dos fluxos.
- Mantida a compatibilidade com fluxos legados de rolagem de perícia.
- Atualizados os testes de estrutura, dimensões e acessibilidade dos controles.
- Necessária validação visual/funcional final no Foundry VTT 14.

## 1.0.0.17

### Padronização de dimensões
- Corrigida a diferença de tamanho entre Comportamento e Biblioteca: ambos agora compartilham a mesma largura e altura (900 × 640 px), inclusive nas regras CSS e na configuração inicial das janelas.
- Propriedades permanece em 420 × 620 px, igual ao painel Camadas.

### Validação
- Testes de regressão atualizados para conferir a geometria compartilhada entre Comportamento e Biblioteca.
- A validação visual no Foundry VTT 14 continua necessária.

## 1.0.0.16

### Editor de Comportamento e Propriedades
- Fluxos do componente passam a ser exibidos em abas pelo nome; somente o fluxo selecionado fica visível, e a seleção permanece após editar seus campos.
- Removido o resumo redundante QUANDO/SE/ENTÃO. Os blocos agora usam os títulos diretos Gatilhos, Condições e Ações.
- Gatilhos reorganizados com rótulo de Evento alinhado ao seletor e botão Remover fora do campo.
- Condições passam a priorizar a largura de Propriedade, mantendo Operador e Valor legíveis e o seletor Todas (E)/Qualquer (OU) em posição dedicada.
- Cartões de ação reorganizados para separar título, ferramentas, tipo/estado e configurações.
- Painel Propriedades reduzido para 420 × 620 px, igual a Camadas; Comportamento recebe dimensões explícitas de 820 × 700 px, como a Biblioteca.

### Validação
- Incluídos testes de regressão para abas de fluxos, remoção do resumo e dimensões dos painéis.
- A execução no Foundry VTT 14 continua necessária para confirmar o comportamento visual e a interação real.

## 1.0.0.15

### Comportamento e interface do editor
- Redimensionado o painel de Comportamento para 820 × 700 px, igual à Biblioteca; o painel de Propriedades permanece em 520 × 760 px.
- Dado um cabeçalho próprio ao seletor de combinação de condições (Todas/E e Qualquer/OU), com largura definida para evitar o controle comprimido.
- Revisada a semântica dos ícones de navegação: Configurações, Propriedades, Biblioteca, Organização, Estrutura de dados e Comportamento agora usam símbolos distintos e coerentes; a barra de Aparência e a categoria Organização seguem o mesmo padrão.
- O modo Configuração da ficha também recebe ícone próprio, sem reutilizar o símbolo de Propriedades.

### Validação
- Atualizados os testes de dimensões, ícones e layout do seletor E/OU.
- A validação automatizada e o teste funcional dentro do Foundry VTT 14 serão executados antes da publicação.

## 1.0.0.14

### Editor de Comportamento
- Reorganizada a criação de fluxos em uma única interface, removendo o seletor redundante Cartões/Lista e o atalho separado de rolagem de perícia.
- Mantidos os tipos de ação e a compatibilidade com fluxos existentes; a rolagem de perícia deixa de ser apresentada como um modelo de fluxo separado.
- Reestruturados os cartões de fluxo, cabeçalhos, gatilhos, condições e ações para aproveitar a largura do painel.
- Separados os controles de expandir, reordenar e remover ações do cabeçalho expansível, evitando botões interativos dentro do elemento de resumo.
- Melhorados alinhamento, espaçamento, tamanhos de campos, áreas clicáveis, foco e comportamento responsivo.
- Preservados foco e posição de rolagem após alterações em campos do fluxo.

### Propriedades e seleção
- Ampliado o painel de Propriedades e aprimorada a grade de controles, com campos e áreas de interação maiores.
- Cliques simples no espaço vazio do Canvas não removem mais a seleção atual.
- A seleção é mantida ao alternar entre Comportamento e Propriedades e é limpa quando ambos os painéis são fechados.
- A seleção por arrasto continua disponível; pequenos movimentos acidentais não limpam a seleção.

### Validação
- Atualizados manifesto, README, changelog e testes para a versão 1.0.0.14.
- Testes automatizados e compatibilidade de interface com Foundry VTT 14 serão verificados no CI; a validação funcional final continua necessária dentro do Foundry.

## 1.0.0.13

### Reorganização do Editor de Fichas
- Movido o editor de fluxos para um painel independente de Comportamento, com dimensões equivalentes às da Biblioteca.
- O painel de Comportamento acompanha a seleção do Canvas e permite editar os fluxos do componente selecionado sem depender do Inspector.
- Removida a aba Comportamento do Inspector; Dados, Aparência e Avançado permanecem no painel de Propriedades.
- Ampliado o espaço interno do editor de fluxos, com gatilhos e condições lado a lado, campos maiores e configurações de ações em duas colunas.
- A seção de gatilhos e condições fica expandida inicialmente para tornar a estrutura do fluxo mais visível.

### Configurações do editor
- Criado um painel independente de Configurações do editor, com navegação lateral própria.
- Transferidas para Configurações > Organização as opções de grade, encaixe, alinhamento inteligente e dimensões da ficha.
- Aparência permanece dedicada a temas, cores, tipografia e personalização visual.
- Mantido o modo existente de edição dos dados do personagem, sem alterar sua finalidade.

### Validação
- Atualizados manifesto, README, changelog e testes para a versão 1.0.0.13.
- As verificações automatizadas serão executadas no CI; a validação visual e funcional em uma instalação real do Foundry VTT 14 continua necessária.

## 1.0.0.11

### Editor híbrido e biblioteca de fluxos
- Reorganizado o editor de interações com resumo QUANDO → SE → ENTÃO, configuração guiada recolhível e cartões de ações expansíveis.
- Mantidas as configurações avançadas disponíveis sem ocupar a interface por padrão; adicionada alternância entre visualização em cartões e lista.
- Adicionado o fluxo pronto de rolagem de perícia, que utiliza a rotina de rolagem existente da ficha e permite selecionar a perícia.
- Adicionada biblioteca pessoal de fluxos, independente do Actor, para salvar, reutilizar e inserir comportamentos em outros componentes.
- A clonagem de fluxos gera novos identificadores para evitar colisões entre instâncias.

### Assets
- Removidas as opções de ajuste que esticavam a imagem ou ignoravam seu enquadramento.
- Padronizada a preservação da proporção como comportamento inicial; a opção de preenchimento pode recortar a imagem sem deformá-la.
- Ajustadas as prévias da Biblioteca e a área de exibição de assets nos componentes.

### Distribuição e validação
- Atualizados manifesto, documentação e verificações para a versão 1.0.0.11 e sua URL de pacote.
- O pacote de distribuição é gerado pelo CI e publicado automaticamente quando as validações passam.
- Testes funcionais em uma instalação real do Foundry VTT 14 continuam necessários; a aprovação do CI não substitui essa validação.

## 1.0.0.10

### Editor visual de interações
- Substituído o seletor rígido de ação por um editor de fluxos no Inspector.
- Cada componente pode possuir vários fluxos independentes.
- Cada fluxo aceita vários Triggers; qualquer Trigger configurado inicia as Actions daquele fluxo.
- Actions podem ser adicionadas, removidas, ativadas/desativadas e reordenadas, com configuração específica por tipo.
- Adicionadas condições por propriedade, com combinação AND/OR e operadores de comparação.
- Definida execução sequencial, com escolha entre interromper ou continuar após falhas.
- Implementados executores controlados para rolagem, cálculo, atualização de propriedade, abertura, alternância, interação encadeada e operações permitidas.
- Adicionados eventos de clique, duplo clique, clique direito, hover, alteração, envio e interação encadeada.
- Mantida a leitura de ações legadas de rolagem e alternância sem exigir migração imediata dos layouts.
- Scripts arbitrários não são avaliados; a ação avançada utiliza uma lista explícita de operações seguras.

### Compatibilidade e validação
- Mantida a separação entre dados, comportamento e aparência dos componentes.
- Adicionados testes de normalização, múltiplos Triggers, condições, ordenação e execução.
- Validação automatizada do pacote executada no CI; teste funcional dentro do Foundry VTT 14 permanece necessário antes de considerar a versão estável.

## 1.0.0.9

### Migração de perícias e propriedades
- A migração consolida os dados de perícias nas chaves técnicas canônicas em inglês e remove as chaves antigas em português somente após preparar o valor canônico no mesmo update do Actor.
- Campos legados `proficiency` e `proficient` são convertidos para `proficientLevel`; o campo canônico já existente é preservado.
- O scanner de propriedades nativas ignora caminhos legados de perícias, impedindo que sejam reapresentados como propriedades genéricas duplicadas.
- A leitura de compatibilidade permanece disponível caso a migração não possa ser concluída; a ficha tenta novamente quando for aberta.

### Interface
- Removidos textos de ajuda, exemplos em placeholders e tooltips instrutivos do template da ficha.
- Mantida a funcionalidade de aliases em fórmulas, sem exibir instruções sobre sua utilização.

### Escopo e validação
- O editor visual completo de Trigger → Actions ainda não faz parte desta atualização; o Inspector antigo permanece temporariamente enquanto a próxima etapa substitui o seletor rígido por configurações contextuais.
- Adicionadas regressões estáticas para a migração canônica, exclusão de caminhos legados e ausência de dicas instrutivas.
- A validação funcional em instalação real do Foundry VTT 14 continua necessária.

## 1.0.0.8

### Propriedades e perícias
- As chaves técnicas das 18 perícias passam a utilizar inglês, mantendo os nomes da interface em português.
- Substituído o booleano persistido de proficiência por `proficientLevel`: zero representa ausência de proficiência, valores positivos representam proficiência e valores negativos aplicam o bônus de proficiência no sentido oposto.
- A migração é aditiva: cria os novos campos nas chaves canônicas e preserva os dados antigos em português e os campos booleanos legados.
- A ficha permite editar o nível numérico de proficiência, incluindo valores negativos.
- Atributos e propriedades numéricas aceitam números negativos; limites só devem ser aplicados quando definidos pela regra ou pela propriedade.

### Interações
- Criado o núcleo de interações baseado em Trigger → Action → Configuration.
- Um trigger pode executar várias ações em sequência, cada uma com sua própria configuração.
- Cliques de componentes passam pelo novo executor, mantendo compatibilidade com ações antigas de rolagem e alternância.
- Documentado o contrato inicial de propriedades, cálculos opcionais e interações em `docs/PROPERTY_AND_INTERACTION_SYSTEM.md`.

### Escopo ainda não concluído
- O editor visual completo para criar triggers e encadear/configurar ações ainda será desenvolvido.
- O PropertyRegistry, o mecanismo de dependências de cálculo e o Roll Dialog universal continuam nas próximas etapas.
- Testes funcionais em uma instalação real do Foundry VTT 14 continuam necessários.

## 1.0.0.8

### Regras-base e ficha
- Adicionados os seis atributos individuais (FOR, DES, SAB, INT, CAR e VON), preservando os três núcleos Corpo, Mente e Alma já existentes.
- Criado catálogo canônico das 18 perícias do Capítulo 7 de REGRAS NEXUS, com suas descrições e atributos associados.
- O grupo de perícias calcula o modificador com atributo relevante e MB somente quando a perícia está marcada como proficiente.
- MB calculado conforme o livro: nível dividido por dois, arredondado para cima, limitado a +5; cards vinculados a combat.mb exibem o valor derivado.
- Cada linha de perícia permite realizar 1d20 + modificador e alternar proficiência binária; as alterações ficam salvas no Actor.

### Qualidade de vida e interação
- Adicionada a ação de card “Alternar visibilidade de outro card”, com referência por ID estável, persistência e suporte a teclado.
- Barras de recursos com ação de slider aceitam clique e arraste diretamente sobre a barra, além do controle deslizante.
- Ajustes de acessibilidade e responsividade para as linhas de perícia, com botões focáveis e rótulos acessíveis.
- Imagens em cards e prévias recebem limites de dimensão e preservação de proporção intrínseca como padrão.
- Mantidos os três núcleos existentes e os layouts antigos; os novos caminhos de atributos e perícias são aditivos.
- Ao abrir uma ficha antiga, campos ausentes dos seis atributos e das 18 perícias são inicializados sem sobrescrever valores existentes.

### Validação
- Atualizados os testes estáticos para o catálogo de 18 perícias, cálculo de proficiência, ações de cards e interação direta com barras.
- A validação dentro do Foundry VTT 14 ainda precisa ser realizada após a instalação.

## 1.0.0.7

### Inspector, ações e fórmulas
- O Inspector agora restaura explicitamente a ação selecionada e o conteúdo de `rollFormula` ao reabrir as propriedades do componente.
- O campo de fórmula aceita até 500 caracteres e compartilha o visualizador de propriedades com o campo de vínculo de dados.
- A lista de sugestões inclui caminhos completos e atalhos de exibição explícitos ou gerados a partir do nome da propriedade (por exemplo, Destreza → `@DES`), omitindo abreviações ambíguas; selecionar uma sugestão insere o token no ponto atual do cursor.
- A expansão de aliases ocorre antes da avaliação do Foundry Roll; aliases de campos próprios também são injetados em uma cópia dos dados de rolagem, sem alterar o Actor nem a fórmula original armazenada.

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


### Propriedades
- Centralizado o registro de propriedades do Actor em `scripts/core/property-schema.js`, alinhado ao livro-base do NEXUS.
- Padronizados caminhos de atributos e perícias com metadados `name`, `exib` e valores numéricos em `value`.
- Convertida a proficiência das perícias para o modelo binário do livro-base.
- Incluídas propriedades derivadas de progressão, recursos, deslocamento, recuperação e capacidade de carga.
- Adicionada migração dos dados antigos, preservando aliases personalizados e normalizando os campos nativos.
- Documentado o contrato em `docs/actor-property-schema.md`.

### Performance
- Separados o viewport do Canvas e os eventos do modo de jogo em módulos leves.
- O editor visual do Canvas agora é importado sob demanda, somente no modo de aparência.
- Adicionadas proteções contra importações atrasadas e limpeza do ciclo de vida de listeners e observers.

## 1.0.0.31

- Otimizado o cálculo de alinhamento do Canvas com busca binária sobre anchors ordenados, preservando a tolerância e os critérios de desempate.
- Reduzidas buscas repetidas de componentes e grupos durante salvamento e atualização da seleção, com índices em memória.
- Otimizada a atualização de cantos conectados, agrupando comparações por grupo e pré-calculando retângulos e cantos.
- Indexadas as superfícies dos grupos para evitar consultas DOM repetidas durante sincronização e seleção.
- Biblioteca passa a ser carregada sob demanda, somente quando o painel é aberto.
- Adicionados testes de regressão para geometria de alinhamento, seleção e carregamento sob demanda.

**Validação:** verificações automatizadas de sintaxe, manifesto, pacote, build Foundry e regressões aprovadas no GitHub Actions. Testes funcionais dentro do Foundry VTT 14 ainda são necessários, especialmente seleção, alinhamento, movimentação, redimensionamento, grupos e salvamento em layouts grandes.

## 1.0.0.30

- Otimizada a preparação da ficha: dados de aliases personalizados são obtidos uma vez e reutilizados durante a montagem do contexto.
- Substituídas buscas repetidas de componentes e grupos por índices em memória (Map e Set), preservando a ordem original e a associação dos componentes aos grupos.
- Otimizadas as atualizações de componentes vinculados, evitando consultas individuais repetidas ao DOM.
- Renderizadores de mídia adaptativa e rich media agora indexam componentes por ID em vez de percorrer a lista para cada elemento.
- Canvas passa a reutilizar a lista de elementos e índices de grupos durante a ativação, reduzindo consultas ao DOM e trabalho repetido nas operações de agrupamento.
- Verificação de cantos conectados é adiada durante o arraste de grupos e recalculada ao término do gesto, reduzindo o trabalho por quadro.

**Validação:** alterações integradas pelo PR #29. A validação funcional e visual em uma instalação real do Foundry VTT 14 permanece necessária; indicadores de cantos conectados durante o arraste são atualizados ao final do gesto.

## 1.0.0.29

- Reorganizado o catálogo de propriedades: Corpo, Mente e Alma são grupos; Força, Destreza, Sabedoria, Inteligência, Carisma e Vontade são as seis propriedades numéricas reais.
- Removidos do catálogo os antigos caminhos escalares `attributes.body`, `attributes.mind` e `attributes.soul`, preservando-os apenas para compatibilidade com fichas e layouts antigos.
- Perícias agora são agrupadas pelo atributo relacionado e expõem somente o modificador total e o nível de proficiência como propriedades principais.
- Proficiência normalizada para três estados: -1, 0 e +1. O estado legado `opposed` é convertido para -1 e removido; níveis antigos fora do intervalo são normalizados.
- Removida a apresentação separada de oposição/deficiência: o próprio valor numérico assinado representa a proficiência.
- Componentes de atributo, listas de caminhos e opções do Inspector alinhados aos seis atributos oficiais.
- Biblioteca e Aparência global agora compartilham o mesmo fluxo de aplicação de tema; mudar o tema atualiza os controles de ambas as áreas sem recriar a ficha.
- Estado da Biblioteca (seção, busca, filtro e rolagem) preservado entre renderizações.

**Validação:** regressões de catálogo, agrupamento, compatibilidade de proficiência e sincronização de temas adicionadas. Pacote automatizado validado; a confirmação visual final ainda depende de teste manual no Foundry VTT 14.

## 1.0.0.28

- Corrigido o visualizador de propriedades: removidos textos duplicados que causavam sobreposição entre nomes, caminhos e setas.
- Navegação por categorias agora mantém o foco no campo de origem, impedindo que o seletor feche ao abrir categorias como Recursos.
- Seleção de propriedades preserva a interação com o campo e dispara a atualização correspondente.
- Preservada a posição de rolagem dos painéis internos durante atualizações e renderizações do editor.
- Ampliados os tokens semânticos dos temas para Canvas, cabeçalhos de janela, botões ativos, superfícies e estados de foco.
- Confirmado que o asset “Indicador – Barra” continua no catálogo da Biblioteca; renderizadores de outros tipos permanecem como suporte extensível ao catálogo.

**Validação:** testes automatizados e validação do pacote no GitHub Actions. Pacote preparado para distribuição no Foundry VTT 14; a confirmação visual final ainda depende de teste manual no Foundry.

## 1.0.0.27

- Corrigida a inicialização de `activateCanvasInteractions`: os elementos raiz e Canvas agora são declarados localmente, evitando `ReferenceError` durante a renderização da ficha.
- Adicionadas regressões de execução para renderizações sem elemento raiz e sem Canvas.
- Atualizada a versão do pacote e o manifesto de download.

**Validação:** verificação de sintaxe JavaScript e testes automatizados do pacote aprovados no GitHub Actions. A validação de interface em uma instalação real do Foundry VTT 14 permanece necessária.

## 1.0.0.26

- Seletor de propriedades passa a navegar por categorias e níveis, com pesquisa global e sugestões progressivas; substitui a lista extensa e o controle de expandir/reduzir.
- Catálogo de propriedades centralizado em módulo próprio, com nomes localizados para atributos, perícias, recursos, combate e identidade.
- Perícias oferecem propriedades calculadas derivadas da regra ativa: modificador, bônus, atributo, proficiência e demais dados expostos por `getNexusSkillRows`.
- Selecionar uma opção no menu flutuante não dispara mais a limpeza global de seleção; o alvo de edição é mantido ao limpar somente a seleção visual.
- Menu fecha ao interagir fora dele e preserva o contexto ao clicar nas próprias opções.
- Tema, padrões de layout, janela flutuante, visualização do seletor, catálogo, ligações de eventos e interações do Canvas foram separados em módulos por responsabilidade, mantendo a ficha como ponto de integração.
- Barra de rolagem do portal do seletor recebe os mesmos tokens visuais das janelas NEXUS; campos focados deixam de ter seus destaques recortados pelo conteúdo do componente.
- Mantido o formato persistido de layouts, componentes, aliases e fluxos.

## Validação

- Verificações automatizadas de sintaxe, manifesto, integridade do pacote e regressões aprovadas no GitHub Actions.
- ZIP de distribuição será publicado como asset da release `v1.0.0.26`, no caminho declarado pelo manifesto.
- Validar no Foundry VTT 14 o seletor em Propriedades, Comportamento, fórmulas e Biblioteca; testar clique fora, seleção de área vazia, navegação hierárquica e propriedades calculadas de perícias.
- Confirmar visualmente os destaques/foco dos campos em componentes com diferentes formatos e dimensões.

## Correções em preparação para 1.0.0.25

- Biblioteca: miniaturas de indicadores e componentes pessoais passam a usar uma área de visualização quadrada independente das dimensões do componente no Canvas.
- Biblioteca: cartões personalizados salvos exibem uma prévia com título e conteúdo, em vez de apenas um glifo genérico.
- Biblioteca: busca e filtro recebem layout responsivo sem sobreposição; as seções Assets, Fluxos e Temas e a separação Padrão NEXUS / Meus itens são mantidas.
- Propriedades: removida a segunda montagem de opções no Inspector. A lista dinâmica passa a ter um único portal e um único fluxo de renderização, sem ser movida entre janelas.
- Propriedades: o mesmo seletor atende campos de vínculo, condições, fórmulas e campos de texto/textarea, incluindo conteúdo de cards personalizados.
- Propriedades: atualização da assinatura também considera aliases de rolagem; o campo proprietário é registrado antes do reposicionamento assíncrono.
- Propriedades: a seleção insere o texto no cursor, mantém o foco e usa uma rolagem padronizada com espaço reservado para a barra.
- Comportamento: após atualizar um campo e reconstruir o editor, o cursor e a seleção de texto são restaurados.
- Mantida a separação entre dados do Actor, configuração dos componentes e apresentação visual.

**Validação pendente:** testes de sintaxe/integração e execução funcional no Foundry VTT 14. Esta alteração ainda não deve ser tratada como release publicada.

## 1.0.0.24

- Biblioteca reorganizada em áreas de Assets, Fluxos e Temas, com separação entre conteúdo padrão e itens pessoais.
- Componentes individuais podem ser salvos e reutilizados pela Biblioteca; grupos mantêm prévias quadradas e independentes da proporção total do Canvas.
- Miniaturas de assets usam uma área quadrada fixa e ajustam o conteúdo interno sem deformar a proporção do componente.
- Biblioteca de Fluxos permite consultar comportamentos salvos e inserir um fluxo no componente selecionado.
- Temas integrados passam a ser apresentados diretamente na área Temas da Biblioteca.
- Busca da Biblioteca consolidada em um único campo, com filtragem entre assets, itens pessoais, fluxos e temas.
- Buscador de propriedades centralizado em uma única lista reutilizada nos painéis; inclui expansão/redução, posicionamento responsivo e atualização de opções.
- Campos de propriedade do editor de Comportamento passam a usar explicitamente o mesmo buscador.
- Fórmulas de rolagem e cálculo aceitam sugestões `{{propriedade}}`, resolvidas como referências de dados antes da avaliação da fórmula.
- CSS final padroniza miniaturas, cartões pessoais, fluxos, abas, busca e lista de propriedades, reduzindo conflitos de regras anteriores.

## 1.0.0.22

- Reconstrução do renderizador do editor de comportamento, preservando o motor e os dados dos fluxos existentes.
- Gatilhos e condições passam a usar cartões alinhados e consistentes; condições oferecem sugestões dos caminhos encontrados no ator via datalist, mantendo edição manual.
- Ações reorganizadas em cabeçalho compacto com título, ativação e ferramentas alinhados; configurações em coluna única.
- Biblioteca recupera miniaturas maiores e cartões verticais; composições personalizadas recebem área de prévia ampliada.
- Ajustes responsivos e testes de regressão para a nova estrutura.

## 1.0.0.21

- Remove legendas visuais redundantes de Propriedade, Operador e Valor nas condições, mantendo nomes acessíveis.
- Consolida a lista de ações em uma única coluna e organiza controles e configurações em linhas previsíveis.
- Reorganiza Aparência global com alinhamento consistente entre rótulos, seletores e color pickers.
- Padroniza as dimensões finais dos painéis compactos (400 × 600) e amplos (900 × 600).

## 1.0.0.20

### Editor de fluxos e sistema visual
- Painéis compactos padronizados em 400 × 600 px; Biblioteca e Comportamento em 900 × 600 px.
- Removido o cabeçalho redundante do painel Comportamento; o editor de fluxos assume a identificação e a navegação.
- Título, abas de fluxos, criação e inserção de modelos foram reunidos em uma única área de navegação.
- Removidas contagens auxiliares e legendas redundantes; nome do fluxo passa a usar campo direto com nome acessível.
- Gatilhos usam seletor direto sem a legenda "Evento".
- Condições passam a ser exibidas em blocos de superfície, com seletor E/OU integrado ao cabeçalho e colunas dedicadas para propriedade, operador, valor e remoção.
- Estado Ativa foi movido para a linha de identificação da ação; tipo e configurações permanecem abaixo.
- Mantida a estrutura persistida dos fluxos, IDs, ações e compatibilidade com interações existentes.

### Temas, cores e controles
- Ampliados os tokens semânticos para superfícies, bordas, texto, foco, campos, botões, estados e barras de rolagem.
- Cabeçalhos, conteúdo das janelas, campos, botões, foco e rolagem passam a consumir os mesmos papéis de tema.
- Paletas de tema continuam definidas centralmente; alternar tema atualiza os tokens de todos os painéis abertos.
- Color pickers reorganizados em linhas consistentes com rótulo e seletor de largura útil.
- Estados de foco visíveis, controles desativados e hover padronizados.

### Referências de design e validação
- Aplicados princípios de Fluent 2 para papéis de cor, estados semânticos e uso moderado de cores de destaque.
- Aplicados princípios do Atlassian Design System para tokens, escala de espaçamento, proximidade e hierarquia visual.
- Testes de regressão atualizados para dimensões, editor, temas e distribuição de color pickers.
- Necessária confirmação visual e funcional em instalação real do Foundry VTT 14.

## 1.0.0.19

### Correção da Biblioteca e distribuição de espaço
- Corrigido conflito de cascata em que o seletor genérico de painéis compactos também redimensionava a Biblioteca para 560 px.
- Biblioteca e Comportamento passam a ter dimensionamento explícito e independente; Biblioteca preserva 900 × 640 px.
- Navegação de pastas recebeu layout horizontal próprio, com estados ativos claros e rolagem horizontal quando necessário.
- Cartões da Biblioteca foram reorganizados em linhas compactas com miniatura, título e conteúdo lado a lado.
- Área de itens, grupos salvos e prévia/configuração recebeu distribuição de espaço mais previsível.
- Em painéis estreitos, a prévia passa abaixo da lista em vez de comprimir as colunas.
- Seletor de cor das Propriedades deixa de ocupar uma área horizontal excessiva sem conteúdo.
- Protótipo HTML revisado incluído em docs/prototypes/editor-ux-1.0.0.19.html.

### Compatibilidade e validação
- Sem alteração no formato dos componentes, IDs, dados salvos ou execução de interações.
- Atualizados testes de regressão para dimensionamento específico, navegação e layout responsivo.
- Necessária confirmação visual/funcional no Foundry VTT 14.

## 1.0.0.18

### Revisão de interface e padronização dos menus
- Reorganizado o editor de Comportamento para reduzir superfícies aninhadas, alinhar controles e dar largura útil ao título das ações.
- Título das ações agora tem layout flexível, quebra de linha segura e ferramentas compactas com ícones e rótulos acessíveis.
- Botões de mover, remover, salvar e excluir fluxos passam a usar ícones compactos com rótulos acessíveis e tooltips.
- Gatilhos, condições e ações utilizam separadores leves em vez de cartões aninhados.
- Campos de condição distribuem a largura priorizando Propriedade; operador e valor mantêm largura legível.
- Estrutura de dados reorganizada visualmente, com navegação plana e campos sem cartões internos redundantes.
- Dimensões dos painéis compactos padronizadas: Propriedades, Organização e Configurações em 560 × 620 px; Estrutura de dados em 620 × 620 px. Biblioteca e Comportamento permanecem em 900 × 640 px.
- Ícones da navegação revistos: Estrutura de dados usa diagrama de relações; Comportamento usa ação/evento.
- Incluído protótipo HTML de referência em docs/prototypes/editor-ux-1.0.0.18.html.

### Compatibilidade e validação
- Mantidos IDs, dados persistidos e modelo de execução dos fluxos.
- Mantida a compatibilidade com fluxos legados de rolagem de perícia.
- Atualizados os testes de estrutura, dimensões e acessibilidade dos controles.
- Necessária validação visual/funcional final no Foundry VTT 14.

## 1.0.0.17

### Padronização de dimensões
- Corrigida a diferença de tamanho entre Comportamento e Biblioteca: ambos agora compartilham a mesma largura e altura (900 × 640 px), inclusive nas regras CSS e na configuração inicial das janelas.
- Propriedades permanece em 420 × 620 px, igual ao painel Camadas.

### Validação
- Testes de regressão atualizados para conferir a geometria compartilhada entre Comportamento e Biblioteca.
- A validação visual no Foundry VTT 14 continua necessária.

## 1.0.0.16

### Editor de Comportamento e Propriedades
- Fluxos do componente passam a ser exibidos em abas pelo nome; somente o fluxo selecionado fica visível, e a seleção permanece após editar seus campos.
- Removido o resumo redundante QUANDO/SE/ENTÃO. Os blocos agora usam os títulos diretos Gatilhos, Condições e Ações.
- Gatilhos reorganizados com rótulo de Evento alinhado ao seletor e botão Remover fora do campo.
- Condições passam a priorizar a largura de Propriedade, mantendo Operador e Valor legíveis e o seletor Todas (E)/Qualquer (OU) em posição dedicada.
- Cartões de ação reorganizados para separar título, ferramentas, tipo/estado e configurações.
- Painel Propriedades reduzido para 420 × 620 px, igual a Camadas; Comportamento recebe dimensões explícitas de 820 × 700 px, como a Biblioteca.

### Validação
- Incluídos testes de regressão para abas de fluxos, remoção do resumo e dimensões dos painéis.
- A execução no Foundry VTT 14 continua necessária para confirmar o comportamento visual e a interação real.

## 1.0.0.15

### Comportamento e interface do editor
- Redimensionado o painel de Comportamento para 820 × 700 px, igual à Biblioteca; o painel de Propriedades permanece em 520 × 760 px.
- Dado um cabeçalho próprio ao seletor de combinação de condições (Todas/E e Qualquer/OU), com largura definida para evitar o controle comprimido.
- Revisada a semântica dos ícones de navegação: Configurações, Propriedades, Biblioteca, Organização, Estrutura de dados e Comportamento agora usam símbolos distintos e coerentes; a barra de Aparência e a categoria Organização seguem o mesmo padrão.
- O modo Configuração da ficha também recebe ícone próprio, sem reutilizar o símbolo de Propriedades.

### Validação
- Atualizados os testes de dimensões, ícones e layout do seletor E/OU.
- A validação automatizada e o teste funcional dentro do Foundry VTT 14 serão executados antes da publicação.

## 1.0.0.14

### Editor de Comportamento
- Reorganizada a criação de fluxos em uma única interface, removendo o seletor redundante Cartões/Lista e o atalho separado de rolagem de perícia.
- Mantidos os tipos de ação e a compatibilidade com fluxos existentes; a rolagem de perícia deixa de ser apresentada como um modelo de fluxo separado.
- Reestruturados os cartões de fluxo, cabeçalhos, gatilhos, condições e ações para aproveitar a largura do painel.
- Separados os controles de expandir, reordenar e remover ações do cabeçalho expansível, evitando botões interativos dentro do elemento de resumo.
- Melhorados alinhamento, espaçamento, tamanhos de campos, áreas clicáveis, foco e comportamento responsivo.
- Preservados foco e posição de rolagem após alterações em campos do fluxo.

### Propriedades e seleção
- Ampliado o painel de Propriedades e aprimorada a grade de controles, com campos e áreas de interação maiores.
- Cliques simples no espaço vazio do Canvas não removem mais a seleção atual.
- A seleção é mantida ao alternar entre Comportamento e Propriedades e é limpa quando ambos os painéis são fechados.
- A seleção por arrasto continua disponível; pequenos movimentos acidentais não limpam a seleção.

### Validação
- Atualizados manifesto, README, changelog e testes para a versão 1.0.0.14.
- Testes automatizados e compatibilidade de interface com Foundry VTT 14 serão verificados no CI; a validação funcional final continua necessária dentro do Foundry.

## 1.0.0.13

### Reorganização do Editor de Fichas
- Movido o editor de fluxos para um painel independente de Comportamento, com dimensões equivalentes às da Biblioteca.
- O painel de Comportamento acompanha a seleção do Canvas e permite editar os fluxos do componente selecionado sem depender do Inspector.
- Removida a aba Comportamento do Inspector; Dados, Aparência e Avançado permanecem no painel de Propriedades.
- Ampliado o espaço interno do editor de fluxos, com gatilhos e condições lado a lado, campos maiores e configurações de ações em duas colunas.
- A seção de gatilhos e condições fica expandida inicialmente para tornar a estrutura do fluxo mais visível.

### Configurações do editor
- Criado um painel independente de Configurações do editor, com navegação lateral própria.
- Transferidas para Configurações > Organização as opções de grade, encaixe, alinhamento inteligente e dimensões da ficha.
- Aparência permanece dedicada a temas, cores, tipografia e personalização visual.
- Mantido o modo existente de edição dos dados do personagem, sem alterar sua finalidade.

### Validação
- Atualizados manifesto, README, changelog e testes para a versão 1.0.0.13.
- As verificações automatizadas serão executadas no CI; a validação visual e funcional em uma instalação real do Foundry VTT 14 continua necessária.

## 1.0.0.11

### Editor híbrido e biblioteca de fluxos
- Reorganizado o editor de interações com resumo QUANDO → SE → ENTÃO, configuração guiada recolhível e cartões de ações expansíveis.
- Mantidas as configurações avançadas disponíveis sem ocupar a interface por padrão; adicionada alternância entre visualização em cartões e lista.
- Adicionado o fluxo pronto de rolagem de perícia, que utiliza a rotina de rolagem existente da ficha e permite selecionar a perícia.
- Adicionada biblioteca pessoal de fluxos, independente do Actor, para salvar, reutilizar e inserir comportamentos em outros componentes.
- A clonagem de fluxos gera novos identificadores para evitar colisões entre instâncias.

### Assets
- Removidas as opções de ajuste que esticavam a imagem ou ignoravam seu enquadramento.
- Padronizada a preservação da proporção como comportamento inicial; a opção de preenchimento pode recortar a imagem sem deformá-la.
- Ajustadas as prévias da Biblioteca e a área de exibição de assets nos componentes.

### Distribuição e validação
- Atualizados manifesto, documentação e verificações para a versão 1.0.0.11 e sua URL de pacote.
- O pacote de distribuição é gerado pelo CI e publicado automaticamente quando as validações passam.
- Testes funcionais em uma instalação real do Foundry VTT 14 continuam necessários; a aprovação do CI não substitui essa validação.

## 1.0.0.10

### Editor visual de interações
- Substituído o seletor rígido de ação por um editor de fluxos no Inspector.
- Cada componente pode possuir vários fluxos independentes.
- Cada fluxo aceita vários Triggers; qualquer Trigger configurado inicia as Actions daquele fluxo.
- Actions podem ser adicionadas, removidas, ativadas/desativadas e reordenadas, com configuração específica por tipo.
- Adicionadas condições por propriedade, com combinação AND/OR e operadores de comparação.
- Definida execução sequencial, com escolha entre interromper ou continuar após falhas.
- Implementados executores controlados para rolagem, cálculo, atualização de propriedade, abertura, alternância, interação encadeada e operações permitidas.
- Adicionados eventos de clique, duplo clique, clique direito, hover, alteração, envio e interação encadeada.
- Mantida a leitura de ações legadas de rolagem e alternância sem exigir migração imediata dos layouts.
- Scripts arbitrários não são avaliados; a ação avançada utiliza uma lista explícita de operações seguras.

### Compatibilidade e validação
- Mantida a separação entre dados, comportamento e aparência dos componentes.
- Adicionados testes de normalização, múltiplos Triggers, condições, ordenação e execução.
- Validação automatizada do pacote executada no CI; teste funcional dentro do Foundry VTT 14 permanece necessário antes de considerar a versão estável.

## 1.0.0.9

### Migração de perícias e propriedades
- A migração consolida os dados de perícias nas chaves técnicas canônicas em inglês e remove as chaves antigas em português somente após preparar o valor canônico no mesmo update do Actor.
- Campos legados `proficiency` e `proficient` são convertidos para `proficientLevel`; o campo canônico já existente é preservado.
- O scanner de propriedades nativas ignora caminhos legados de perícias, impedindo que sejam reapresentados como propriedades genéricas duplicadas.
- A leitura de compatibilidade permanece disponível caso a migração não possa ser concluída; a ficha tenta novamente quando for aberta.

### Interface
- Removidos textos de ajuda, exemplos em placeholders e tooltips instrutivos do template da ficha.
- Mantida a funcionalidade de aliases em fórmulas, sem exibir instruções sobre sua utilização.

### Escopo e validação
- O editor visual completo de Trigger → Actions ainda não faz parte desta atualização; o Inspector antigo permanece temporariamente enquanto a próxima etapa substitui o seletor rígido por configurações contextuais.
- Adicionadas regressões estáticas para a migração canônica, exclusão de caminhos legados e ausência de dicas instrutivas.
- A validação funcional em instalação real do Foundry VTT 14 continua necessária.

## 1.0.0.8

### Propriedades e perícias
- As chaves técnicas das 18 perícias passam a utilizar inglês, mantendo os nomes da interface em português.
- Substituído o booleano persistido de proficiência por `proficientLevel`: zero representa ausência de proficiência, valores positivos representam proficiência e valores negativos aplicam o bônus de proficiência no sentido oposto.
- A migração é aditiva: cria os novos campos nas chaves canônicas e preserva os dados antigos em português e os campos booleanos legados.
- A ficha permite editar o nível numérico de proficiência, incluindo valores negativos.
- Atributos e propriedades numéricas aceitam números negativos; limites só devem ser aplicados quando definidos pela regra ou pela propriedade.

### Interações
- Criado o núcleo de interações baseado em Trigger → Action → Configuration.
- Um trigger pode executar várias ações em sequência, cada uma com sua própria configuração.
- Cliques de componentes passam pelo novo executor, mantendo compatibilidade com ações antigas de rolagem e alternância.
- Documentado o contrato inicial de propriedades, cálculos opcionais e interações em `docs/PROPERTY_AND_INTERACTION_SYSTEM.md`.

### Escopo ainda não concluído
- O editor visual completo para criar triggers e encadear/configurar ações ainda será desenvolvido.
- O PropertyRegistry, o mecanismo de dependências de cálculo e o Roll Dialog universal continuam nas próximas etapas.
- Testes funcionais em uma instalação real do Foundry VTT 14 continuam necessários.

## 1.0.0.8

### Regras-base e ficha
- Adicionados os seis atributos individuais (FOR, DES, SAB, INT, CAR e VON), preservando os três núcleos Corpo, Mente e Alma já existentes.
- Criado catálogo canônico das 18 perícias do Capítulo 7 de REGRAS NEXUS, com suas descrições e atributos associados.
- O grupo de perícias calcula o modificador com atributo relevante e MB somente quando a perícia está marcada como proficiente.
- MB calculado conforme o livro: nível dividido por dois, arredondado para cima, limitado a +5; cards vinculados a combat.mb exibem o valor derivado.
- Cada linha de perícia permite realizar 1d20 + modificador e alternar proficiência binária; as alterações ficam salvas no Actor.

### Qualidade de vida e interação
- Adicionada a ação de card “Alternar visibilidade de outro card”, com referência por ID estável, persistência e suporte a teclado.
- Barras de recursos com ação de slider aceitam clique e arraste diretamente sobre a barra, além do controle deslizante.
- Ajustes de acessibilidade e responsividade para as linhas de perícia, com botões focáveis e rótulos acessíveis.
- Imagens em cards e prévias recebem limites de dimensão e preservação de proporção intrínseca como padrão.
- Mantidos os três núcleos existentes e os layouts antigos; os novos caminhos de atributos e perícias são aditivos.
- Ao abrir uma ficha antiga, campos ausentes dos seis atributos e das 18 perícias são inicializados sem sobrescrever valores existentes.

### Validação
- Atualizados os testes estáticos para o catálogo de 18 perícias, cálculo de proficiência, ações de cards e interação direta com barras.
- A validação dentro do Foundry VTT 14 ainda precisa ser realizada após a instalação.

## 1.0.0.7

### Inspector, ações e fórmulas
- O Inspector agora restaura explicitamente a ação selecionada e o conteúdo de `rollFormula` ao reabrir as propriedades do componente.
- O campo de fórmula aceita até 500 caracteres e compartilha o visualizador de propriedades com o campo de vínculo de dados.
- A lista de sugestões inclui caminhos completos e atalhos de exibição explícitos ou gerados a partir do nome da propriedade (por exemplo, Destreza → `@DES`), omitindo abreviações ambíguas; selecionar uma sugestão insere o token no ponto atual do cursor.
- A expansão de aliases ocorre antes da avaliação do Foundry Roll; aliases de campos próprios também são injetados em uma cópia dos dados de rolagem, sem alterar o Actor nem a fórmula original armazenada.

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
