# Validação manual — Design System Foundry V14

Este roteiro é o gate funcional da primeira versão do Design System global. A validação deve ocorrer em uma instalação real do Foundry VTT 14 build 360, com pelo menos um usuário GM e um usuário jogador conectados simultaneamente.

## Preparação

- [ ] Fazer backup do mundo de teste.
- [ ] Instalar a build de teste do NEXUS sem substituir a instalação principal.
- [ ] Confirmar Foundry VTT 14 build 360 e registrar os módulos ativos.
- [ ] Abrir o mundo com um GM e um jogador em clientes/navegadores separados.
- [ ] Abrir o console dos dois clientes e registrar erros anteriores ao teste.

## Configuração da campanha

- [ ] Como GM, abrir Configurações do jogo e localizar as opções de aparência do NEXUS.
- [ ] Selecionar cada tema disponível e confirmar que a alteração é aplicada sem recarregar.
- [ ] Confirmar que o jogador conectado recebe o tema da campanha.
- [ ] Alterar o tema novamente enquanto o jogador mantém o mundo aberto e confirmar a sincronização.
- [ ] Desativar **Permitir temas individuais** e confirmar que a opção efetiva do jogador passa a ser o tema da campanha.

## Preferências individuais

- [ ] Com a permissão mundial ativada, selecionar **Seguir aparência da campanha**.
- [ ] Selecionar **Padrão original do NEXUS** e confirmar que apenas o cliente atual muda.
- [ ] Selecionar **Minha aparência**, escolher outro tema e confirmar que apenas o cliente atual muda.
- [ ] Alterar o tema da campanha e confirmar que a preferência pessoal continua aplicada.
- [ ] Desativar e reativar a permissão individual; confirmar que a preferência pessoal é preservada e volta a valer quando permitido.
- [ ] Sair e entrar novamente no mundo; confirmar a persistência da preferência individual.

## Estúdio de Aparência

- [ ] Abrir o Estúdio pelo menu de Configurações do Jogo.
- [ ] Confirmar que GM pode editar campanha e que jogador pode editar apenas o próprio perfil quando permitido.
- [ ] Alterar preset e nome do perfil; confirmar prévia imediata sem persistência automática.
- [ ] Ajustar as 18 cores, tipografia, tamanhos, densidade, espaçamento, raio e altura dos controles.
- [ ] Confirmar diagnóstico dos quatro pares de contraste e comportamento do modo alto contraste.
- [ ] Ativar redução de movimento e confirmar que transições/animações são reduzidas.
- [ ] Salvar perfil da campanha e confirmar sincronização no cliente do jogador.
- [ ] Salvar perfil pessoal e confirmar que ele não altera a aparência dos outros usuários.
- [ ] Descartar alterações e fechar o Estúdio com rascunho aberto; confirmar restauração da aparência anterior.
- [ ] Exportar e reimportar um perfil JSON válido; confirmar preservação dos valores.
- [ ] Tentar importar arquivo JSON inválido, formato incompatível e arquivo acima de 64 KB; confirmar rejeição segura.
- [ ] Restaurar preset e confirmar que todas as personalizações do rascunho são substituídas.

## Superfícies do Foundry

Inspecionar visualmente estados normal, hover, foco, selecionado, desabilitado e conteúdo longo quando aplicável.

- [ ] Sidebar e navegação entre abas.
- [ ] Diretório de Actors, incluindo pastas, entradas, busca e controles.
- [ ] Diretório de Cards.
- [ ] Diretórios de Items, Journals, Playlists, Compêndios, RollTables e Scenes.
- [ ] Navegação de cenas.
- [ ] Controles de canvas.
- [ ] Hotbar.
- [ ] Lista de jogadores.
- [ ] Chat.
- [ ] Janelas ApplicationV2 nativas identificadas pelo sistema.
- [ ] Campos, menus, botões, ícones, bordas, rolagem e textos em cada superfície.

## Temas e compatibilidade visual

- [ ] Testar todos os temas disponíveis, incluindo o tema claro.
- [ ] Confirmar legibilidade e contraste de textos, placeholders, controles e estados ativos.
- [ ] Confirmar que Medieval utiliza sua fonte de preset e Pixel Art utiliza sua fonte de preset.
- [ ] Confirmar que uma fonte explicitamente definida no layout continua tendo precedência local.
- [ ] Verificar que ícones, imagens, miniaturas e indicadores nativos não ficam ocultos ou deformados.
- [ ] Redimensionar a janela e a área do Foundry; verificar overflow e barras de rolagem.
- [ ] Manter fichas NEXUS abertas durante a troca de tema e confirmar que os estilos próprios continuam coerentes.

