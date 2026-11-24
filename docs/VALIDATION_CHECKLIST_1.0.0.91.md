# NEXUS 1.0.0.91 — roteiro de validação funcional

## Objetivo e limite

Este roteiro valida a release publicada `v1.0.0.91` no Foundry VTT 14 build 360. A CI da release passou e o ZIP foi anexado, mas isso não substitui a validação dentro do cliente Foundry.

**Último checkpoint funcional confirmado antes desta rodada:** `1.0.0.70`.

Não marque um item como aprovado apenas porque o controle aparece na interface. Confirme o resultado, feche/reabra a janela quando aplicável e verifique a persistência.

## 1. Preparação

- [ ] Registrar versão/build do Foundry, navegador/desktop, sistema operacional e versão do NEXUS.
- [ ] Fazer backup do mundo e dos dados que serão usados nos testes.
- [ ] Instalar a release `v1.0.0.91` pelo ZIP publicado.
- [ ] Confirmar que `system.json` informa NEXUS `1.0.0.91` e compatibilidade Foundry 14.
- [ ] Abrir o console e registrar erros existentes antes de começar.
- [ ] Separar um mundo de teste com um Actor novo, um Actor antigo e ao menos um Token vinculado.

## 2. Instalação, Actors e migração

- [ ] Abrir o mundo sem erro de inicialização do sistema.
- [ ] Criar um Actor de cada tipo disponível: personagem de jogador, NPC e personagem legado, se aplicável.
- [ ] Abrir, editar, salvar, fechar e reabrir cada ficha.
- [ ] Confirmar que atributos e propriedades aninhadas mantêm seus metadados e valores.
- [ ] Verificar valores zero, negativos, `false`, strings vazias e campos ausentes como casos distintos.
- [ ] Abrir um Actor antigo e confirmar que a migração não apaga dados personalizados, aliases, grupos ou layouts.
- [ ] Executar novamente a abertura/reinicialização e confirmar que a migração é idempotente.
- [ ] Confirmar que um Actor com schema futuro não é rebaixado.

## 3. Token e sincronização com Actor

- [ ] Criar ou importar um Actor e confirmar que o Token de protótipo inicia vinculado ao Actor.
- [ ] Abrir a ficha pelo Token na cena e alterar um campo persistido.
- [ ] Confirmar que a ficha do Actor reflete a alteração e vice-versa.
- [ ] Desvincular intencionalmente um Token e confirmar que a edição não altera o Actor original.
- [ ] Fechar e reabrir a cena para verificar a persistência do vínculo.

## 4. Canvas e janelas

- [ ] Adicionar, selecionar, mover, redimensionar, duplicar e remover componentes.
- [ ] Criar grupos e subgrupos; confirmar hierarquia e superfície compartilhada.
- [ ] Testar layouts Livre, Horizontal, Vertical e Grade, quando disponíveis.
- [ ] Salvar, fechar e reabrir a ficha; conferir posições, dimensões, grupos e configurações.
- [ ] Alternar entre os modos Padrão, Configuração e Aparência.
- [ ] Abrir mais de uma ficha/janela, alternar foco e confirmar que painéis e barras laterais não ficam presos atrás ou à frente indevidamente.
- [ ] Redimensionar a janela e testar larguras menores sem overflow ou controles inacessíveis.

## 5. Biblioteca universal

- [ ] Abrir a Biblioteca como janela independente e confirmar que não depende de uma ficha aberta.
- [ ] Consultar as fontes NEXUS, Lógica e documentos Foundry permitidos ao usuário.
- [ ] Pesquisar por nome e testar filtros de categoria, tipo, origem e etiqueta.
- [ ] Alternar grade/lista e carregar páginas adicionais.
- [ ] Marcar/desmarcar favoritos e confirmar persistência após reabrir.
- [ ] Consultar Recentes e confirmar que a seleção atualiza a lista.
- [ ] Criar pastas e coleções; atribuir e remover recursos; confirmar persistência.
- [ ] Selecionar recursos de tipos diferentes e conferir o Inspector contextual.
- [ ] Testar metadados, duplicação e exclusão; confirmar que dependências impedem remoções inseguras.
- [ ] Confirmar que documentos Foundry são referenciados por UUID e que as permissões originais são respeitadas.
- [ ] Confirmar que uma falha em um provedor não impede a navegação nas demais fontes.

