## 1.0.0.65

### Editor de comportamentos
- Corrigida a injeção de `getTriggeredActions` nos listeners da ficha. O erro interrompia a atualização do editor depois de salvar uma alteração e impedia a verificação dos gatilhos do componente.
- Adicionada captura direta de teclas para gatilhos `keyDown` e `keyUp`, registrando a tecla e os modificadores pressionados em uma única ação.
- A captura ignora teclas modificadoras isoladas e pode ser cancelada com Escape; não mantém o teclado em modo de captura depois de registrar uma combinação.
- Ao trocar um gatilho de teclado por outro tipo de evento, a tecla capturada é limpa para não bloquear o novo evento.
- A execução no modo de jogo agora compara a tecla capturada e os modificadores configurados.
- Eventos de foco, perda de foco, alteração e interação continuam disponíveis como tipos de gatilho independentes.

### Canvas e Inspector
- Grupos recebem uma alça de título clicável, permitindo selecioná-los e abrir suas propriedades sem depender de encontrar uma área vazia dentro do grupo.
- O nome da propriedade vinculada passa a aparecer como indicador discreto abaixo do campo de caminho.
- Ajustado o espaçamento dos gatilhos para acomodar o botão de captura somente quando o tipo selecionado é de teclado.

### Validação e limites
- A versão utiliza o fluxo automatizado de validação e publicação do pacote Foundry. A suíte também foi ajustada para não depender de uma versão histórica específica do changelog.
- Incluídos testes de regressão para a dependência ausente, captura e comparação de teclas, modificadores, indicador de propriedade e seleção de grupo. As expectativas documentais antigas foram generalizadas para não bloquear versões futuras. A suíte foi simplificada para não exigir descrições históricas que não pertencem à versão atual.
- Grupos aninhados e modelos completos de layout compartilháveis ainda exigem uma evolução estrutural do formato de grupos e da Biblioteca; não foram simulados nesta versão para evitar perda ou corrupção de layouts existentes.
- A validação automatizada não substitui o teste funcional no Foundry VTT 14.

# NEXUS RPG

<p align="center">
  <strong>Uma base modular para fichas de RPG no Foundry Virtual Tabletop.</strong><br>
  Projeto em desenvolvimento · Versão 1.0.0.65 · Foundry VTT 14
</p>

<p align="center">
  <img alt="Versão" src="https://img.shields.io/badge/vers%C3%A3o-1.0.0.65-6750A4">
  <img alt="Foundry VTT" src="https://img.shields.io/badge/Foundry%20VTT-v14-orange">
  <img alt="Idioma" src="https://img.shields.io/badge/idioma-pt--BR-009739">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-blue">
</p>

O **NEXUS** é um projeto de RPG que também busca oferecer uma experiência flexível de criação e utilização de fichas. Este repositório contém a implementação do sistema para **Foundry VTT**, com foco atual em uma ficha Canvas modular, componentes configuráveis e uma biblioteca de elementos.

> **Versão atual:** 1.0.0.65. Corrige a injeção do avaliador de gatilhos, adiciona captura direta de atalhos de teclado, melhora a seleção de grupos e compacta o indicador de propriedade. A validação automatizada não substitui o teste funcional no Foundry VTT 14. A validação automatizada não substitui o teste funcional no Foundry VTT 14.

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
| Versão atual | 1.0.0.65 |
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

A versão 1.0.0.65 reduz consultas repetidas ao DOM durante atualizações reativas de texto, agrupa ajustes de escala do Canvas em um único frame e respeita a preferência de movimento reduzido. O pacote é validado pelo CI; testes funcionais e visuais em uma instalação real do Foundry VTT 14 continuam necessários.

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
