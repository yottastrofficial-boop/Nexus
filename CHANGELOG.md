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

