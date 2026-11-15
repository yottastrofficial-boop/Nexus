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


## Regras de representação no menu Comportamento

Um componente pode receber um mapeamento visual independente da propriedade que lê. Configure a propriedade de origem e adicione regras em ordem de prioridade. A primeira condição verdadeira define a saída:

- **Condição:** expressão booleana, por exemplo `level > mb`, `@identity.level > @combat.mb`, `level == 0` ou `(des + mb) >= 5`.
- O seletor de propriedades pode inserir referências com `@` nos campos de condição e fórmula.
- **Ícone e rótulo:** representação visual opcional. O rótulo também aceita interpolação, como `Nível {{level}}`.
- **Valor / fórmula:** expressão numérica opcional, como `level + mb` ou `level % 2`. Se ficar vazio, a saída utiliza o valor original da propriedade.
- **Sem correspondência:** o componente mantém sua apresentação original.

O mapeamento é apenas de leitura e apresentação: não grava nem modifica a propriedade de origem. As expressões são avaliadas de forma segura, sem executar JavaScript arbitrário. As mudanças nos valores do Actor atualizam as representações por eventos do Foundry, sem atualização periódica.
