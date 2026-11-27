## Estado de distribuição — 1.0.0.130

A 1.0.0.130 em preparação inclui navegação de pastas no conteúdo da Biblioteca, Assets globais como diretório pai, fontes nativas visíveis em Fontes com espécimes que usam a família correta, prévias de tema ampliadas e janela de ficha de 1100 × 920 redimensionável. O manifesto estável permanece em 1.0.0.129 até o workflow publicar e confirmar o ZIP 1.0.0.130.

- `system.json` em preparação: 1.0.0.130; download aponta para `v1.0.0.130/nexus.zip`.
- `manifest.json` permanece em 1.0.0.129 durante a validação; o workflow o sincroniza após release e asset verificado.
- CI, pacote e publicação desta revisão serão confirmados pelo workflow.
- Validação visual/funcional pendente no Foundry VTT 14 build 360: navegar Assets globais → Fontes, conferir a lista de fontes, espécimes Monospace, miniaturas de temas em grade e escala do Canvas padrão versus Configurações.
- O último checkpoint funcional confirmado permanece 1.0.0.70 até validação documentada no cliente real.

## Estado de distribuição — 1.0.0.129

A 1.0.0.129 corrige a pesquisa com borda única, breadcrumb com ícone e alinhamento, lista com célula Nome composta e colunas alinhadas, resize de colunas, modos de ordenação completos, sugestões pesquisáveis de categoria/etiqueta e prévias de fonte/tema. A migração de "Temas" para "Coleções visuais" altera apenas o nome da pasta padrão. O manifesto estável permanece na 1.0.0.128 até o workflow publicar e confirmar o ZIP 1.0.0.129.

- `system.json` candidato: 1.0.0.129; download aponta para `v1.0.0.129/nexus.zip`.
- `manifest.json` permanece em 1.0.0.128 durante a validação; o workflow deve sincronizá-lo somente após a release e o asset.
- CI, pacote e publicação desta revisão ainda precisam ser confirmados pelo workflow.
- Validação visual/funcional pendente no Foundry VTT 14 build 360: borda única de pesquisa, breadcrumb, alinhamento da lista, arraste das colunas, ordenação, filtros e previews.
- O último checkpoint funcional confirmado permanece 1.0.0.70 até validação documentada no cliente real.

## Estado de distribuição — 1.0.0.126 (2026-11-26)

A preparação da 1.0.0.126 atualizou também README, roadmap e visão do projeto para distinguir a versão em preparação da versão estável do manifesto.

A PR #110 foi integrada à branch `main` no commit `01199132eb06a14a5e6b6dc663d3e5f99a62e4de`. A release `v1.0.0.125` foi criada antes dessa integração e, portanto, não contém a janela da Biblioteca com abas. A versão em preparação para distribuir essas alterações é `1.0.0.126`.

- `system.json` declara a versão em preparação 1.0.0.126 e o endereço de download correspondente.
- O workflow `.github/workflows/release.yml` valida testes, gera `nexus.zip`, publica a tag/release e só então sincroniza `manifest.json` e os metadados de download.
- O manifesto estável deve permanecer na última release publicada até o workflow confirmar o asset `nexus.zip` da 1.0.0.126.
- A nova janela da Biblioteca requer validação visual/funcional no Foundry VTT 14 build 360: abas, histórico, breadcrumb, comandos, exclusão/renomeação, redimensionamento e persistência.
- A publicação e a CI não promovem automaticamente o checkpoint funcional. O último checkpoint confirmado no cliente Foundry permanece 1.0.0.70 até validação documentada.

## Revisão arquitetural 1.0.0.125 — bootstrap por dependências (2026-11-26)

A versão 1.0.0.124 foi publicada com o registro de serviços e contratos de eventos. A 1.0.0.125 migra os serviços centrais para factories e dependências explícitas, mantendo a API pública `game.nexus.*`. CI, pacote, release e manifesto serão confirmados pelo workflow. A validação funcional/visual no Foundry VTT 14 build 360 permanece pendente. A modernização da ficha, listeners, Biblioteca, CSS e templates continuará por etapas; esta atualização não representa a refatoração integral concluída.

## Revisão atual 1.0.0.123 — Biblioteca hierárquica

A PR #107 prepara a 1.0.0.123 com a nova taxonomia da Biblioteca, pastas hierárquicas, menus contextuais, criação de assets/atalhos/layouts/componentes e previews sem painel interno. A publicação estável depende da validação automatizada e da integração com o marcador [release]. A validação visual/funcional no Foundry VTT 14 build 360 continua pendente; não declarar novo checkpoint funcional antes do retorno do usuário.

