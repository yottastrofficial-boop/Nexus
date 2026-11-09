# NEXUS RPG — Ficha Modular Foundry VTT

Versão **1.0.0** — reconstrução da base da ficha modular para Foundry VTT V14.

## Instalação

1. Extraia a pasta `nexus` para `Data/systems/`.
2. Confirme que o caminho final é `Data/systems/nexus/system.json`.
3. Reinicie o Foundry VTT e selecione NEXUS RPG ao criar/editar o mundo.

## Observações da versão

- Revisão da preservação de foco e rolagem dos painéis durante atualizações.
- Navegação e foco visual limitados aos estados ativos/visíveis.
- Seletor de cores próprio do NEXUS, com espectro HSV, opacidade e texturas opcionais para fundos.
- Seletor de imagem do token reposicionado em Geral > Dados.
- Prévia de mídia no editor de Dados quando a propriedade vinculada contém uma imagem, áudio ou vídeo reconhecível.
- Descoberta recursiva de propriedades do Actor.system, incluindo campos irmãos de `value` e `max`.
- Removidos os botões globais de restauração de tema/tipografia que estavam apresentando problemas.

## Limites de validação

A versão passou por verificações estáticas de sintaxe JavaScript, JSON, integridade do pacote e consistência básica dos templates. Ela ainda precisa de teste funcional dentro de uma instalação real do Foundry VTT V14, incluindo foco entre janelas, persistência de dados, mídia e diferentes tipos de Actor.


## Interface controls (1.0.0)

A interface utiliza o seletor de cores NEXUS com espectro HSV, controle de opacidade e texturas opcionais para superfícies. Os seletores de propriedades permanecem vinculados ao inspetor de origem para evitar portais duplicados durante atualizações da ficha.
