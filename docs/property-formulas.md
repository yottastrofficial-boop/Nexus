## Campo Valor unificado

O Inspector apresenta um único campo chamado **Valor** para propriedades simples, propriedades derivadas e perícias. O modo de validação é definido pela propriedade selecionada, mas a interface não troca o rótulo nem o componente de edição.

As fórmulas de perícias e propriedades derivadas usam a mesma sintaxe segura, as mesmas funções matemáticas e o mesmo resolvedor de caminhos. O armazenamento permanece compatível com o formato já usado pelos Actors: fórmulas de perícias em `system.skills.<perícia>.formula` e expressões de outras propriedades em `flags.nexus.propertyExpressions`.

O seletor de propriedades mostra somente o nome e o caminho real. Caminhos de navegação por Corpo, Mente, Alma ou atributo associado à perícia são normalizados para o caminho canônico antes de serem salvos.

# Fórmulas de propriedades

O NEXUS aceita expressões aritméticas em interpolações de texto e em fórmulas de rolagem.

## Sintaxe

Use duas chaves para delimitar uma expressão:

- `{{nivel + mb}}`
- `{{(des + mb) * 2}}`
- `{{for - 1}}`
- `{{@identity.level + @combat.mb}}`

O resultado é calculado com os valores atuais do Actor. O Core não instala fórmulas mecânicas padrão nas propriedades. Fórmulas prontas podem acompanhar cards importados da Biblioteca; fórmulas explicitamente configuradas também permanecem vinculadas às propriedades atuais. Em componentes abertos, expressões são reavaliadas quando o Foundry emite uma atualização real do Actor. O NEXUS compara os caminhos alterados com as referências de cada componente e atualiza somente os componentes afetados; não há timer nem polling.

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

Os atalhos não diferenciam maiúsculas de minúsculas. Também é possível usar caminhos completos de propriedades quando disponíveis. Os atalhos são referências a valores armazenados; não aplicam cálculos por conta própria.

## Operadores suportados

- Soma: `+`
- Subtração: `-` (use espaços ao redor do operador)
- Multiplicação: `*`
- Divisão: `/`
- Módulo (resto da divisão): `%`
- Comparações: `>`, `>=`, `<`, `<=`, `==`, `!=` (para condições)
- Agrupamento: `(` e `)`
- Funções seguras: `min(a, b, ...)`, `max(a, b, ...)`, `ceil(x)`, `floor(x)`, `round(x)`, `abs(x)`, `sign(x)` e `if(condição, valor1, valor2)`

A precedência matemática é respeitada. Um campo numérico vazio é tratado como zero em operações aritméticas; campos textuais vazios continuam vazios fora de operações numéricas. Divisão ou módulo por zero, propriedades desconhecidas e valores não numéricos são rejeitados. O operador `%` significa módulo, não porcentagem; para percentual de um recurso, utilize a propriedade derivada correspondente, como `resources.pv.percentage` quando disponível.

## Limites desta etapa

O avaliador é intencionalmente restrito: não executa JavaScript, não usa `eval` e aceita somente as funções seguras listadas acima. O avaliador não define quais fórmulas devem existir: ele apenas executa expressões presentes em cards da Biblioteca ou configuradas explicitamente. As propriedades do Core armazenam valores e não recebem cálculos mecânicos predefinidos.


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


## Fórmulas personalizadas de perícias

O resultado `skills.<pericia>.value` é um valor armazenado. A propriedade não recebe uma soma automática de atributo e MB. Uma fórmula só é executada quando existe uma configuração explícita em `skills.<pericia>.formula` ou em um card importado da Biblioteca; ela consulta os valores atuais e é reavaliada quando suas dependências mudam.

Exemplos válidos para Atletismo:

- `{{attributes.for.value + (combat.mb * skills.athletics.proficientLevel)}}`
- `@FOR + (@MB * skills.athletics.proficientLevel)`

Use uma única expressão completa entre chaves quando estiver configurando um vínculo de componente. Não envolva cada parcela em chaves separadas. Os atalhos `@FOR` e `@MB` são aceitos no editor de fórmulas de perícia.