## Estado da revisão 1.0.0.122 — Biblioteca e transferência

A versão 1.0.0.122 está em revisão na PR #106. Ela acrescenta pesquisa estruturada, indexação ampliada de compêndios, arraste nativo por UUID e inserção de componentes pessoais no Canvas; também fixa a janela da ficha em 800 × 836 px. CI e testes automatizados ainda precisam concluir nesta revisão. A validação visual no Foundry VTT 14 build 360 permanece pendente, portanto esta em revisão não é um novo checkpoint funcional.

## Estado publicado mais recente na main — 1.0.0.121

A 1.0.0.121 é a versão publicada mais recente na main antes da integração da PR #106. A publicação e o manifesto confirmam a disponibilidade do pacote, mas não substituem a avaliação manual no Foundry. O último checkpoint funcional confirmado permanece 1.0.0.70.

## Registro de código 1.0.0.121

A revisão corrige os fluxos de diálogo da Biblioteca, a apresentação dos filtros/pesquisa, miniaturas e altura inicial da ficha. A aprovação de CI e publicação do pacote não equivale a validação funcional no Foundry. O último checkpoint funcional confirmado permanece 1.0.0.70 até avaliação manual.

## Atualização 1.0.0.119
A versão 1.0.0.119 em validação preserva a geometria nativa da sidebar V14, corrige a estrutura de seletores dos controles, remove a coluna fantasma do Canvas e limpa o alvo do Inspector ao limpar seleção. A release depende do CI; o último checkpoint funcional confirmado permanece 1.0.0.70 até validação no Foundry real.

## Estado atual da main

A versão publicada em preparação para validação é **1.0.0.119**. CI e pacote ainda precisam concluir a execução desta revisão; a confirmação visual/funcional no Foundry VTT 14 build 360 permanece pendente. O último checkpoint funcional confirmado continua sendo **1.0.0.70**.

# Política de versões e checkpoints estáveis

## Objetivo

Manter a branch `main` utilizável e auditável, sem confundir publicação de pacote, CI verde e estabilidade funcional. O histórico Git e as releases preservam versões anteriores; a limpeza deve atuar na árvore e nas branches ativas, não apagar o histórico.

## Ciclo recomendado

1. Desenvolver correções em incrementos pequenos e isolados.
2. Adicionar testes de regressão antes ou junto da alteração.
3. A cada 3 a 5 atualizações relevantes, ou antes de uma mudança estrutural, revisar estabilidade.
4. Escolher como checkpoint somente uma versão que cumpra todos os critérios abaixo.
5. Registrar o checkpoint e as limitações antes de iniciar a etapa seguinte.
6. Remover protótipos da árvore ativa apenas depois de identificar consumidores e registrar sua função/resultado em `docs/archive/`.

## Critérios mínimos para declarar uma versão funcionalmente estável

- Workflows de validação e empacotamento aprovados.
- Nenhum defeito conhecido bloqueia fluxos essenciais.
- Os fluxos afetados foram testados dentro do Foundry VTT 14, não apenas por testes estáticos.
- Persistência, migração e compatibilidade de dados existentes foram verificadas quando aplicáveis.
- Changelog registra mudanças, limitações e testes pendentes.
- A versão é adequada como base para uma etapa futura sem depender de correções urgentes conhecidas.

## Estado de referência — 2026-11-25 (release 1.0.0.117 publicada; validação funcional pendente)

