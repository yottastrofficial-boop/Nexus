# Propriedades e interações — contrato inicial

Este documento registra o primeiro contrato técnico para evoluir as propriedades e os comportamentos dos componentes. Ele descreve o que já foi implementado nesta etapa e o que continua planejado.

## 1. Propriedades

Uma propriedade é a unidade de dado reconhecida pelo NEXUS. Atributos, perícias, recursos e outros dados são classificações de propriedades, não sistemas independentes.

### Identidade e apresentação

- `id`: identificador interno estável, com namespace, independente do nome exibido.
- `key`: chave técnica curta, em inglês, utilizada nos caminhos de dados.
- `label` ou `name`: nome apresentado ao usuário, em português.
- `type`: classificação da propriedade.
- `value`: valor armazenado, quando aplicável.

Exemplo conceitual:

```js
{
  id: "nexus.core.skill.stealth",
  key: "stealth",
  name: "Furtividade",
  type: "skill",
  value: -5
}
```

O exemplo representa o contrato desejado; não significa que o `PropertyRegistry` completo já esteja implementado.

### Valores numéricos

- Qualquer número finito pode ser armazenado, inclusive valores negativos.
- `0` é um valor válido e não deve ser confundido com ausência de dado.
- Valores negativos não devem ser convertidos automaticamente para zero.
- Limites só devem ser aplicados quando forem definidos explicitamente pela propriedade ou por uma regra do módulo.
- Cálculos devem preservar sinais e resultados negativos.

### Proficiência

As perícias utilizam um único campo numérico persistido: `proficientLevel`.

| Valor | Significado |
|---:|---|
| `0` | Sem proficiência |
| `1+` | Proficiente |
| `-1 ou menor` | Deficiência; aplica o modificador de proficiência no sentido oposto |

Na regra-base implementada nesta etapa, o sinal determina a direção do modificador: positivo adiciona MB, negativo subtrai MB e zero não aplica MB. A magnitude do nível é preservada no dado, mas não multiplica o MB.

A propriedade derivada `proficient` pode ser utilizada pela interface para exibição, mas não é um segundo campo persistido.

### Compatibilidade

As chaves técnicas das 18 perícias utilizam inglês, mantendo os nomes exibidos em português. Durante a migração, o NEXUS transfere o valor para `proficientLevel` na chave canônica e remove a chave antiga em português no mesmo update do Actor. Se a migração falhar, a leitura de compatibilidade continua reconhecendo os dados antigos até uma nova tentativa.

## 2. Interações de componentes

O contrato de interação separa três responsabilidades:

1. **Trigger** — evento que inicia a interação, como `click`, `change`, `submit` ou `hover`.
2. **Action** — operação executada em resposta ao evento.
3. **Configuration** — parâmetros específicos daquela operação.

Estrutura conceitual:

```js
{
  id: "interaction-1",
  triggers: [{ id: "trigger-1", event: "click" }, { id: "trigger-2", event: "doubleClick" }],
  name: "Consultar recurso",
  enabled: true,
  conditions: [],
  conditionJoin: "all",
  actions: [
    {
      id: "action-1",
      type: "roll",
      config: {
        formula: "1d20 + @DES"
      }
    },
    {
      id: "action-2",
      type: "toggle",
      config: {
        targetId: "component-target"
      }
    }
  ]
}
```

Um fluxo pode conter vários Triggers independentes: qualquer um deles inicia suas Actions. Condições opcionais são avaliadas antes da execução e podem ser combinadas como AND (todas) ou OR (qualquer). As Actions são executadas na ordem em que aparecem e podem ser reordenadas no Inspector. Cada ação mantém sua própria configuração. A política de erro define se uma falha interrompe o fluxo ou permite continuar.

### Tipos de ação previstos

- `roll`: realizar uma rolagem.
- `calculate`: calcular um valor.
- `update`: atualizar uma propriedade.
- `open`: abrir uma interface ou documento.
- `toggle`: alternar um estado ou componente.
- `interact`: chamar uma interação definida por outro componente ou sistema.
- `execute`: executar uma operação avançada por uma API controlada.

O editor oferece configuração contextual para os tipos listados. O executor implementa rolagem, cálculo, atualização de propriedades, abertura de documentos/componentes, alternância, encadeamento de interações e operações avançadas de uma lista permitida. A ação execute não interpreta JavaScript arbitrário.

### Compatibilidade com componentes antigos

Componentes que ainda utilizam `actionType`, `rollFormula` e `actionTargetId` são convertidos em interações equivalentes em tempo de leitura. Os dados antigos não precisam ser regravados imediatamente.

## 3. Cálculos e automação

Cada propriedade poderá escolher seu modo de cálculo:

- **Manual:** o valor é definido diretamente.
- **Automático:** o valor é calculado a partir de uma fórmula ou dependências.
- **Automático com substituição manual:** o cálculo fornece o padrão, mas o usuário pode sobrescrever o resultado.

A automação não deve ser obrigatória. MB, atributos, recursos e outras propriedades não devem ser forçados a um único comportamento universal.

Dependências futuras deverão detectar ciclos, referências inválidas e atualizações recursivas. Fórmulas devem referenciar chaves ou IDs estáveis, nunca rótulos exibidos.

## 4. Segurança e evolução

O modo avançado poderá oferecer operações mais expressivas, mas código arbitrário não deve ser executado sem limites. A execução avançada dependerá de uma API controlada, validação de entradas, permissões e limites de execução.

## 5. Implementação por etapas

### Implementado nesta etapa

- Chaves técnicas em inglês para as 18 perícias.
- Campo numérico `proficientLevel`, com valores positivos, zero e negativos.
- Migração dos campos antigos para a chave canônica, com remoção segura das chaves legadas após preparar o valor novo.
- Preservação de modificadores e valores negativos nas rolagens.
- Motor de interações com vários Triggers por fluxo, condições AND/OR e Actions sequenciais.
- Editor visual no Inspector para criar, configurar, ativar, remover e reordenar fluxos, Triggers e Actions.
- Executores controlados para rolagem, cálculo, atualização, abertura, alternância, encadeamento e operações permitidas.
- Compatibilidade de leitura para ações antigas de rolagem e alternância.

### Próximas etapas

1. Criar o `PropertyRegistry` e o contrato completo de metadados.
2. Migrar as propriedades existentes para identificadores e chaves canônicas sem quebrar vínculos.
3. Substituir o seletor rígido de ação por um editor de interações com trigger, lista de ações reordenável e configuração contextual.
4. Consolidar o `Roll Dialog` universal.
5. Implementar o mecanismo de cálculos e dependências opcionais.
6. Evoluir a interface visual de criação de comportamentos e, depois, a API avançada segura.

A evolução deve continuar incremental. Não se deve reconstruir a ficha inteira nem declarar concluída uma camada que ainda esteja apenas definida neste contrato.