## 6. Definições, instâncias e backup

- [ ] Inserir uma definição reutilizável em mais de uma ficha.
- [ ] Personalizar uma instância e confirmar que a definição e as outras instâncias não mudam silenciosamente.
- [ ] Atualizar a definição e conferir a prévia/lista de instâncias afetadas antes de confirmar.
- [ ] Exportar um backup da Biblioteca.
- [ ] Importar o backup em um mundo de teste e revisar a prévia, conflitos e contagens.
- [ ] Cancelar uma importação e confirmar que nenhum dado foi gravado.
- [ ] Confirmar uma importação controlada e verificar que dados existentes não foram sobrescritos sem a estratégia escolhida.

## 7. Lógica e permissões

- [ ] Criar e validar uma Propriedade, uma Regra, um Comportamento, um Fluxo e uma Função.
- [ ] Confirmar que IDs e referências continuam válidos após renomear os rótulos exibidos.
- [ ] Testar Fluxo sequencial com condições satisfeitas e não satisfeitas.
- [ ] Testar grafo com ramificações verdadeira/falsa e caminho final.
- [ ] Usar Simular e confirmar que nenhuma ação ou alteração persistida ocorre.
- [ ] Testar o executor `nexus.actor.update` com usuário autorizado e caminho permitido em `system.*`.
- [ ] Testar o executor `nexus.actor.adjust` com delta positivo/negativo e limites min/max.
- [ ] Testar caminhos proibidos, configurações inválidas e usuário sem permissão; a ação deve ser bloqueada.
- [ ] Com dois clientes conectados, confirmar que eventos de ciclo de vida não executam duplicadamente e que somente o GM ativo despacha os comportamentos.
- [ ] Verificar o resultado de falhas de executor e a política `stop`/ `continue`.

## 8. Mídia e desempenho

- [ ] Testar imagens e demais formatos suportados nativamente pelo ambiente.
- [ ] Testar upload pelo fluxo Foundry disponível e reabertura do recurso.
- [ ] Confirmar carregamento sob demanda, miniaturas e cache sem carregar listas ou mídia em massa no início.
- [ ] Testar referências inválidas, arquivo ausente e fallback.
- [ ] Verificar comportamento com listas grandes e múltiplas prévias.
- [ ] Não marcar AV1/JXL ou conversão especializada como suportados sem os decodificadores e testes correspondentes.

## 9. Encerramento e relatório

- [ ] Reabrir o mundo e confirmar persistência dos dados alterados.
- [ ] Repetir os fluxos críticos com um usuário não-GM.
- [ ] Revisar o console e registrar erros, avisos e stack traces relevantes.
- [ ] Comparar o comportamento com o backup inicial e confirmar que dados não relacionados aos testes foram preservados.
- [ ] Anexar capturas/evidências sem expor dados privados dos jogadores.

### Modelo de relatório

```text
NEXUS:
Foundry (versão/build):
Ambiente/navegador:
Mundo de teste:
Data:

Área:
Cenário:
Resultado: APROVADO / FALHOU / NÃO TESTADO
Passos realizados:
Resultado esperado:
Resultado observado:
Erros de console:
Evidência:
Observações:

Último checkpoint funcional permanece 1.0.0.70 até revisão e aprovação do relatório.
```

## Critério de conclusão

A 1.0.0.91 só poderá substituir o checkpoint 1.0.0.70 depois que os fluxos críticos de instalação/migração, Actors/Token, Canvas, Biblioteca, Lógica, permissões e persistência forem testados no cliente Foundry 14 build 360, com falhas bloqueadoras corrigidas e relatório revisado. Itens não testados devem permanecer explicitamente pendentes.
