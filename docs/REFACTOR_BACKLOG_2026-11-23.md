# Backlog de refatoração — 2026-11-23

## Referência

- Base: branch `main`, commit `cb20dbe2a8bb5302860563433c1ad005de06e4ea`
- Versão declarada: `1.0.0.88`
- Ambiente-alvo: Foundry VTT 14 build 360
- Objetivo: reduzir acoplamento e duplicação sem alterar comportamento, regras de mesa ou dados persistidos.

As métricas abaixo foram coletadas por leitura dos arquivos da main. São indicadores de tamanho/complexidade, não prova isolada de defeito.

## Diagnóstico estrutural

| Arquivo | Linhas | Tamanho aproximado | Observação |
|---|---:|---:|---|
| `scripts/sheets/actor-sheet-v1.0.0.js` | 3.996 | 268 KB | Fachada/classe principal concentra muitas responsabilidades |
| `scripts/sheets/actor-sheet-listeners.js` | 1.760 | 143 KB | Controlador de eventos ainda muito grande |
| `styles/nexus-v1.0.0.css` | 8.178 | 492 KB | Camada de estilos acumulou muitas regras e sobrescritas |
| `templates/actors/actor-sheet.hbs` | 543 | 79 KB | Template principal ainda concentra a estrutura da ficha |
| `tests/validate-package.mjs` | — | 209 KB | Suíte estática grande, com muitas verificações de estrutura e seletores |

Uma varredura textual simples encontrou 669 seletores NEXUS repetidos entre 2.207 seletores distintos. Isso não significa que 669 regras sejam inúteis: parte pode representar sobrescritas intencionais. Antes de consolidar CSS, reconstruir a cascata efetiva e comparar os estados visuais.

## Lacunas funcionais e arquiteturais confirmadas

### Fichas de personagem e NPC

- `system.json` registra `player-character`, `npc` e `character`.
- `scripts/nexus-v1.0.0.js` registra a mesma classe `NexusActorSheet` para os três tipos.
- A classe fornece `isNPC` no contexto, mas o template atual não consome essa variável.
- Portanto, a existência do tipo de Actor NPC não equivale à existência da ficha NPC especializada planejada.

**Direção:** manter uma base compartilhada e registrar uma ficha/template específico para NPC. Reaproveitar componentes e serviços, sem duplicar a classe inteira. O template NPC deve seguir o escopo já aprovado pelo projeto: identidade, atributos e informações essenciais em uma composição mais enxuta, sem copiar automaticamente todas as seções da ficha de personagem.

Antes da implementação, mapear os campos persistidos e definir quais seções são compartilhadas, específicas ou ocultas. Não remover dados existentes ao simplificar a apresentação.

### Classe principal da ficha

A extração deve ocorrer por domínio, mantendo a classe como coordenadora. Ordem sugerida:

1. Mapear métodos, propriedades privadas, dependências e eventos.
2. Identificar serviços puros que já não dependem da classe.
3. Extrair primeiro renderizadores e transformações de dados sem efeitos colaterais.
4. Extrair controladores de UI com ciclo de vida explícito.
5. Manter uma fachada fina para compatibilidade com Foundry e com os módulos já existentes.

Não mover blocos grandes apenas por tamanho. Cada extração precisa ter contrato de entrada/saída, teste de regressão e prova de que os listeners são removidos no encerramento da ficha.

### Listeners e ciclo de vida

- O controlador principal ainda possui 1.760 linhas.
- Já existem controladores especializados para alguns domínios.
- A próxima extração deve evitar registrar o mesmo evento em dois lugares ou criar um segundo mecanismo de cleanup.

Prioridade: inventariar eventos por domínio, namespace, proprietário, estado assíncrono e função de cleanup. Verificar timers, observers, AbortControllers, janelas flutuantes e operações pendentes.

### CSS e templates

- O CSS tem muitos seletores repetidos e camadas de sobrescrita.
- A Biblioteca e os painéis flutuantes aparecem entre os seletores mais repetidos.
- Remover uma regra antiga pode alterar o resultado final mesmo quando existe outra regra com o mesmo seletor.

Plano seguro:

1. Gerar inventário de regras por domínio e ordem no arquivo.
2. Identificar quais regras são base, modificadores, estados e overrides.
3. Capturar estados visuais de referência no Foundry.
4. Consolidar um domínio de cada vez.
5. Manter a ordem efetiva da cascata durante a primeira etapa.
6. Remover código antigo somente após comparação visual e regressões.

Não reorganizar o CSS inteiro em uma única alteração.

### Testes

A suíte `tests/validate-package.mjs` é grande e mistura verificações de manifesto, templates, CSS e contratos de interface. As suítes especializadas já existentes devem receber os testes comportamentais por domínio. A validação do pacote deve ficar focada em integridade, imports e distribuição.

Direção: separar verificações de Biblioteca, Canvas, templates, propriedades e interações em módulos menores, sem reduzir cobertura nem substituir testes de comportamento por simples busca textual.

## Riscos que exigem auditoria antes de alterações

- **Dados persistidos:** localizar todos os leitores e escritores de flags, layouts, aliases, Biblioteca e propriedades.
- **Migrações:** preservar dados desconhecidos e não rebaixar Actors com schema futuro.
- **Regras de mesa:** conferir os livros oficiais antes de alterar valores padrão, fórmulas, atributos, recursos ou qualquer comportamento mecânico.
- **Foundry V14:** confirmar APIs e ciclo de vida na documentação oficial e em teste real.
- **Concorrência:** filas locais não equivalem a transações entre usuários diferentes.
- **Biblioteca:** manter isolamento entre definição reutilizável e instância inserida.
- **Mídia:** não declarar decoder ou backend concluído apenas porque existe registry/adaptador.

## Sequência recomendada

1. Validar a versão 1.0.0.88 no Foundry VTT 14 build 360 e registrar erros reproduzíveis.
2. Implementar a ficha NPC especializada como uma camada específica sobre serviços compartilhados, após confirmar o contrato dos campos.
3. Extrair um primeiro domínio pequeno da ficha principal, escolhido após o mapa de dependências.
4. Extrair listeners por domínio e padronizar cleanup.
5. Consolidar CSS da Biblioteca em uma etapa isolada com capturas comparativas.
6. Separar a suíte de validação em testes focados.
7. Repetir a auditoria de tamanho, duplicação e regressões após cada etapa.

## Critérios de aceite

- Nenhuma mudança mecânica sem fonte no livro oficial correspondente.
- Nenhuma perda ou renomeação silenciosa de dados.
- Nenhuma duplicação de listeners ou gravações.
- Testes automatizados aprovados.
- Testes reais no Foundry para interface, persistência, permissões, ciclo de vida e APIs.
- Documentação atualizada com o que foi realmente testado e o que permanece pendente.

Este backlog registra o diagnóstico. Ele não declara que as refatorações listadas já foram executadas.
