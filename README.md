# NEXUS RPG

<p align="center">
  <strong>Uma base modular para fichas de RPG no Foundry Virtual Tabletop.</strong><br>
  Projeto em desenvolvimento · Versão 1.0.0.101 · Manifesto estável 1.0.0.100 · Foundry VTT 14
</p>

<p align="center">
  <img alt="Versão" src="https://img.shields.io/badge/vers%C3%A3o-1.0.0.101-6750A4">
  <img alt="Foundry VTT" src="https://img.shields.io/badge/Foundry%20VTT-v14-orange">
  <img alt="Idioma" src="https://img.shields.io/badge/idioma-pt--BR-009739">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-blue">
</p>

O **NEXUS** é um projeto de RPG que também busca oferecer uma experiência flexível de criação e utilização de fichas. Este repositório contém a implementação do sistema para **Foundry VTT**, com foco atual em uma ficha Canvas modular, componentes configuráveis e uma biblioteca de elementos.

**Distribuição:** o manifesto original `manifest.json` é a única fonte de instalação e atualização. O workflow só o atualiza depois de validar o pacote e confirmar o `nexus.zip` na release correspondente. A validação funcional e visual no Foundry VTT 14 build 360 continua pendente; o último checkpoint funcional confirmado permanece na 1.0.0.70.

**Distribuição atual:** Versão 1.0.0.100 permanece no manifesto estável. O GitHub Release 1.0.0.101 foi publicado pelo workflow, mas a validação visual/funcional no Foundry 14 build 360 ainda está pendente; não trate a release .101 como checkpoint funcional confirmado.

## Visão geral

A proposta de longo prazo é separar três responsabilidades:

- **Regras e módulos:** definem atributos, recursos, propriedades e comportamentos de cada experiência de RPG.
- **Ficha e componentes:** determinam como os dados são apresentados e organizados na interface.
- **Estilo e mídia:** controlam a aparência e os recursos visuais sem precisar alterar as mecânicas.

Essa separação orienta o planejamento do projeto. Nem todos esses recursos estão implementados na versão atual; consulte [Visão do projeto](docs/PROJECT_OVERVIEW.md) e [Roadmap](docs/ROADMAP.md).

## Implementação atual na main — 1.0.0.99

A base 1.0.0.99 consolida a restauração dos trilhos flutuantes e das janelas ApplicationV2 independentes do editor da ficha, preserva a tipografia nativa dos ícones do Foundry e refina o Estúdio de Aparência. A validação visual e funcional no Foundry VTT 14 build 360 permanece pendente. A implementação atual na `main` inclui ficha Canvas, componentes configuráveis, grupos hierárquicos, Biblioteca Universal com Explorer e Inspector, armazenamento unificado, infraestrutura inicial de Lógica e Mídia e o Design System global com Estúdio de Aparência. As melhorias consolidadas nesta build também incluem a organização hierárquica das pastas da Biblioteca e a normalização das dimensões de componentes em uma grade de 10 px. O estado exato e as limitações estão descritos em [Visão do projeto](docs/PROJECT_OVERVIEW.md) e [Roadmap](docs/ROADMAP.md).

Recursos presentes no código incluem:

- Registro de Actors `player-character`, `npc` e `character` e seus templates/fichas.
- Componentes configuráveis, propriedades vinculadas, expressões seguras e persistência de layouts.
- Grupos estruturais e operações de composição no Canvas.
- Biblioteca com coleções, preferências, filtros, Inspector e separação entre definições e instâncias.
- Infraestrutura tipada para Propriedades, Regras, Comportamentos, Fluxos e Funções.
- Infraestrutura de mídia com capabilities, pipeline, Workers, upload Foundry e cache local.

A existência de infraestrutura não significa que todos os editores, executores, decodificadores ou integrações estejam concluídos. Consulte as limitações registradas antes de tratar uma área como pronta para uso.

## Compatibilidade

| Requisito | Versão |
|---|---|
| Foundry Virtual Tabletop | V14 |
| Build atual da main | 1.0.0.99 |
| Idioma incluído | Português (Brasil) |

A compatibilidade declarada em `system.json` é Foundry VTT 14, build 360. A base 1.0.0.99 inclui os refinamentos do editor flutuante e do Design System descritos neste documento. A validação visual e funcional no cliente Foundry VTT 14 build 360 continua pendente. Não presuma compatibilidade com versões anteriores ou posteriores sem validação específica.

## Instalação

### Instalação manual