- **Versão estável publicada na main e no manifesto:** `1.0.0.117`; CI (64/64 scripts, 43/43 arquivos de teste), ZIP (443.848 bytes), release, asset e manifesto confirmados. A validação manual no Foundry ainda está pendente.
- **Última versão estável anterior:** `1.0.0.115`; release, ZIP e manifesto confirmados.
- **Última versão estável anterior:** `1.0.0.107`; release, ZIP e manifesto confirmados antes da sincronização da .108.
- **Teste manual pendente:** a versão `1.0.0.117` corrige o rail direito, a seleção/alvo do inspetor e a abertura de Propriedades pelo Canvas. Confirmar rails e botões individuais, troca/edição de layouts, Biblioteca, seleção simples/múltipla, edição de grupos, foco, re-renderização e console no Foundry VTT 14 build 360. Revalidar também os 10 slots da Hotbar, Players, ícones e fontes. A publicação não promove automaticamente a versão a checkpoint funcional.
- **Manutenção em main:** commit `34c114539e04e67151dbcf806283503e91c3cdf0` isola o sidebar das regras globais de tipografia, consolida estilos e amplia os testes de regressão; CI e empacotamento aprovados.
- **Limitação explícita:** o usuário instalou a versão .113 e relatou que a navegação horizontal continuava comprimida; por isso, a abordagem foi abandonada. A .114 removeu os overrides estruturais da sidebar; a .115 corrigiu regras tipográficas legadas; a .116 separou os botões de layout em controles flutuantes e simplificou as molduras externas da Hotbar e da lista de jogadores. A confirmação visual/funcional de sidebar, ícones e Estúdio no cliente real ainda está pendente. O checkpoint funcional permanece em `1.0.0.70`.
- **Distribuição:** a `1.0.0.111` foi autorizada para publicação antecipada. O manifesto estável só será sincronizado após CI, empacotamento e confirmação do asset; o checkpoint funcional permanece em `1.0.0.70` até validação no Foundry real.
- **Sincronização:** o workflow só atualiza o manifesto original depois de aprovar os testes, gerar o ZIP e confirmar o asset `nexus.zip`.
- **Último checkpoint funcional confirmado no Foundry:** `1.0.0.70`.
- **Ambiente-alvo:** Foundry VTT 14, build 360.
- A aprovação do CI e a publicação de um ZIP demonstram que o artefato foi validado automaticamente e disponibilizado; não demonstram, por si só, que ficha, Biblioteca, Lógica, Mídia e persistência funcionam corretamente no cliente.

## Regras obrigatórias de versionamento e migração

- Toda mudança no formato persistido incrementa `NEXUS_PROPERTY_SCHEMA_VERSION` quando aplicável.
- Toda nova versão de schema recebe migração explícita, idempotente e coberta por testes com Actors antigos.
- Migrações preservam propriedades desconhecidas, layouts, componentes, grupos, aliases e dados personalizados que não estejam diretamente envolvidos na mudança.
- Um sistema antigo nunca deve rebaixar um Actor com versão de schema superior.
- Mudanças distribuídas ao Foundry exigem nova versão e novo pacote; não reutilizar a mesma versão para forçar atualização do cliente.
- `system.json.download` aponta para o pacote da versão declarada em `system.json`; `manifest.json` aponta para a última versão estável confirmada.
- Uma versão só é declarada funcionalmente estável após validação no Foundry real.

## Publicação no GitHub Actions

- O workflow executa validação e empacotamento em pushes e pull requests.
- Uma release estável só é publicada por um commit na branch `main` cuja mensagem contenha o marcador exato `[release]`.
- Antes da publicação, a suíte automatizada e o ZIP são validados.
- Depois de confirmar o asset `nexus.zip`, o workflow atualiza o `manifest.json` original para a release estável publicada.
- Se validação, empacotamento, publicação ou verificação do ZIP falhar, o manifesto não avança.
- O manifesto e o pacote devem apontar para versões coerentes; a base de desenvolvimento pode avançar sem alterar o download estável.

## Estabilidade funcional

A publicação de uma release estável não equivale a checkpoint funcional. A evidência visual enviada após a instalação da 1.0.0.106 confirma que o sidebar permanece defeituoso. A promoção do checkpoint depende da execução e do registro dos testes no Foundry VTT 14 build 360, conforme os critérios desta política.

## O que é preservado

- Releases e tags publicadas são preservadas como histórico.
- O histórico Git é o registro permanente das alterações, inclusive protótipos e etapas instáveis.
- Branches antigas podem ser arquivadas ou excluídas somente após comparação com a main e confirmação de que commits exclusivos foram preservados ou deliberadamente descartados.
- A limpeza remove duplicações e código obsoleto da árvore ativa, não reescreve o histórico do projeto.

## Próximo checkpoint

A próxima versão funcionalmente estável deve passar por uma rodada de validação documentada no Foundry VTT 14 build 360. O relatório deve registrar: ambiente, versão instalada, Actors novos e antigos, fluxos testados, resultado, erros de console e evidências de persistência. Até essa validação, manter 1.0.0.70 como último checkpoint funcional confirmado.


## Atualização de código 1.0.0.120

O pacote versão em preparação adiciona estado canônico para seleção e Inspector e isola as Configurações nativas dos estilos genéricos. Essas alterações passaram por CI automatizado, mas não alteram o último checkpoint funcional confirmado: 1.0.0.70, até avaliação manual no Foundry VTT 14.