## Isolamento e regressão

- [ ] Abrir janelas de módulos de terceiros e confirmar que não recebem a classe de tema do NEXUS nem têm sua aparência alterada indevidamente.
- [ ] Testar os módulos usados na campanha, especialmente os que adicionam diretórios ou janelas.
- [ ] Confirmar que nenhuma configuração visual foi gravada em Actor, Item, Token ou Scene.
- [ ] Confirmar que dados, layouts, rolagens, inventário e operações de ficha continuam funcionando.
- [ ] Verificar console dos dois clientes e ausência de erros novos relacionados ao Design System.
- [ ] Repetir a troca de tema após fechar e reabrir diretórios e janelas.

## Resultado

- **Aprovado:** todos os itens aplicáveis foram verificados nos dois clientes, sem regressões.
- **Aprovado com ressalvas:** somente problemas visuais não bloqueadores, documentados com tema, superfície, módulo e captura.
- **Reprovado:** sincronização, persistência, isolamento, legibilidade ou funcionamento de recursos existentes falhou.

Registrar versão/build do NEXUS, versão do Foundry, navegador, módulos ativos, usuário afetado, tema selecionado e evidências de cada falha. Não marcar a PR como pronta para release enquanto houver falha bloqueadora ou itens funcionais não testados.


## Refinamento visual 1.0.0.93

- [ ] Confirmar que todas as aplicações NEXUS (Biblioteca, Estúdio, painéis da ficha e janelas futuras) herdam o shell sem alterar janelas de módulos externos.
- [ ] Abrir Biblioteca pela janela independente e pelo painel da ficha; comparar filtros, cartões, Inspector, estados ativos e rolagem.
- [ ] Redimensionar Biblioteca para largura estreita e confirmar que filtros não ficam cortados nem comprimidos.
- [ ] Clicar na ficha depois de abrir um painel flutuante; confirmar que os trilhos laterais voltam à frente e recebem interação.
- [ ] Clicar no painel flutuante; confirmar que ele próprio fica à frente e os trilhos não roubam o foco.
- [ ] Abrir duas fichas; confirmar que as ferramentas de aparência e a navegação de layouts permanecem dentro das barras laterais de cada ficha, sem trilhos flutuantes externos.
- [ ] Conferir controles do Canvas, navegação, Hotbar e Players em estados normal, hover, ativo e foco; confirmar que fontes e controles nativos usam os tokens globais, preservando fontes de ícones.
- [ ] Enviar mensagens curtas e longas no Chat; conferir que a área de rolagem, o cabeçalho e o corpo usam a mesma família de tema, com cartões internos elevados e sem áreas brancas residuais.
- [ ] Conferir imagens, GIFs, vídeos, áudio, links e embeds enriquecidos nativos no Chat; validar contenção, tamanho e rolagem.
- [ ] Confirmar que URLs comuns não são convertidas em conteúdo executável e que o NEXUS não injeta scripts de mídia.

## Geometria e navegação — etapa de integração nativa

- [ ] Alterar a altura dos controles no Estúdio (mínimo, padrão e máximo) e confirmar que controles nativos e trilhos flutuantes acompanham o perfil.
- [ ] Confirmar que os ícones dos controles laterais permanecem centralizados, proporcionais e sem cortes.
- [ ] Abrir uma cena com nome longo e um mundo com muitas cenas; confirmar rolagem horizontal sem sobreposição ou perda de acesso.
- [ ] Diferenciar visualmente cena visualizada e cena ativa; confirmar que os indicadores nativos de permissão GM continuam legíveis.
- [ ] Redimensionar a viewport para uma largura estreita; confirmar que os controles continuam acessíveis e que os trilhos flutuantes rolam verticalmente quando necessário.
- [ ] Abrir painéis da ficha e confirmar que os trilhos esquerdo/direito ficam fora do conteúdo dos painéis e não bloqueiam seus controles.
- [ ] Testar foco por teclado e `prefers-reduced-motion`.
- [ ] Repetir os testes nos perfis escuro, claro e alto contraste, em cliente GM e jogador.
