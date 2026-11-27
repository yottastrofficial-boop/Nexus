# NEXUS — Compatibilidade e processamento de mídia

## Estado
Infraestrutura-base implementada na 1.0.0.85: registry, detecção, capacidades nativas, pipeline de adaptadores, contrato de Worker local, armazenamento Foundry/externo e cache IndexedDB. Decoders FFmpeg/libjxl e UI de mídia continuam pendentes.

## Objetivo
O NEXUS terá camada própria e extensível para identificar, pré-visualizar, analisar, reproduzir e, quando permitido, converter formatos. “Suporte integral” significa capacidades verificáveis por família: identificar, ler, pré-visualizar, reproduzir, extrair metadados e converter quando possível. Não existe decodificador universal para todo formato existente; arquivos proprietários, criptografados ou sem implementação disponível podem continuar sem suporte.

## Motor híbrido próprio
1. **Nativo:** usar navegador/Electron quando houver suporte; consultar canPlayType, MediaCapabilities.decodingInfo() e testes reais. Não inferir AV1 apenas por extensão.
2. **FFmpeg.wasm customizado:** core próprio, seletivo e executado em Web Worker. Avaliar libdav1d para AV1, libopus para Opus e libjxl para JXL. O suporte real depende de compilar e testar os componentes no binário NEXUS; builds padrão não garantem essas bibliotecas.
3. **Decodificadores especializados:** manter libjxl WASM separado quando gerar bundle menor ou melhor integração para imagens.
4. **Adaptadores:** declarar formatos, codecs, operações, memória, tamanho, licenças, versão e carregamento sob demanda.

## Cobertura prioritária
| Formato/codec | Estratégia | Observação |
|---|---|---|
| JXL | Nativo; libjxl WASM ou FFmpeg customizado | Preservar HDR, perfil de cor, transparência e animação quando o decoder suportar |
| AV1 | Nativo; fallback FFmpeg/libdav1d WASM | Codec, não extensão; pode estar em WebM/MP4 |
| Opus | Nativo; fallback FFmpeg/libopus WASM | Codec em Ogg/WebM |
| AVIF, WebP, PNG, JPEG, GIF | Nativo ou decoder WASM | Preservar animação/metadados quando suportados |
| MP4, WebM, Ogg, WAV, MP3, FLAC | Nativo ou FFmpeg WASM | Distinguir contêiner de codec |
| PDF | Visualizador dedicado | Fora do escopo do FFmpeg |
| Fontes, modelos 3D, arquivos compactados | Adaptadores por família | Reconhecer extensão não significa suportar leitura |

## Identificação
Prioridade: assinatura binária, metadados do contêiner, MIME e extensão. Extensão não prova o conteúdo. AV1 em WebM/MP4 só é confirmado após identificar a faixa; Ogg não deve ser rotulado como Opus sem verificar o codec.

## Armazenamento e limite Foundry
A API V14 documenta CONST.UPLOADABLE_FILE_EXTENSIONS; JXL não aparece na lista consultada, enquanto Opus, WebM e AVIF aparecem. FilePicker.upload e uploadPersistent enviam arquivos ao servidor, mas não mudam a política de extensões do servidor.

Adaptadores previstos:
- Foundry para extensões aceitas;
- storage externo configurado (incluindo origem S3 disponível no Foundry) para originais incompatíveis;
- fallback compatível derivado para prévia, mantendo hash e referência do original;
- IndexedDB somente como cache/rascunho local, nunca como única cópia compartilhada.

Não falsificar extensões nem assumir que alterar MIME no cliente libera upload. Sem backend compartilhado externo ou suporte no servidor, o cliente NEXUS não consegue adicionar suporte de upload ao servidor Foundry.

## Preservação e desempenho
Preservar originais quando o backend permitir; miniaturas são derivadas descartáveis. Nunca substituir original sem confirmação. Registrar hash, dimensões, duração, perfil de cor, codec, versão do decoder e origem da derivação. Carregar WASM sob demanda, processar em Workers, limitar memória/resolução/concorrência, cancelar ao fechar janela e usar cache por hash + versão + parâmetros. Build single-thread é obrigatório; multi-thread é opcional e não deve exigir SharedArrayBuffer.

## Licenças e segurança
Registrar licença, versões, origem, configuração de build, hashes e avisos. Não baixar WASM de CDN implicitamente. Validar arquivos, limites de processamento e falhas de decodificação.

## Critérios de aceite
- JXL é decodificado por WASM testado quando o navegador não suporta.
- AV1 é detectado como codec real e reproduzido nativamente ou via Worker.
- Opus é identificado e reproduzido nos contêineres testados.
- Conversão não perde o original.
- Formato incompatível com upload Foundry informa e oferece storage alternativo.
- Arquivos malformados/grandes não travam a ficha.
- Falha de WASM não impede o uso dos demais recursos.


## Implementação da infraestrutura — 1.0.0.85

- `scripts/core/media-service.js` inspeciona arquivos por assinatura/MIME/extensão, consulta capacidades nativas, decodifica imagens quando `createImageBitmap` suporta o formato e oferece pipeline de adaptadores com carregamento sob demanda e fallback quando um decoder falha.
- O contrato `createWorkerMediaAdapter()` envia arquivos para Workers de mesma origem, com mensagens correlacionadas, timeout e encerramento explícito. `installNexusMediaWorkerRuntime()` padroniza o protocolo para Workers especializados.
- `scripts/core/media-storage.js` oferece adaptador Foundry via API pública `FilePicker.upload`, roteador para backends externos configurados, cache IndexedDB local com descarte por antiguidade e chave de cache baseada em SHA-256.
- A inicialização expõe os serviços em `game.nexus.media`; módulos podem registrar adaptadores locais e backends externos.

### Cobertura real desta versão

- O adaptador nativo usa capacidades reais do navegador e não presume que um formato é decodificável só porque foi identificado.
- O adaptador Foundry só aceita extensões presentes em `CONST.UPLOADABLE_FILE_EXTENSIONS`.
- O adaptador externo é apenas um contrato plugável: nenhum provedor externo vem configurado por padrão.
- O Worker é uma infraestrutura de execução; nenhum binário FFmpeg/libdav1d/libopus/libjxl é distribuído nesta versão.
- AV1 e Opus só são considerados codecs identificados quando há metadados reais fornecidos por um probe/adaptador; o contêiner por si só não basta.
- JXL só pode ser pré-visualizado nativamente quando o ambiente oferece decoder compatível ou por um adaptador libjxl registrado.

Assim, a versão conclui a infraestrutura extensível e os caminhos de integração, mas não declara suporte de decodificação universal ou conversão FFmpeg/JXL já entregue.


## Movimentação de arquivos no Foundry V14 — 1.0.0.132

A API pública de `FilePicker` documenta `browse`, `createDirectory`, `upload` e `uploadPersistent`, mas não documenta uma operação pública de mover ou excluir arquivos. A Biblioteca pode mover **referências** entre pastas lógicas do usuário; isso não altera o caminho físico do arquivo. Uma mudança física só poderá ser habilitada por um adaptador de storage que ofereça explicitamente essa capacidade no servidor. Não implementar um falso "move" baseado em copiar e apagar sem confirmação de que ambas as operações existem e sem mecanismo de rollback.

Referência: [FilePicker — API V14](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.FilePicker.html).
