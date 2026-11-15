# Fórmulas de propriedades

O NEXUS aceita expressões aritméticas em interpolações de texto e em fórmulas de rolagem.

## Sintaxe

Use duas chaves para delimitar uma expressão:

- `{{nivel + mb}}`
- `{{(des + mb) * 2}}`
- `{{for - 1}}`

O resultado é recalculado a partir dos valores atuais do Actor quando a ficha renderiza ou a fórmula é executada.

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
- Agrupamento: `(` e `)`

A precedência matemática é respeitada. Divisão por zero, propriedades desconhecidas e valores não numéricos são rejeitados.

## Limites desta etapa

O avaliador é intencionalmente restrito: não executa JavaScript, não usa `eval` e não aceita chamadas de funções arbitrárias. Esta etapa habilita expressões aritméticas em texto e fórmulas de rolagem; um editor visual de fórmulas persistentes para qualquer propriedade, com dependências e detecção de ciclos, ainda é uma etapa separada.


## Fórmulas persistentes de propriedades

O Editor de Dados permite ativar o modo **Automático por fórmula** em propriedades numéricas personalizadas. A fórmula fica salva nos metadados da propriedade, enquanto o valor manual original permanece em `flags.nexus.customData`. Desativar o cálculo retorna ao valor manual sem perda de dados.

Exemplos aceitos: `nivel + mb`, `(des + mb) * 2` e `for - 1`. Use espaços ao redor dos operadores quando necessário para separar identificadores de subtrações. Fórmulas são avaliadas com os valores atuais do Actor. Ciclos e referências inválidas são rejeitados de forma segura.
