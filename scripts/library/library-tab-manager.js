const clone = value => {
  if (typeof globalThis.structuredClone === "function") {
    try { return globalThis.structuredClone(value); } catch {}
  }
  return JSON.parse(JSON.stringify(value ?? {}));
};

const normalizeLocation = location => ({
  smartView: String(location?.smartView ?? "all"),
  folder: String(location?.folder ?? ""),
  collectionId: String(location?.collectionId ?? "")
});

const locationKey = location => {
  const value = normalizeLocation(location);
  return value.smartView + "|" + value.folder + "|" + value.collectionId;
};

export function createLibraryTabManager(initialState = {}, { createId } = {}) {
  const makeId = createId ?? (() => "tab-" + Math.random().toString(36).slice(2, 10));
  let sequence = 0;
  const nextId = () => {
    sequence += 1;
    return String(makeId(sequence));
  };
  const makeTab = (state, title = "Biblioteca") => {
    const snapshot = clone(state);
    const location = normalizeLocation(snapshot);
    return {
      id: nextId(),
      title: String(title || "Biblioteca"),
      state: snapshot,
      history: [location],
      historyIndex: 0
    };
  };
  let tabs = [makeTab(initialState)];
  let activeTabId = tabs[0].id;

  const active = () => tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  const list = () => tabs.map(tab => ({
    id: tab.id,
    title: tab.title,
    active: tab.id === activeTabId,
    historyIndex: tab.historyIndex,
    historyLength: tab.history.length
  }));

  return {
    getActive: active,
    getTabs: list,
    getActiveState: () => active()?.state ?? {},
    setActiveState: state => { active().state = state; },
    activate(id) {
      if (!tabs.some(tab => tab.id === id)) return null;
      activeTabId = id;
      return active();
    },
    create(state = active().state, title = "Nova aba") {
      const tab = makeTab(state, title);
      tabs.push(tab);
      activeTabId = tab.id;
      return tab;
    },
    close(id = activeTabId) {
      const index = tabs.findIndex(tab => tab.id === id);
      if (index < 0) return active();
      const wasActive = tabs[index].id === activeTabId;
      tabs.splice(index, 1);
      if (!tabs.length) {
        const tab = makeTab(initialState, "Biblioteca");
        tabs.push(tab);
        activeTabId = tab.id;
      } else if (wasActive) {
        activeTabId = tabs[Math.max(0, index - 1)].id;
      }
      return active();
    },
    renameActive(title) {
      active().title = String(title || "Biblioteca");
    },
    recordNavigation(location) {
      const tab = active();
      const next = normalizeLocation(location);
      const current = tab.history[tab.historyIndex];
      if (locationKey(current) === locationKey(next)) return false;
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(next);
      if (tab.history.length > 100) tab.history.shift();
      tab.historyIndex = tab.history.length - 1;
      return true;
    },
    canBack: () => active().historyIndex > 0,
    canForward: () => active().historyIndex < active().history.length - 1,
    back() {
      const tab = active();
      if (tab.historyIndex <= 0) return null;
      tab.historyIndex -= 1;
      return clone(tab.history[tab.historyIndex]);
    },
    forward() {
      const tab = active();
      if (tab.historyIndex >= tab.history.length - 1) return null;
      tab.historyIndex += 1;
      return clone(tab.history[tab.historyIndex]);
    },
    resetHistory(location) {
      const tab = active();
      tab.history = [normalizeLocation(location)];
      tab.historyIndex = 0;
    }
  };
}
