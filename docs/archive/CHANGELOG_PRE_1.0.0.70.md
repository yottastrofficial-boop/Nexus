# Histórico do NEXUS — versões anteriores à 1.0.0.70

Este arquivo preserva integralmente as entradas antigas que antes ocupavam o `CHANGELOG.md` principal. Foi separado apenas para reduzir o ruído na leitura cotidiana; não representa exclusão do histórico do projeto.

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


### Distribuição
- Publicação do pacote Foundry `nexus.zip` automatizada pelo GitHub Actions após a validação do pacote.
- O arquivo de distribuição contém `system.json` na raiz e é anexado à Release correspondente à versão do manifesto.
- A instalação manual deve utilizar o asset `nexus.zip` da Release, e não o ZIP automático do repositório-fonte.

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
