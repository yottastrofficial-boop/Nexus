/**
 * Canvas gestures, selection visuals, pointer interactions and keyboard controls.
 * The Actor Sheet remains responsible for invoking this controller.
 */
export function activateCanvasInteractions(sheet, html, dependencies) {
  const { NEXUS_LIBRARY_CATALOG, DEFAULT_LAYOUT, THEME_TOKENS, THEME_PALETTES, applyThemeTokens, NexusPanelWindow, buildPropertyPickerCatalog, renderPropertyPicker, activateActorSheetListeners, migrateLegacyActorData, mergeLayoutSnapshots, NEXUS_SKILLS, getNexusBaseModifier, getNexusSkillRows, getNexusSkillModifier, executeTriggeredActions, getTriggeredActions, renderInteractionEditor, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, saveInteractionToLibrary, getComponentInteractions, layoutReadSnapshots, layoutWriteQueues, ActorSheetV2, HandlebarsApplicationMixin, NexusActorSheetBase, COMPONENTS, resolveNexusBinding, expandNexusPropertyExpressions, getResourceValuePaths, clone, getPath, collectPropertyPaths, NATIVE_PROPERTY_BASE, nativePropertyDefinitionCache, EMPTY_NATIVE_PROPERTY_LIST, LEGACY_SKILL_PATHS, invalidateNativePropertyCache, getNativePropertyDefinitions, replaceLayoutBindingPaths, EMPTY_ALIAS_LIST, aliasDefinitionCache, invalidateAliasDefinitionCache, getAliasDefinitions, getCustomAliasData, normalizeAliasDefinition, safeAliasKey, evaluateAliasExpression, getNexusRollAliasEntries, expandNexusRollAliases, getNexusRollData, resolveAliasPath, clamp, DEFAULT_FOUNDRY_TOKEN_IMAGE, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, MEDIA_EXTENSION_PATTERN, VIDEO_EXTENSION_PATTERN, isMediaSource, isVideoSource, isAudioSource, isImageSource, isUsableTokenSource, getFoundryDefaultTokenImage, getTokenImageSource, isSafeLink, setPreviewContent, createSheetResourcePreview, fitSheetResourcePreview, updateSheetResourcePreview, NexusActorSheet } = dependencies;

    sheet._nexusKeyCleanup?.();
    sheet._nexusKeyCleanup = null;

    const root = html?.[0];
    if (!root) return;

    const canvas = root.querySelector(".nexus-canvas");
    if (!canvas) return;
    sheet._selectedIds ??= new Set();
    sheet._nexusCanvasKeyboardFocus ??= false;
    const selectionBox = root.querySelector(".nexus-marquee"), guides = root.querySelector(".nexus-guides");
    const layoutData = () => ({ width: Number(canvas.dataset.layoutWidth) || 800, height: Number(canvas.dataset.layoutHeight) || 800, grid: Number(canvas.dataset.gridSize) || 20, snap: canvas.dataset.snap === "true", smart: canvas.dataset.guides === "true" });
    const stage = root.querySelector(".nexus-canvas-stage");
    const fitCanvas = () => {
      if (!stage) return;
      const l = layoutData();
      const sx = Math.max(1, stage.clientWidth - 24) / l.width;
      const sy = Math.max(1, stage.clientHeight - 24) / l.height;
      const scale = clamp(Math.min(sx, sy), 0.25, 1.5);
      canvas.style.zoom = String(Number(scale.toFixed(4)));
    };
    sheet._fitNexusCanvas = fitCanvas;
    const fitObserver = stage && typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitCanvas) : null;
    fitObserver?.observe(stage); requestAnimationFrame(fitCanvas);
    const layout = sheet._currentLayout ?? {};
    applyThemeTokens(root.querySelector(".nexus-sheet"), layout);
    canvas.style.setProperty("--nexus-font-size", `${layout.fontSize ?? 13}px`);
    canvas.style.setProperty("--nexus-secondary-font-size", `${layout.secondaryFontSize ?? 11}px`);
    canvas.style.setProperty("--nexus-value-font-size", `${layout.valueFontSize ?? 20}px`);
    canvas.style.setProperty("--nexus-canvas-color", layout.canvasColor ?? "#171f2a");
    canvas.style.setProperty("--nexus-card-color", layout.cardColor ?? "#273443");
    canvas.style.setProperty("--nexus-accent-color", layout.accentColor ?? "#52647b");
    canvas.style.setProperty("--nexus-highlight-color", layout.highlightColor ?? "#78b7e8");
    canvas.style.setProperty("--nexus-button-color", layout.buttonColor ?? "#315b7d");
    applyThemeTokens(canvas, layout);
    const appWindow=root.closest(".application, .window-app"); appWindow?.style.setProperty("--nexus-font-family",`"${layout.fontFamily ?? "Inter"}", sans-serif`); appWindow?.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8"); appWindow?.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d");
    const point = e => { const r = canvas.getBoundingClientRect(), l = layoutData(); return { x: (e.clientX-r.left)*(l.width/r.width), y: (e.clientY-r.top)*(l.height/r.height) }; };
    // Os nós dos componentes permanecem os mesmos durante esta ativação do Canvas.
    // Reaproveitar a lista evita querySelectorAll repetido durante gestos e seleção.
    const componentElements = [...canvas.querySelectorAll(".nexus-component")];
    const elements = () => componentElements;
    const rectOf = el => ({ x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0, w: parseFloat(el.style.width)||el.offsetWidth, h: parseFloat(el.style.height)||el.offsetHeight });
    const clampBox = (b,l) => { b.w=Math.max(20,Math.min(b.w,l.width-b.x)); b.h=Math.max(20,Math.min(b.h,l.height-b.y)); b.x=clamp(b.x,0,l.width-b.w); b.y=clamp(b.y,0,l.height-b.h); return b; };
    const clearGuides = () => { if (guides) guides.replaceChildren(); };
    const drawGuides = lines => {
      if (!guides) return;
      guides.replaceChildren(...lines.flatMap(g => {
        const line = document.createElement("i"); line.className = g.axis;
        if (g.axis === "v") Object.assign(line.style, { left: `${g.pos}px`, top: "0", height: `${layoutData().height}px` });
        else Object.assign(line.style, { top: `${g.pos}px`, left: "0", width: `${layoutData().width}px` });
        if (!Number.isFinite(g.distance)) return [line];
        const label = document.createElement("span"); label.className = "nexus-guide-distance"; label.textContent = `${Math.round(g.distance)} px`;
        if (g.axis === "v") Object.assign(label.style, { left: `${g.pos + 7}px`, top: `${g.labelAt ?? 8}px` });
        else Object.assign(label.style, { left: `${g.labelAt ?? 8}px`, top: `${g.pos + 7}px` });
        return [line, label];
      }));
    };
    const anchors = (r,axis) => axis==="x" ? [r.x,r.x+r.w/2,r.x+r.w] : [r.y,r.y+r.h/2,r.y+r.h];
    const otherRects = excluded => {
      const out = [];
      const rectsById = new Map();
      for (const element of elements()) {
        if (element.hidden) continue;
        const id = element.dataset.id;
        const rect = rectOf(element);
        rectsById.set(id, rect);
        if (!excluded.has(id)) out.push(rect);
      }
      for (const group of sheet._activeGroups ?? []) {
        const members = [];
        for (const id of group.componentIds ?? []) {
          if (excluded.has(id)) continue;
          const rect = rectsById.get(id);
          if (rect) members.push(rect);
        }
        if (!members.length) continue;
        const x = Number.isFinite(group.x) ? group.x : Math.min(...members.map(rect => rect.x));
        const y = Number.isFinite(group.y) ? group.y : Math.min(...members.map(rect => rect.y));
        const right = Math.max(Number.isFinite(group.w) ? x + group.w : 0, ...members.map(rect => rect.x + rect.w));
        const bottom = Math.max(Number.isFinite(group.h) ? y + group.h : 0, ...members.map(rect => rect.y + rect.h));
        out.push({ x, y, w: right - x, h: bottom - y });
      }
      return out;
    };
    // Cada caixa usa nove pontos de referência. A grade é aplicada primeiro; o guia inteligente faz o ajuste fino depois.
    const bestMatch = (sources, targets, axis, tolerance=7) => {
      let best=null;
      for(const source of sources) for(const own of anchors(source,axis)) for(const target of targets) for(const other of anchors(target,axis)) {
        const delta = other - own;
        if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          const gapX = Math.max(0, target.x - (source.x + source.w), source.x - (target.x + target.w));
          const gapY = Math.max(0, target.y - (source.y + source.h), source.y - (target.y + target.h));
          const labelY = source.y + source.h <= target.y ? (source.y + source.h + target.y) / 2 : target.y + target.h <= source.y ? (target.y + target.h + source.y) / 2 : (Math.max(source.y, target.y) + Math.min(source.y + source.h, target.y + target.h)) / 2;
          const labelX = source.x + source.w <= target.x ? (source.x + source.w + target.x) / 2 : target.x + target.w <= source.x ? (target.x + target.w + source.x) / 2 : (Math.max(source.x, target.x) + Math.min(source.x + source.w, target.x + target.w)) / 2;
          best = { delta, pos: other, distance: axis === "x" ? gapY : gapX, labelAt: axis === "x" ? labelY : labelX };
        }
      }
      return best;
    };
    const alignMove = (starts, dx, dy, targets) => {
      const moved=starts.map(s=>({x:s.x+dx,y:s.y+dy,w:s.w,h:s.h}));
      const mx=bestMatch(moved,targets,"x"),my=bestMatch(moved,targets,"y");
      const lines=[];if(mx) {dx+=mx.delta;lines.push({axis:"v",pos:mx.pos,distance:mx.distance,labelAt:mx.labelAt});}if(my){dy+=my.delta;lines.push({axis:"h",pos:my.pos,distance:my.distance,labelAt:my.labelAt});}drawGuides(lines);return {dx,dy};
    };
    const alignResize = (box, targets, direction) => {
      const lines=[];
      for(const axis of ["x","y"]){
        const edge=axis==="x"?(direction.includes("w")?"w":direction.includes("e")?"e":null):(direction.includes("n")?"n":direction.includes("s")?"s":null);
        if(!edge)continue;
        const start=axis==="x"?box.x:box.y, size=axis==="x"?box.w:box.h;
        // O ponto fixo do lado oposto permanece parado; a borda e o centro móvel podem encaixar nos três pontos-alvo.
        const candidates=edge==="e"||edge==="s"?[{v:start+size,factor:1},{v:start+size/2,factor:0.5}]:[{v:start,factor:1},{v:start+size/2,factor:0.5}];
        let best=null;
        for(const own of candidates)for(const target of targets)for(const other of anchors(target,axis)){
          const delta=other-own.v;if(Math.abs(delta)<=7&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,pos:other,factor:own.factor};
        }
        if(best){const amount=best.delta/best.factor;if(axis==="x"){if(edge==="w"){box.x+=amount;box.w-=amount;}else box.w+=amount;}else{if(edge==="n"){box.y+=amount;box.h-=amount;}else box.h+=amount;}lines.push({axis:axis==="x"?"v":"h",pos:best.pos});}
      }
      drawGuides(lines);return box;
    };
    const edgeAt = (el,e) => {
      const r=el.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, t=7;
      const n=y<=t,s=y>=r.height-t,w=x<=t, east=x>=r.width-t;
      return `${n?"n":s?"s":""}${w?"w":east?"e":""}` || null;
    };
    // Índices reutilizados durante os gestos; são reconstruídos quando a estrutura dos grupos muda.
    let membersByGroupId = new Map();
    let groupsById = new Map();
    // Renderiza superfícies de grupo sem transformar os membros em um único bloco de dados.
    const renderGroups = () => {
      // Desmonta os contêineres anteriores sem perder os componentes; a reconstrução
      // mantém as coordenadas absolutas relativas ao Canvas (wrapper ocupa 100%).
      canvas.querySelectorAll(".nexus-group-container").forEach(container => {
        container.querySelectorAll(".nexus-component").forEach(component => canvas.append(component));
        container.remove();
      });
      canvas.querySelectorAll(".nexus-group-surface").forEach(element => element.remove());
      for (const element of elements()) {
        delete element.dataset.groupId;
        element.classList.remove("is-group-member", "is-group-inspecting");
        element.style.removeProperty("--nexus-group-bg");
        element.style.removeProperty("--nexus-group-border");
        element.style.removeProperty("--nexus-group-radius");
      }

      const layouts = sheet._currentLayout?.groups ?? [];
      sheet._activeGroups = layouts;
      groupsById = new Map(layouts.map(group => [group.id, group]));
      const groupIdsByComponentId = new Map();
      membersByGroupId = new Map(layouts.map(group => [group.id, []]));
      for (const group of layouts) {
        for (const id of new Set(group.componentIds ?? [])) {
          let memberships = groupIdsByComponentId.get(id);
          if (!memberships) groupIdsByComponentId.set(id, memberships = []);
          memberships.push(group.id);
        }
      }
      for (const element of elements()) {
        for (const groupId of groupIdsByComponentId.get(element.dataset.id) ?? []) {
          membersByGroupId.get(groupId)?.push(element);
        }
      }

      for (const group of layouts) {
        const members = (membersByGroupId.get(group.id) ?? []).filter(element => !element.hidden);
        if (!members.length) continue;
        const rects = members.map(rectOf);
        const x = Math.min(...rects.map(rect => rect.x));
        const y = Math.min(...rects.map(rect => rect.y));
        const right = Math.max(...rects.map(rect => rect.x + rect.w));
        const bottom = Math.max(...rects.map(rect => rect.y + rect.h));
        // A superfície do grupo coincide exatamente com a caixa envolvente dos filhos.
        group.x = x; group.y = y; group.w = right - x; group.h = bottom - y;

        const container = document.createElement("div");
        container.className = "nexus-group-container";
        container.dataset.groupContainer = group.id;
        const surface = document.createElement("div");
        surface.className = `nexus-group-surface${group.hidden ? " is-layer-hidden" : ""}${group.locked ? " is-locked" : ""}`;
        surface.dataset.groupId = group.id;
        surface.hidden = !!group.hidden;
        const baseZ = Math.min(...members.map(element => Number(element.style.zIndex) || 1));
        Object.assign(surface.style, {
          left: `${x}px`, top: `${y}px`, width: `${right - x}px`, height: `${bottom - y}px`,
          zIndex: String(Math.max(0, baseZ - 1))
        });
        surface.style.setProperty("--nexus-group-bg", group.backgroundColor ?? sheet._currentLayout?.cardColor ?? "#273443");
        surface.style.setProperty("--nexus-group-border", group.borderColor ?? "#52647b");
        surface.style.setProperty("--nexus-group-radius", `${clamp(Number(group.borderRadius ?? 8), 0, 32)}px`);
        container.append(surface);
        for (const element of members) {
          element.dataset.groupId = group.id;
          element.classList.add("is-group-member");
          container.append(element);
        }
        canvas.insertBefore(container, canvas.firstChild);
      }
    };
    const updateConnectedCorners = () => {
      const corners = [
        ["tl", r => ({x:r.left,y:r.top})], ["tr", r => ({x:r.right,y:r.top})],
        ["br", r => ({x:r.right,y:r.bottom})], ["bl", r => ({x:r.left,y:r.bottom})]
      ];
      const apply = (nodes, prefix) => {
        const squareClasses = corners.map(([name]) => `${prefix}-corner-square-${name}`);
        nodes.forEach(node => node.classList.remove(...squareClasses));
        const rects = nodes.filter(node => !node.hidden).map(node => ({node,rect:node.getBoundingClientRect()}));
        const tolerance = 2.5;
        const pointTouchesBorder = (point, rect) => {
          const onHorizontal = (Math.abs(point.y-rect.top)<=tolerance || Math.abs(point.y-rect.bottom)<=tolerance) && point.x>=rect.left-tolerance && point.x<=rect.right+tolerance;
          const onVertical = (Math.abs(point.x-rect.left)<=tolerance || Math.abs(point.x-rect.right)<=tolerance) && point.y>=rect.top-tolerance && point.y<=rect.bottom+tolerance;
          return onHorizontal || onVertical;
        };
        for (let i=0;i<rects.length;i++) for (let j=0;j<rects.length;j++) {
          if(i===j) continue;
          const a=rects[i],b=rects[j];
          // Componentes interagem apenas com componentes soltos ou do mesmo grupo.
          // Superfícies de grupo interagem apenas com outras superfícies de grupo.
          if(prefix==="nexus-component" && (a.node.dataset.groupId||null)!==(b.node.dataset.groupId||null)) continue;
          if(prefix==="nexus-component" && (a.node.dataset.groupId||null)===(b.node.dataset.groupId||null) && a.node.dataset.groupId) {
            const groupId=a.node.dataset.groupId;
            const group = groupsById.get(groupId);
            const groupSelected=!!group && (group.componentIds??[]).some(id=>sheet._selectedIds?.has(id));
            if(!groupSelected && !sheet._nexusInteractionActive) continue;
          }
          for(const [name,getPoint] of corners){
            if(pointTouchesBorder(getPoint(a.rect),b.rect)) a.node.classList.add(`${prefix}-corner-square-${name}`);
          }
        }
      };
      apply(elements(),"nexus-component");
      apply([...canvas.querySelectorAll(".nexus-group-surface")],"nexus-group");
    };
    let cornerFrame = 0;
    const scheduleConnectedCorners = () => {
      if (cornerFrame) return;
      cornerFrame = requestAnimationFrame(() => { cornerFrame = 0; updateConnectedCorners(); });
    };
    const syncGroupBounds = (componentNodes = elements(), updateCorners = true) => {
      for (const g of (sheet._activeGroups ?? [])) {
        const members = (membersByGroupId.get(g.id) ?? []).filter(element => !element.hidden);
        if (!members.length) continue;
        const rs = members.map(rectOf), x = Math.min(...rs.map(r=>r.x)), y = Math.min(...rs.map(r=>r.y));
        const right = Math.max(...rs.map(r=>r.x+r.w)), bottom = Math.max(...rs.map(r=>r.y+r.h));
        Object.assign(g,{x,y,w:right-x,h:bottom-y});
        const surface = canvas.querySelector(`.nexus-group-surface[data-group-id="${g.id}"]`);
        if (surface) {
          Object.assign(surface.style,{left:`${x}px`,top:`${y}px`,width:`${right-x}px`,height:`${bottom-y}px`});
          surface.style.setProperty("--nexus-group-bg",g.backgroundColor??sheet._currentLayout?.cardColor??"#273443");
          surface.style.setProperty("--nexus-group-border",g.borderColor??"#52647b");
          surface.style.setProperty("--nexus-group-radius",`${clamp(Number(g.borderRadius??8),0,32)}px`);
        }
      }
      if (updateCorners) scheduleConnectedCorners();
    };
    // Layout comes from the rendered context, avoiding an asynchronous race during listener setup.
    sheet._currentLayout = sheet._currentLayout ?? {groups:[]};
    try {
      const raw = sheet.actor.getFlag("nexus", "layouts") ?? {};
      sheet._currentLayout = raw[sheet._activeLayoutId()] ?? sheet._currentLayout;
    } catch (error) {
      console.warn("NEXUS | Não foi possível recuperar o layout ativo durante a montagem dos grupos", error);
    }
    renderGroups();
    updateConnectedCorners();
    const sizeReadout = document.createElement("div"); sizeReadout.className = "nexus-resize-readout"; sizeReadout.hidden = true; canvas.append(sizeReadout);
    const inspectorWindow = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
    inspectorWindow?.addEventListener("pointerdown", event => { if (event.target.closest(".nexus-panel-window")) { sheet._nexusInteractionActive = false; event.stopPropagation(); } }, true);
    const contextMenu = document.createElement("div"); contextMenu.className = "nexus-context-menu"; contextMenu.hidden = true;
    contextMenu.innerHTML = `<button type="button" data-context-action="add-card">Adicionar card</button><hr><button type="button" data-context-action="edit">Propriedades</button><hr><button type="button" data-context-action="group">Agrupar seleção</button><button type="button" data-context-action="link">Criar vínculo</button><button type="button" data-context-action="ungroup">Desagrupar</button><hr><button type="button" data-context-action="duplicate">Duplicar</button><button type="button" data-context-action="front">Trazer para frente</button><button type="button" data-context-action="back">Enviar para trás</button><hr><button type="button" data-context-action="delete" class="danger">Excluir</button>`;
    root.append(contextMenu);
    const closeContext = () => { contextMenu.hidden = true; };
    contextMenu.addEventListener("click", async event => {
      event.preventDefault(); event.stopPropagation();
      const action = event.target.closest("[data-context-action]")?.dataset.contextAction; if (!action) return; closeContext();
      const ids=[...(sheet._selectedIds??[])];
      if(action==="add-card"){await sheet._addComponent("custom-card", { template: { customLabel: "Card", text: "" } });return;}
      if(action==="edit"){sheet._mode="appearance";sheet._selectedGroupId=null;sheet._openAppearancePanels??=new Set();sheet._openAppearancePanels.add("component");sheet.render({force:true});}
      if(action==="group") await sheet._groupSelection($(root));
      if(action==="link") await sheet._createComponentLink(ids);
      if(action==="ungroup") await sheet._ungroupSelection($(root));
      if(action==="duplicate") await sheet._duplicateComponents(ids);
      if(action==="front") await sheet._changeLayer("front");
      if(action==="back") await sheet._changeLayer("back");
      if(action==="delete") await sheet._deleteComponents(ids);
    });
    root.addEventListener("pointerdown", event => { if(!contextMenu.contains(event.target)) closeContext(); }, true);
    canvas.addEventListener("contextmenu", event => {
      if(sheet._mode!=="appearance") return; event.preventDefault(); event.stopPropagation();
      const component=event.target.closest(".nexus-component");
      const groupSurface=event.target.closest(".nexus-group-surface");
      if(component && !sheet._selectedIds.has(component.dataset.id)) setSelection([component.dataset.id]);
      else if(groupSurface){const group = groupsById.get(groupSurface.dataset.groupId);if(group)setSelection(group.componentIds??[]);}
      const count=sheet._selectedIds?.size??0;
      contextMenu.querySelector('[data-context-action="group"]').disabled=count<2;
      contextMenu.querySelector('[data-context-action="link"]').disabled=count<2;
      contextMenu.querySelector('[data-context-action="ungroup"]').disabled=!(sheet._selectedGroupId || (sheet._activeGroups??[]).some(g=>(g.componentIds??[]).every(id=>sheet._selectedIds.has(id))));
      contextMenu.querySelector('[data-context-action="edit"]').disabled=count!==1;
      contextMenu.querySelectorAll('[data-context-action="duplicate"],[data-context-action="front"],[data-context-action="back"],[data-context-action="delete"]').forEach(b=>{b.disabled=count===0;});
      contextMenu.hidden=false; contextMenu.style.left=`${Math.min(event.clientX-root.getBoundingClientRect().left,root.clientWidth-210)}px`; contextMenu.style.top=`${Math.min(event.clientY-root.getBoundingClientRect().top,root.clientHeight-260)}px`;
    });
    let gesture=null;
    // Centraliza a seleção no método da ficha. A implementação compartilhada
    // protege o inspetor quando o painel ainda não está montado em uma janela.
    const setSelection = ids => {
      const selectedIds = Array.from(ids ?? []).filter(Boolean);
      sheet._setSelection($(root), selectedIds);
      scheduleConnectedCorners();
      canvas.querySelectorAll(".nexus-group-surface").forEach(surface => {
        const group = (sheet._activeGroups ?? []).find(item => item.id === surface.dataset.groupId);
        const hasSelectedMember = !!group && (group.componentIds ?? []).some(id => sheet._selectedIds?.has(id));
        surface.classList.toggle("is-selected", surface.dataset.groupId === sheet._selectedGroupId || hasSelectedMember);
      });
    };
    setSelection([...sheet._selectedIds]);
    let lastComponentPointerDown = { id: null, at: 0 };
    let suppressNativeDoubleClickUntil = 0;
    const openComponentInspector = () => {
      sheet._openAppearancePanels ??= new Set();
      sheet._openAppearancePanels.add("component");
      const portal = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
      const button = portal?.querySelector('[data-floating-panel="component"]');
      const sync = () => {
        const current = sheet._nexusPanelWindows?.get("component");
        if (!current?.rendered) return false;
        current.bringToFront?.();
        current.element?.setAttribute?.("tabindex", "-1");
        if (current.element) current.element.focus({ preventScroll: true });
        const selected = sheet._componentEditorTargetId ? [sheet._componentEditorTargetId] : [...(sheet._selectedIds ?? [])];
        sheet._setSelection?.($(sheet.element), selected);
        return true;
      };
      if (sync()) return;
      button?.click();
      // Panel creation is asynchronous in ApplicationV2; retry on the next frames
      // instead of trying to populate a detached template before it is mounted.
      let attempts = 0;
      const waitForPanel = () => {
        if (sync() || ++attempts >= 30) return;
        requestAnimationFrame(waitForPanel);
      };
      requestAnimationFrame(waitForPanel);
    };
    root.addEventListener("dblclick", event => {
      if (performance.now() < suppressNativeDoubleClickUntil) return;
      if (sheet._mode !== "appearance") return;
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const component = target?.closest(".nexus-component");
      const surface = target?.closest(".nexus-group-surface");
      if (!canvas.contains(component ?? surface)) return;
      if (component) {
        sheet._componentEditorTargetId = component.dataset.id;
        setSelection([component.dataset.id]);
      } else {
        const group = (sheet._activeGroups ?? []).find(item => item.id === surface.dataset.groupId);
        if (!group) return;
        setSelection(group.componentIds ?? []);
      }
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      openComponentInspector();
    }, true);
    const saveAfterGesture = async touched => { await sheet._saveCanvas(html, touched); };
    const beginGroupMove = (group, p, event) => {
      if (!group || group.locked || (group.componentIds ?? []).some(id => sheet._currentLayout?.components?.find(component => component.id === id)?.locked)) return false;
      setSelection(group.componentIds ?? []);
      sheet._selectedGroupId = group.id;
      const starts = (membersByGroupId.get(group.id) ?? []).map(el => ({ el, ...rectOf(el) }));
      if (!starts.length) return false;
      const bounds = {
        x: Math.min(...starts.map(item => item.x)),
        y: Math.min(...starts.map(item => item.y)),
        w: Math.max(...starts.map(item => item.x + item.w)) - Math.min(...starts.map(item => item.x)),
        h: Math.max(...starts.map(item => item.y + item.h)) - Math.min(...starts.map(item => item.y))
      };
      gesture = { type: "group-move", start: p, starts, group, groupStart: bounds };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      return true;
    };
    canvas.tabIndex = 0;
    canvas.addEventListener("focus", () => { sheet._nexusCanvasKeyboardFocus = true; });
    canvas.addEventListener("pointerdown",event=>{
      if(sheet._mode!=="appearance")return;
      if(event.target.closest("button,input,textarea,select,[contenteditable='true']"))return;
      // O foco só vai para o Canvas quando o próprio Canvas recebe interação.
      // Cliques em inspetores e menus não passam por este listener.
      canvas.focus({ preventScroll: true });
      sheet._nexusCanvasKeyboardFocus = true;
      sheet._nexusInteractionActive=true;
      const p=point(event), component=event.target.closest(".nexus-component"), surface=event.target.closest(".nexus-group-surface"), mod=event.ctrlKey||event.metaKey||event.shiftKey;
      if(surface && !component){const group = groupsById.get(surface.dataset.groupId);if(beginGroupMove(group,p,event))return;}
      if(!component && !surface){
        // A superfície visível pode ficar coberta pelos componentes do grupo;
        // detectar o vazio pela caixa geométrica garante que o grupo continue arrastável.
        const hitGroup=[...(sheet._activeGroups??[])].reverse().find(group=>{
          const members = (membersByGroupId.get(group.id) ?? []).filter(element => !element.hidden);
          if(!members.length)return false;
          const rs=members.map(rectOf),left=Math.min(...rs.map(r=>r.x)),top=Math.min(...rs.map(r=>r.y));
          const right=Math.max(...rs.map(r=>r.x+r.w)),bottom=Math.max(...rs.map(r=>r.y+r.h));
          return p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;
        });
        if(hitGroup&&beginGroupMove(hitGroup,p,event))return;
      }
      if(component?.classList.contains("is-locked")) return;
      if(!component){gesture={type:"marquee",start:p,additive:mod,original:new Set(sheet._selectedIds)};selectionBox.hidden=true;Object.assign(selectionBox.style,{left:`${p.x}px`,top:`${p.y}px`,width:"0px",height:"0px"});canvas.setPointerCapture(event.pointerId);event.preventDefault();return;}
      const id=component.dataset.id; let edge=edgeAt(component,event);
      if (sheet._openAppearancePanels?.has("component")) {
        requestAnimationFrame(() => {
          const inspector = sheet._nexusPanelWindows?.get("component");
          if (!inspector?.rendered || !inspector.element?.isConnected) return;
          inspector.bringToFront?.();
          inspector.element.classList.add("nexus-window-active");
          for (const other of sheet._nexusPanelWindows?.values?.() ?? []) if (other !== inspector) other.element?.classList.remove("nexus-window-active");
        });
      }
      if (sheet._selectedIds.size > 1 && sheet._selectedIds.has(id)) edge = null;
      const now = performance.now();
      if (lastComponentPointerDown.id === id && now - lastComponentPointerDown.at <= 380 && !mod) {
        lastComponentPointerDown = { id: null, at: 0 };
        suppressNativeDoubleClickUntil = now + 500;
        sheet._componentEditorTargetId = id;
        setSelection([id]);
        event.preventDefault(); event.stopPropagation();
        openComponentInspector();
        return;
      }
      lastComponentPointerDown = mod ? { id: null, at: 0 } : { id, at: now };
      if(mod){const next=new Set(sheet._selectedIds);next.has(id)?next.delete(id):next.add(id);setSelection([...next]);return;}
      else {
        const groupId = component.dataset.groupId;
        const group = groupId ? (sheet._activeGroups ?? []).find(g => g.id === groupId) : null;
        if (!sheet._selectedIds.has(id)) setSelection([id]);
      }
      const selected=elements().filter(el=>sheet._selectedIds.has(el.dataset.id));
      const starts=selected.map(el=>({el,...rectOf(el)}));
      gesture={type:edge?"resize":"move",direction:edge,start:p,starts,original:new Set(sheet._selectedIds),target:component,historyCaptured:false,moved:false};
      canvas.setPointerCapture(event.pointerId);event.preventDefault();
    });
    let lastCursorTarget = null;
    const processPointerMove = event => {
      if(!gesture){
        if(sheet._mode==="appearance"){
          const target=event.target instanceof Element ? event.target.closest(".nexus-component,.nexus-group-surface") : null;
          if(lastCursorTarget && lastCursorTarget !== target) lastCursorTarget.style.removeProperty("cursor");
          lastCursorTarget = target;
          if(target){
            if(target.classList.contains("nexus-group-surface")) target.style.cursor="grab";
            else { const edge=edgeAt(target,event); target.style.cursor=edge?({n:"ns-resize",s:"ns-resize",e:"ew-resize",w:"ew-resize",ne:"nesw-resize",sw:"nesw-resize",nw:"nwse-resize",se:"nwse-resize"}[edge]):"grab"; }
          }
        }
        return;
      }
      const p=point(event),l=layoutData(),dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;
      if(gesture.type==="marquee"){
        if(Math.abs(dx)+Math.abs(dy)<4)return;
        gesture.moved=true;
        selectionBox.hidden=false;
        const x=Math.min(p.x,gesture.start.x),y=Math.min(p.y,gesture.start.y),w=Math.abs(dx),h=Math.abs(dy);
        Object.assign(selectionBox.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
        const hits=elements().filter(el=>!el.hidden&&(()=>{const r=rectOf(el);return r.x<x+w&&r.x+r.w>x&&r.y<y+h&&r.y+r.h>y;})()).map(el=>el.dataset.id);
        const next = [...new Set([...(gesture.additive?gesture.original:[]),...hits])];
        const current = sheet._selectedIds ?? new Set();
        if (next.length !== current.size || next.some(id => !current.has(id))) setSelection(next);
        return;
      }
      if (Math.abs(dx) + Math.abs(dy) < 0.25) return;
      gesture.moved = true;
      if (!gesture.historyCaptured) { sheet._captureHistory(); gesture.historyCaptured = true; }
      const excluded=new Set(gesture.starts.map(s=>s.el.dataset.id)), targets=otherRects(excluded); clearGuides();
      if(gesture.type==="move"||gesture.type==="group-move"){
        const minX=Math.min(...gesture.starts.map(s=>s.x)),minY=Math.min(...gesture.starts.map(s=>s.y)),maxR=Math.max(...gesture.starts.map(s=>s.x+s.w)),maxB=Math.max(...gesture.starts.map(s=>s.y+s.h));
        let mx=l.snap?Math.round((minX+dx)/l.grid)*l.grid-minX:dx,my=l.snap?Math.round((minY+dy)/l.grid)*l.grid-minY:dy;
        if(l.smart){const sourceRects=gesture.starts.map(s=>({x:s.x,y:s.y,w:s.w,h:s.h}));if(gesture.type==="group-move"&&gesture.groupStart)sourceRects.push({...gesture.groupStart});const aligned=alignMove(sourceRects.map(r=>({x:r.x,y:r.y,w:r.w,h:r.h})),mx,my,targets);mx=aligned.dx;my=aligned.dy;}
        mx=clamp(mx,-minX,l.width-maxR);my=clamp(my,-minY,l.height-maxB);
        for(const s of gesture.starts){s.el.style.left=`${s.x+mx}px`;s.el.style.top=`${s.y+my}px`;}
        if(gesture.type==="group-move"&&gesture.group){gesture.group.x=gesture.groupStart.x+mx;gesture.group.y=gesture.groupStart.y+my;}
        const distance = Math.round(Math.hypot(mx, my));
        sizeReadout.textContent = `${distance} px`;
        sizeReadout.hidden = false;
        sizeReadout.style.left = `${clamp(minX + mx + 8, 4, l.width - 100)}px`;
        sizeReadout.style.top = `${clamp(minY + my - 30, 4, l.height - 32)}px`;
      }else if(gesture.type==="group-resize-disabled"){
        const g=gesture.group,q=gesture.groupStart,d=gesture.direction;let box={...q};
        if(d.includes("e"))box.w=q.w+dx;if(d.includes("s"))box.h=q.h+dy;
        if(d.includes("w")){box.x=q.x+dx;box.w=q.w-dx;}if(d.includes("n")){box.y=q.y+dy;box.h=q.h-dy;}
        box.w=Math.max(100,box.w);box.h=Math.max(70,box.h);
        if(l.snap){if(d.includes("w"))box.x=Math.round(box.x/l.grid)*l.grid;if(d.includes("n"))box.y=Math.round(box.y/l.grid)*l.grid;if(d.includes("e"))box.w=Math.round((box.x+box.w)/l.grid)*l.grid-box.x;if(d.includes("s"))box.h=Math.round((box.y+box.h)/l.grid)*l.grid-box.y;}
        if(l.smart)box=alignResize(box,targets,d);
        const memberLeft=Math.min(...gesture.starts.map(s=>s.x))-10,memberTop=Math.min(...gesture.starts.map(s=>s.y))-10,memberRight=Math.max(...gesture.starts.map(s=>s.x+s.w))+10,memberBottom=Math.max(...gesture.starts.map(s=>s.y+s.h))+10;
        box.x=Math.min(box.x,memberLeft);box.y=Math.min(box.y,memberTop);box.w=Math.max(box.w,memberRight-box.x);box.h=Math.max(box.h,memberBottom-box.y);
        box.x=clamp(box.x,0,l.width-100);box.y=clamp(box.y,0,l.height-70);box.w=Math.min(box.w,l.width-box.x);box.h=Math.min(box.h,l.height-box.y);
        Object.assign(g,{x:box.x,y:box.y,w:box.w,h:box.h});
        const surface=canvas.querySelector(`.nexus-group-surface[data-group-id="${g.id}"]`);if(surface)Object.assign(surface.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.w}px`,height:`${box.h}px`});
        sizeReadout.textContent = `Tamanho: ${Math.round(box.w)} × ${Math.round(box.h)} px`; sizeReadout.hidden = false;
        sizeReadout.style.left = `${clamp(box.x + box.w - 180, 4, l.width - 184)}px`; sizeReadout.style.top = `${Math.max(4, box.y - 34)}px`;
      }else{
        const s=gesture.starts[0],d=gesture.direction;let box={x:s.x,y:s.y,w:s.w,h:s.h};
        if(d.includes("e"))box.w=s.w+dx;if(d.includes("s"))box.h=s.h+dy;
        if(d.includes("w")){box.x=s.x+dx;box.w=s.w-dx;}if(d.includes("n")){box.y=s.y+dy;box.h=s.h-dy;}
        box.w=Math.max(20,box.w);box.h=Math.max(20,box.h);
        if(l.snap){if(d.includes("w"))box.x=Math.round(box.x/l.grid)*l.grid;if(d.includes("n"))box.y=Math.round(box.y/l.grid)*l.grid;if(d.includes("e"))box.w=Math.round((box.x+box.w)/l.grid)*l.grid-box.x;if(d.includes("s"))box.h=Math.round((box.y+box.h)/l.grid)*l.grid-box.y;}
        if(l.smart){
          box=alignResize(box,targets,d);
        }
        box=clampBox(box,l);
        box = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) };
        box=clampBox(box,l);
        Object.assign(s.el.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.w}px`,height:`${box.h}px`});
        sizeReadout.textContent = `Tamanho: ${box.w} × ${box.h} px`; sizeReadout.hidden = false;
        sizeReadout.style.left = `${clamp(box.x + box.w - 180, 4, l.width - 184)}px`; sizeReadout.style.top = `${Math.max(4, box.y - 34)}px`;
      }
      // Os cantos conectados são recalculados ao terminar o gesto, não a cada frame.
      syncGroupBounds(undefined, false);
    };
    // Limita o trabalho pesado de alinhamento/seleção a no máximo um ciclo por frame.
    let pointerMoveFrame = 0;
    let latestPointerMove = null;
    canvas.addEventListener("pointermove", event => {
      latestPointerMove = event;
      if (pointerMoveFrame) return;
      pointerMoveFrame = requestAnimationFrame(() => {
        pointerMoveFrame = 0;
        const latest = latestPointerMove;
        latestPointerMove = null;
        if (latest) processPointerMove(latest);
      });
    });
    const clearInteractionCursor = () => {
      if (lastCursorTarget) lastCursorTarget.style.removeProperty("cursor");
      lastCursorTarget = null;
      canvas.style.removeProperty("cursor");
    };
    canvas.addEventListener("pointerleave", clearInteractionCursor);
    const finish=async(event)=>{if(event?.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) { try { canvas.releasePointerCapture(event.pointerId); } catch(_error) {} } clearInteractionCursor(); if(!gesture){sheet._nexusInteractionActive=false;return;}if(gesture.type==="marquee")selectionBox.hidden=true; sheet._suppressComponentClickUntil = gesture.moved ? performance.now() + 260 : 0;if(gesture.group && gesture.type==="group-move"){const rs=gesture.starts.map(s=>rectOf(s.el));const minX=Math.min(...rs.map(r=>r.x)),minY=Math.min(...rs.map(r=>r.y)),maxX=Math.max(...rs.map(r=>r.x+r.w)),maxY=Math.max(...rs.map(r=>r.y+r.h));gesture.group.x=minX;gesture.group.y=minY;gesture.group.w=maxX-minX;gesture.group.h=maxY-minY;}const shouldSave = gesture.moved && gesture.type !== "marquee"; const touchedIds = shouldSave ? gesture.starts.map(item => item.el.dataset.id) : []; gesture=null;sheet._nexusInteractionActive=false;sizeReadout.hidden=true;clearGuides();renderGroups();scheduleConnectedCorners();if(shouldSave)await saveAfterGesture(touchedIds);};
    canvas.addEventListener("pointerup",finish);canvas.addEventListener("pointercancel",finish);
    canvas.addEventListener("keydown", event => {
      if (sheet._mode !== "play" || !["Enter", " "].includes(event.key)) return;
      if (event.target.closest("input,textarea,select,button,a,[contenteditable=\"true\"]")) return;
      const card = event.target.closest(".nexus-component[data-has-click-interaction=\"true\"]");
      if (!card) return;
      event.preventDefault();
      sheet._runComponentAction(card.dataset.id);
    });
    canvas.addEventListener("click", event => {
      if (sheet._mode !== "play" || performance.now() < (sheet._suppressComponentClickUntil ?? 0)) return;
      const card = event.target instanceof Element ? event.target.closest(".nexus-component[data-has-click-interaction=\"true\"]") : null;
      if (!card || !canvas.contains(card) || event.target.closest("input,textarea,select,button,a,[contenteditable=\"true\"]")) return;
      event.preventDefault();
      sheet._runComponentAction(card.dataset.id, "click");
    });
    canvas.addEventListener("contextmenu", event => {
      if (sheet._mode !== "play") return;
      const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
      if (!card || !canvas.contains(card) || !getTriggeredActions(sheet._currentLayout?.components?.find(item => item.id === card.dataset.id), "rightClick", { actor: sheet.actor }).length) return;
      event.preventDefault(); event.stopPropagation(); sheet._runComponentAction(card.dataset.id, "rightClick");
    });
    canvas.addEventListener("pointerover", event => {
      if (sheet._mode !== "play" || (event.relatedTarget instanceof Node && event.target.closest(".nexus-component")?.contains(event.relatedTarget))) return;
      const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
      if (card && canvas.contains(card)) sheet._runComponentAction(card.dataset.id, "hover");
    });
    canvas.addEventListener("change", event => {
      if (sheet._mode !== "play") return;
      const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
      if (card) sheet._runComponentAction(card.dataset.id, "change", { fieldName: event.target.name ?? "" });
    });
    canvas.addEventListener("submit", event => {
      if (sheet._mode !== "play") return;
      const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
      if (card) sheet._runComponentAction(card.dataset.id, "submit");
    });
    const restoreCanvasKeyboardFocus = () => {
      if (!sheet._nexusCanvasKeyboardFocus) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const liveCanvas = sheet.element?.querySelector?.(".nexus-canvas");
        const active = document.activeElement;
        if (liveCanvas && (active === document.body || active === document.documentElement || active === canvas || !active?.isConnected)) {
          liveCanvas.focus({ preventScroll: true });
        }
      }));
    };
    let keyboardMoveHistoryCaptured = false;
    let keyboardMoveTouched = new Set();
    let keyboardMoveFrame = 0;
    let keyboardMoveDeltaX = 0;
    let keyboardMoveDeltaY = 0;
    let keyboardMoveElements = [];
    let keyboardMoveAllElements = [];
    let keyboardMoveStarts = [];
    let keyboardMoveLayout = null;
    let keyboardMovePending = false;
    const beginKeyboardMove = () => {
      if (keyboardMoveHistoryCaptured) return;
      sheet._captureHistory();
      keyboardMoveHistoryCaptured = true;
      keyboardMoveTouched = new Set();
      keyboardMoveAllElements = elements();
      keyboardMoveElements = keyboardMoveAllElements.filter(el => sheet._selectedIds?.has(el.dataset.id));
      keyboardMoveStarts = keyboardMoveElements.map(el => ({ el, ...rectOf(el) }));
      keyboardMoveLayout = layoutData();
      keyboardMoveDeltaX = 0;
      keyboardMoveDeltaY = 0;
    };
    const applyKeyboardMoveFrame = () => {
      keyboardMoveFrame = 0;
      if (!keyboardMoveElements.length || !keyboardMovePending) return;
      keyboardMovePending = false;
      const minX = Math.min(...keyboardMoveStarts.map(item => item.x));
      const minY = Math.min(...keyboardMoveStarts.map(item => item.y));
      const maxX = Math.max(...keyboardMoveStarts.map(item => item.x + item.w));
      const maxY = Math.max(...keyboardMoveStarts.map(item => item.y + item.h));
      const dx = clamp(keyboardMoveDeltaX, -minX, keyboardMoveLayout.width - maxX);
      const dy = clamp(keyboardMoveDeltaY, -minY, keyboardMoveLayout.height - maxY);
      for (const item of keyboardMoveStarts) {
        item.el.style.left = `${item.x + dx}px`;
        item.el.style.top = `${item.y + dy}px`;
        keyboardMoveTouched.add(item.el.dataset.id);
      }
      syncGroupBounds(keyboardMoveAllElements, false);
    };
    const queueKeyboardMove = (dx, dy) => {
      beginKeyboardMove();
      keyboardMoveDeltaX += dx;
      keyboardMoveDeltaY += dy;
      keyboardMovePending = true;
      if (!keyboardMoveFrame) keyboardMoveFrame = requestAnimationFrame(applyKeyboardMoveFrame);
    };
    const flushKeyboardMove = async () => {
      if (keyboardMoveFrame) { cancelAnimationFrame(keyboardMoveFrame); applyKeyboardMoveFrame(); }
      else if (keyboardMovePending) applyKeyboardMoveFrame();
      if (!keyboardMoveHistoryCaptured) return;
      const touched = [...keyboardMoveTouched];
      keyboardMoveHistoryCaptured = false;
      keyboardMoveTouched = new Set();
      keyboardMoveElements = [];
      keyboardMoveAllElements = [];
      keyboardMoveStarts = [];
      keyboardMoveLayout = null;
      keyboardMovePending = false;
      keyboardMoveDeltaX = 0;
      keyboardMoveDeltaY = 0;
      if (touched.length) {
        renderGroups();
        scheduleConnectedCorners();
        try { await saveAfterGesture(touched); }
        finally { restoreCanvasKeyboardFocus(); }
      }
    };
    const keyboardMoveKeyUp = event => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) void flushKeyboardMove();
    };
    const keyboardMoveBlur = () => { void flushKeyboardMove(); };
        const keyHandler=async event=>{
      const isTypingTarget = event.target?.matches?.("input,textarea,select,[contenteditable=true]") || event.target?.isContentEditable;
      const floating = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
      const panelWindows = [...(sheet._nexusPanelWindows?.values?.() ?? [])];
      const focusedInPanel = !!(floating?.contains(event.target) || panelWindows.some(instance => instance?.element?.contains(event.target)));
      const liveCanvas = sheet.element?.querySelector?.(".nexus-canvas") ?? canvas;
      const activeElement = document.activeElement;
      const focusedInCanvas = !!liveCanvas && (activeElement === liveCanvas || liveCanvas.contains(activeElement)
        || (sheet._nexusCanvasKeyboardFocus && (activeElement === document.body || activeElement === document.documentElement)));
      if (sheet._mode !== "appearance") return;
      // Não deixar Delete/Backspace escapar para o canvas de cena quando o
      // usuário está em um painel do NEXUS; nesses painéis a tecla não exclui
      // componentes nem tokens.
      if ((event.key === "Delete" || event.key === "Backspace") && focusedInPanel && !isTypingTarget) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.(); return;
      }
      if (!focusedInCanvas || focusedInPanel || isTypingTarget) return;
      const mod=event.ctrlKey||event.metaKey;
      if(mod&&event.key.toLowerCase()==="z"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();if(event.shiftKey)await sheet._restoreHistory(sheet._redoStack,sheet._undoStack);else await sheet._restoreHistory(sheet._undoStack,sheet._redoStack);restoreCanvasKeyboardFocus();return;}
      if(mod&&event.key.toLowerCase()==="y"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();await sheet._restoreHistory(sheet._redoStack,sheet._undoStack);restoreCanvasKeyboardFocus();return;}
      if(mod&&event.key.toLowerCase()==="c"){
        const ids=[...(sheet._selectedIds??[])]; if(!ids.length)return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
        const components=(sheet._currentLayout?.components??[]).filter(c=>ids.includes(c.id)).map(clone);
        const groups=(sheet._currentLayout?.groups??[]).filter(g=>(g.componentIds??[]).length>=2&&(g.componentIds??[]).every(id=>ids.includes(id))).map(clone);
        sheet._clipboard={components,groups};return;
      }
      if(mod&&event.key.toLowerCase()==="v"){
        const clip=Array.isArray(sheet._clipboard)?{components:sheet._clipboard,groups:[]}:sheet._clipboard;
        if(!clip?.components?.length)return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();sheet._captureHistory();const layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),l=layouts[active],offset=l.gridSize||20,idMap=new Map(clip.components.map(c=>[c.id,`cmp-${foundry.utils.randomID(8)}`]));const firstStackOrder=Math.max(-1,...l.components.map(c=>Number(c.stackOrder)||0))+1;const copies=clip.components.map((c,index)=>({...clone(c),id:idMap.get(c.id),x:clamp(c.x+offset,0,l.width-c.w),y:clamp(c.y+offset,0,l.height-c.h),z:Number(c.z)||0,stackOrder:firstStackOrder+index}));l.components.push(...copies);l.groups??=[];const groupCopies=(clip.groups??[]).map(g=>({...clone(g),id:`grp-${foundry.utils.randomID(8)}`,componentIds:g.componentIds.filter(id=>idMap.has(id)).map(id=>idMap.get(id))})).filter(g=>g.componentIds.length>=2);l.groups.push(...groupCopies);await sheet._writeLayouts(layouts,active);sheet._selectedIds=new Set(copies.map(c=>c.id));sheet._selectedGroupId=groupCopies[0]?.id??null;sheet.render({ force: true });restoreCanvasKeyboardFocus();return;}
      if(mod&&event.key.toLowerCase()==="a"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();setSelection(elements().map(el=>el.dataset.id));}
      else if(mod&&event.key.toLowerCase()==="d"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();await sheet._duplicateComponents([...sheet._selectedIds]);restoreCanvasKeyboardFocus();}
      else if(event.key==="Escape"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();setSelection([]);sheet._selectedGroupId=null;}
      else if((event.key==="Delete"||event.key==="Backspace")&&sheet._selectedIds.size){
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();await sheet._deleteComponents([...sheet._selectedIds]);restoreCanvasKeyboardFocus();
      }
      else if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key)&&sheet._selectedIds.size){
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
        const l = layoutData();
        const step = event.shiftKey ? Math.max(1, l.grid) * 5 : (l.snap ? Math.max(1, l.grid) : 10);
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        queueKeyboardMove(dx, dy);
      }
    };
    root.tabIndex=0;
    window.addEventListener("keyup", keyboardMoveKeyUp, true);
    window.addEventListener("blur", keyboardMoveBlur);
    const activateInteraction = () => { sheet._nexusInteractionActive = true; };
    const deactivateInteraction = event => {
      const floating = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
      const pickerId = "nexus-property-picker-" + String(sheet.id).replace(/[^a-zA-Z0-9_-]/g, "");
      const propertyPicker = document.getElementById(pickerId);
      const pickerInput = propertyPicker?._nexusOwnerInput;
      const insidePropertyPicker = !!propertyPicker?.contains(event.target);
      const insidePickerInput = pickerInput === event.target;
      if (propertyPicker && !insidePropertyPicker && !insidePickerInput) {
        propertyPicker.hidden = true;
        propertyPicker.dataset.categoryPath = "";
        propertyPicker._nexusOwnerInput = null;
        propertyPicker._nexusOwnerInspector = null;
      }
      const insidePanel = [...(sheet._nexusPanelWindows?.values?.() ?? [])].some(instance => instance.element?.contains(event.target));
      const insideCanvas = canvas.contains(event.target);
      sheet._nexusCanvasKeyboardFocus = insideCanvas;
      if (root.contains(event.target) || floating?.contains(event.target) || insidePanel || insidePropertyPicker || insidePickerInput) sheet._nexusInteractionActive = true;
      else {
        sheet._nexusInteractionActive = false;
        // Cliques fora de toda a interface encerram a seleção e o alvo de edição.
        sheet._componentEditorTargetId = null;
        sheet._setSelection?.($(sheet.element ?? root), []);
      }
    };
    root.addEventListener("pointerdown",activateInteraction,true);
    document.addEventListener("pointerdown",deactivateInteraction,true);
    window.addEventListener("keydown",keyHandler,true);
    sheet._nexusKeyCleanup = () => { void flushKeyboardMove(); window.removeEventListener("keydown",keyHandler,true); window.removeEventListener("keyup",keyboardMoveKeyUp,true); window.removeEventListener("blur",keyboardMoveBlur); document.removeEventListener("pointerdown",deactivateInteraction,true); root.removeEventListener("pointerdown",activateInteraction,true); canvas.removeEventListener("pointerleave",clearInteractionCursor); if(pointerMoveFrame)cancelAnimationFrame(pointerMoveFrame); clearInteractionCursor(); fitObserver?.disconnect(); if(sheet._fitNexusCanvas===fitCanvas)sheet._fitNexusCanvas=null; };
    root.querySelectorAll('[data-action="add-component"]').forEach(button=>{button.draggable=true;button.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",button.dataset.type));});
    canvas.addEventListener("dragover",e=>e.preventDefault());
    canvas.addEventListener("drop",async e=>{e.preventDefault();const type=e.dataTransfer.getData("text/plain");if(!COMPONENTS[type])return;const p=point(e),layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),l=layouts[active];sheet._captureHistory();const w=100,h=100;let x=p.x-w/2,y=p.y-h/2;if(l.snapEnabled){x=Math.round(x/l.gridSize)*l.gridSize;y=Math.round(y/l.gridSize)*l.gridSize;}const id=`cmp-${foundry.utils.randomID(8)}`;l.components.push({id,type,x:clamp(x,0,l.width-w),y:clamp(y,0,l.height-h),w,h,z:0,stackOrder:Math.max(-1,...l.components.map(c=>Number(c.stackOrder)||0))+1});sheet._selectedIds=new Set([id]);await sheet._writeLayouts(layouts,active);sheet.render({ force: true });});
}
