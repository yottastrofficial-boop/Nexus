# Fórmulas de propriedades

O NEXUS aceita expressões aritméticas em interpolações de texto e em fórmulas de rolagem.

## Sintaxe

Use duas chaves para delimitar uma expressão:

- `{{nivel + mb}}`
- `{{(des + mb) * 2}}`
- `{{for - 1}}`
- `{{@identity.level + @combat.mb}}`

O resultado é calculado com os valores atuais do Actor. Em componentes abertos, expressões vinculadas são reavaliadas quando o Foundry emite uma atualização real do Actor. O NEXUS compara os caminhos alterados com as referências de cada componente e atualiza somente os componentes afetados; não há timer nem polling.

## Atalhos do NEXUS

| Atalho | Propriedade |
|---|---|
| `nivel` | Nível do personagem |
| `mb` | Modificador Base |
| `for`, `des`, `sab`, `int`, `car`, `von` | Atributos |
| `pv`, `pm`, `pe` | Recursos |
| `def` / `defesa` | Defesa |
| `desl` / `movimento` | Deslocamento |
| `ddr` | Dados de Recuperação |

Os atalhos não diferenciam maiúsculas de minúsculas. Também é possível usar caminhos completos de propriedades quando disponíveis.

## Operadores suportados

- Soma: `+`
- Subtração: `-` (use espaços ao redor do operador)
- Multiplicação: `*`
- Divisão: `/`
- Módulo (resto da divisão): `%`
- Comparações: `>`, `>=`, `<`, `<=`, `==`, `!=` (para condições)
- Agrupamento: `(` e `)`

A precedência matemática é respeitada. Divisão ou módulo por zero, propriedades desconhecidas e valores não numéricos são rejeitados. O operador `%` significa módulo, não porcentagem; para percentual de um recurso, utilize a propriedade derivada correspondente, como `resources.pv.percentage` quando disponível.

## Limites desta etapa

O avaliador é intencionalmente restrito: não executa JavaScript, não usa `eval` e não aceita chamadas de funções arbitrárias. Esta etapa habilita expressões aritméticas em texto e fórmulas de rolagem; um editor visual de fórmulas persistentes para qualquer propriedade, com dependências e detecção de ciclos, ainda é uma etapa separada.


## Fórmulas persistentes de propriedades

O Editor de Dados permite ativar o modo **Automático por fórmula** em propriedades numéricas personalizadas. A fórmula fica salva nos metadados da propriedade, enquanto o valor manual original permanece em `flags.nexus.customData`. Desativar o cálculo retorna ao valor manual sem perda de dados.

Exemplos aceitos: `nivel + mb`, `(des + mb) * 2` e `for - 1`. Use espaços ao redor dos operadores quando necessário para separar identificadores de subtrações. Fórmulas são avaliadas com os valores atuais do Actor. Ciclos e referências inválidas são rejeitados de forma segura.


## Apresentação de propriedades

As regras de apresentação são configuradas no painel **Propriedades**, associadas à propriedade selecionada. O painel **Comportamento** é reservado a fluxos de interação.

Cada regra contém uma condição e um único campo de conteúdo. O campo aceita texto, valores interpolados, ícones e imagens:
- Condição: `@attributes.for.value >= 5` ou `@attributes.for.value = 1`.
- Inserção de valor: `Fúria: {{@attributes.fur.value}}`.
- Ícone: `{{icon:fa-solid fa-fire}}`.
- Imagem: `{{image:icons/fury.webp}}`.

Use `@caminho.completo` nas expressões e `{{@caminho.completo}}` no conteúdo. `=` e `==` são equivalentes para igualdade. Abreviações duplicadas são sinalizadas no painel; use o caminho completo quando houver conflito. A primeira condição verdadeira vence; sem correspondência, a representação original permanece.

Layouts antigos que usam `component.representation` continuam legíveis; novas configurações são gravadas em `component.propertyPresentation`. A apresentação não altera as regras nem os valores do Actor.