1. Abra [Releases do NEXUS RPG](https://github.com/yottastrofficial-boop/Nexus/releases).
2. Baixe o arquivo `nexus.zip` da versão desejada (não use o ZIP automático de **Code → Download ZIP**, que contém o repositório-fonte).
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
https://raw.githubusercontent.com/yottastrofficial-boop/Nexus/main/manifest.json
```

Use o endereço do `manifest.json` acima como manifesto de instalação e atualização. Ele funciona como canal estável: o fluxo de publicação só o atualiza depois de confirmar que `nexus.zip` está anexado e disponível na Release correspondente. O `system.json` dentro do pacote continua sendo o manifesto que o Foundry carrega. Se uma instalação antiga estiver cadastrada diretamente pelo endereço de `system.json`, substitua a origem pelo endereço estável acima para receber as próximas atualizações sem a janela entre a atualização do manifesto e o envio do ZIP.

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
├── manifest.json      # Canal estável de instalação e atualização
└── system.json        # Manifesto incluído no pacote Foundry
```

## Documentação

- [Visão do projeto e arquitetura](docs/PROJECT_OVERVIEW.md)
- [Arquitetura técnica e plano de refatoração](docs/ARCHITECTURE.md)
- [Política de versões e estabilidade](docs/RELEASE_STABILITY_POLICY.md)
- [Auditoria de branches](docs/BRANCH_AUDIT_2026-11-23.md)
- [Contrato de propriedades e interações](docs/PROPERTY_AND_INTERACTION_SYSTEM.md)
- [Roadmap e funcionalidades planejadas](docs/ROADMAP.md)
- [Como contribuir](CONTRIBUTING.md)
- [Histórico de alterações](CHANGELOG.md)
- [Documentação da biblioteca](assets/library/README.md)

## Interações de componentes

O painel Comportamento oferece um editor de fluxos Trigger → Conditions → Actions. Um componente pode ter vários fluxos independentes; cada fluxo aceita múltiplos Triggers, condições AND/OR e Actions configuráveis e reordenáveis. A execução é sequencial e oferece política de erro. Ações antigas de rolagem e alternância continuam legíveis. Consulte [o contrato de propriedades e interações](docs/PROPERTY_AND_INTERACTION_SYSTEM.md).

## Uso dos grupos e da Biblioteca

- **Agrupar grupos existentes:** abra a árvore de camadas e use Ctrl+clique (Cmd no macOS) ou Shift+clique em cada grupo. Também é possível usar Ctrl/Cmd+clique em uma área livre da superfície do grupo no Canvas.
- **Criar o grupo pai:** com os grupos selecionados, use a ação **Agrupar seleção**. Os grupos selecionados passam a ser filhos do novo grupo; seus componentes não são desmontados.
- **Criar grupos em vários níveis:** selecione componentes e/ou grupos completos e use **Agrupar seleção** para criar um grupo pai. Para mover um grupo já existente para dentro de outro, selecione-o e escolha o **Grupo superior** no Inspector.
- **Nomear e organizar:** selecione o grupo e edite seu nome no Inspector. A árvore de camadas reflete a hierarquia e permite recolher os níveis.
- **Salvar na Biblioteca:** selecione o grupo pela árvore de camadas, abra **Meus componentes** e use a área **Composições** para salvar a seleção. O botão do Inspector do grupo continua disponível.
- **Compartilhar componentes:** selecione um componente salvo em Meus Componentes e use **Copiar pacote** ou **Exportar JSON**.
- **Compartilhar grupos e layouts:** selecione a composição salva e use as ações de copiar ou exportar pacote.
- **Importar:** use **Importar pacote** para colar um código ou **Importar pacote JSON** para selecionar um arquivo. O formato unificado reconhece componentes, grupos hierárquicos e layouts, mantendo compatibilidade com os formatos antigos.

Os pacotes são JSON versionado e preservam configurações e referências internas como dados. Ao inserir uma composição, o NEXUS cria novos IDs e remapeia as referências sem sobrescrever o layout atual.

## Estado e validação

A versão de código da `main` é **1.0.0.99**; o manifesto original é sincronizado pelo workflow somente após a confirmação do pacote publicado. A validação automatizada não substitui a validação funcional no Foundry VTT 14 build 360. A última versão funcionalmente confirmada continua sendo a 1.0.0.70.

O último checkpoint funcional confirmado no Foundry permanece **1.0.0.70**, conforme a [política de estabilidade](docs/RELEASE_STABILITY_POLICY.md). Isso não significa que as versões posteriores estejam necessariamente defeituosas; significa que ainda falta evidência documentada para promovê-las a checkpoint funcional.

Antes de uma release ser considerada estável, validar instalação limpa e atualização, criação/abertura/edição de Actors, persistência, múltiplas janelas, tokens, Biblioteca, grupos, Lógica, Mídia e migrações aplicáveis. Registrar ambiente, resultados e erros encontrados.

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


## Composição universal de grupos

Hierarquia (quem pertence a quem), layout (como os filhos são posicionados) e apresentação (como a superfície aparece) são responsabilidades separadas.

- **Pasta:** agrupamento organizacional sem superfície preenchida.
- **Container:** superfície visual compartilhada.
- **Seção:** container com cabeçalho e título.
- **Layouts:** Livre, Horizontal, Vertical e Grade.
- **Ajustes:** espaçamento, margem interna, número de colunas e alinhamento.
- **Compatibilidade:** grupos existentes continuam em layout Livre e preservam suas coordenadas.
- **Hierarquia:** grupos pais sem componentes diretos são preservados quando possuem subgrupos descendentes.

O layout automático organiza componentes filhos sem redimensioná-los. Grupos em modo Livre mantêm suas posições individuais.
