# Changelog

## 1.0.0.1
- Corrigido o tratamento de valores numéricos iguais a zero para raio de borda e opacidade dos componentes.
- Opacidade agora aceita a faixa de 0% a 100%; campo vazio retorna ao padrão de 100%.
- Campos sem vínculo dos componentes Campo, Anotações e Campo de texto agora persistem o conteúdo na própria instância do componente dentro do layout.
- Mantida a persistência das células de tabelas por meio de `component.cells`.
- Unificada a gravação dos campos de propriedade para respeitar aliases personalizados, propriedades nativas, propriedades virtuais do Actor e caminhos editáveis do sistema.
- Adicionada validação de caminhos de gravação, bloqueando caminhos internos/protegidos do Actor e validando imagens e cores especiais.
- Corrigida a limpeza de listeners globais de redimensionamento/rolagem do inspetor, evitando acúmulo após re-renderizações e fechamento da ficha.
- Adicionada validação automatizada do pacote e publicação do ZIP com `system.json` na raiz.
- Manifesto atualizado para `1.0.0.1`, com download versionado e URL estável para atualizações.
- A duplicidade de `data-component-custom-binding` foi auditada: os dois controles têm a mesma finalidade de visibilidade e o código consulta todos com `querySelectorAll()`; não era um defeito.

## Validação da 1.0.0.1
- A automação valida sintaxe dos módulos JavaScript, JSON do manifesto/idioma, referências de arquivos, blocos Handlebars, estrutura básica do CSS e conteúdo/estrutura do ZIP.
- Testes funcionais de instalação, atualização, interação, persistência e compatibilidade ainda precisam ser executados em uma instância real do Foundry VTT V14.

## 1.0.0
- Base reconstruída a partir da candidata 1.0.4.
- Preservação de scroll e foco revisada para evitar reposicionamento e foco roubado após atualizações.
- Corrigida duplicidade de atualização de nome e removido listener duplicado de tipografia global.
- Editor de propriedades percorre campos aninhados sem descartar propriedades irmãs de `value`/`max`.
- Propriedades escalares adicionais de `Actor.system` aparecem no editor nativo e respeitam seus tipos básicos ao salvar.
- Imagem do token movida para Geral > Dados; prévia de mídia adicionada ao editor de Dados.
- Seletor de cores NEXUS com espectro HSV, transparência, entrada hexadecimal e texturas opcionais para fundos.
- Menu de propriedades mantém um único portal ativo e limpa portais órfãos após renderizações, evitando duplicidade e cintilação.
- Tokens de destaque NEXUS aplicados à janela principal, painéis e controles que herdavam o destaque laranja do Foundry.
- Removidos os botões globais de reset de tema e tipografia.
