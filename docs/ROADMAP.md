# Roadmap NEXUS

Este documento registra prioridades e decisões. Um item só deve ser marcado como concluído quando existir implementação verificável e testes adequados. Testes estáticos não substituem validação funcional no Foundry.

## Estado de referência

- Repositório: `yottastrofficial-boop/Nexus`
- Branch: `main`
- Commit de referência: `HEAD da main`
- Distribuição: o manifesto original é a fonte única de instalação/atualização e só avança após CI, publicação e confirmação do asset.
- Versão publicada: `1.0.0.103` (CI, empacotamento, release e manifesto sincronizados).
- Manifesto estável: `1.0.0.103`; validação visual/funcional no Foundry 14 build 360 ainda pendente.
- Último checkpoint funcional confirmado dentro do Foundry: `1.0.0.70`.
- A publicação da 1.0.0.98 concluiu CI (37/37 arquivos de teste), geração do pacote e confirmação do asset; a validação funcional no Foundry real permanece pendente.
- Alvo: Foundry VTT 14, build 360.
- Estado: projeto em desenvolvimento pós-release; CI automatizado por commit; a validação funcional/visual no Foundry real permanece pendente.

## Atualização 1.0.0.103

Corrige o erro de construção do Estúdio de Aparência causado por opções de janela congeladas recebidas pelo menu do Foundry. O código agora clona as opções herdadas e as estruturas mutáveis antes da construção da ApplicationV2. A navegação nativa do sidebar passa para uma faixa superior horizontal, mantendo a ordem DOM original do Foundry (de cima para baixo convertida em esquerda para direita). As classes Font Awesome legadas são excluídas da tipografia global. A validação no cliente Foundry VTT 14 build 360 permanece pendente.
