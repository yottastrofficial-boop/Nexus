# Visão do projeto

## O que é o NEXUS

NEXUS é um projeto de RPG com uma implementação para Foundry Virtual Tabletop. A direção arquitetural de longo prazo é oferecer uma base modular na qual diferentes módulos possam definir suas próprias propriedades, regras e conteúdos, enquanto a ficha apresenta essas informações de forma configurável.

Este documento descreve a intenção arquitetural e a separa do que está comprovadamente presente no base 1.0.0.1, em atualização para 1.0.0.2.

## Três camadas conceituais

### 1. Regras e módulos

Um módulo poderá definir propriedades, atributos, recursos, cálculos e comportamentos próprios. A arquitetura planejada não deve presumir que todos os jogos utilizam o mesmo conjunto universal de regras.

Os documentos mecânicos oficiais do NEXUS RPG continuam sendo a referência para as regras de mesa. Este repositório trata da implementação Foundry e não substitui esses documentos.

### 2. Ficha e componentes

A ficha deverá permitir organizar informações por meio de componentes. A intenção é que a apresentação não imponha uma disposição única e rígida para todas as experiências.

A base 1.0.0.1 já contém uma ficha Canvas e uma biblioteca de elementos. Um editor visual completo, criação avançada de componentes e gerenciamento abrangente de modelos permanecem fora do escopo confirmado desta versão.

### 3. Estilo e mídia

A direção planejada separa a função de um componente, sua forma de representação e sua aparência. Também prevê uma biblioteca de mídia e mecanismos de otimização.

A base 1.0.0.1 já inclui recursos de personalização visual e prévia de determinados tipos de mídia. Isso não significa que toda a infraestrutura futura de mídia, cache, carregamento sob demanda ou animações esteja concluída.

## Implementação herdada da versão 1.0.0.1

A implementação está concentrada em:

- Inicialização do sistema e registro da ficha no Foundry.
- Tipos de Actor e Item declarados em `system.json`.
- Ficha Canvas e seus componentes.
- Catálogo da Biblioteca.
- Estilos e templates.
- Tradução pt-BR.

### Organização técnica

| Caminho | Responsabilidade |
|---|---|
| `system.json` | Metadados, compatibilidade, documentos e arquivos carregados pelo Foundry |
| `scripts/nexus-v1.0.0.js` | Inicialização e registro da ficha |\n| `scripts/core/` | Serviços centrais extraídos incrementalmente; atualmente inclui migrações legadas |
| `scripts/sheets/` | Lógica da ficha |
| `templates/actors/` | Estrutura Handlebars |
| `styles/` | Aparência e layout |
| `assets/library/catalog.js` | Catálogo de elementos da Biblioteca |
| `lang/` | Traduções |
| `docs/` | Documentação do projeto |

A primeira extração para `scripts/core/` é `migration-manager.js`, responsável por migrações persistentes de compatibilidade. A classe da ficha coordena sua execução fora de `_prepareContext()`.\n\nConsulte [Arquitetura técnica](ARCHITECTURE.md) para os limites de responsabilidade e a sequência de refatoração.\n\n## Princípios arquiteturais

1. **Identificadores estáveis:** nomes exibidos podem mudar; referências internas devem permanecer estáveis sempre que possível.
2. **Separação de responsabilidades:** regras, dados, interface e aparência não devem ficar desnecessariamente acoplados.
3. **Extensibilidade:** estruturas futuras devem permitir módulos com propriedades e regras próprias.
4. **Compatibilidade:** alterações em dados persistidos precisam considerar fichas e Actors já existentes.
5. **Integração nativa:** priorizar APIs públicas e padrões oficiais do Foundry VTT.
6. **Evolução incremental:** construir e validar a fundação antes de ampliar a superfície de funcionalidades.

## Fontes de referência

O desenvolvimento deve considerar três fontes complementares:

- **Regras oficiais:** documentos mecânicos do NEXUS RPG, que definem o funcionamento do jogo de mesa.
- **Planejamento arquitetural:** decisões e propostas registradas nos documentos de projeto.
- **Código existente:** implementação efetivamente presente neste repositório.

Em caso de divergência, não se deve presumir que uma proposta já foi implementada. A implementação deve ser conferida no código e as regras devem ser conferidas nos documentos mecânicos oficiais.
