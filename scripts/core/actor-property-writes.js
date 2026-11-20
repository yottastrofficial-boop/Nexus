const actorPropertyWriteQueues = new WeakMap();

/**
 * Serialize property writes per Actor so concurrent UI changes cannot overwrite
 * each other with stale snapshots.
 */
export function serializeActorPropertyWrite(actor, operation) {
  const previous = actorPropertyWriteQueues.get(actor) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  const tracked = next.catch(error => {
    console.error("NEXUS | Falha ao salvar uma propriedade do Actor.", error);
    globalThis.ui?.notifications?.error?.("Não foi possível concluir o salvamento da propriedade. Confira o valor antes de continuar.");
    throw error;
  });
  actorPropertyWriteQueues.set(actor, tracked);
  return tracked.finally(() => {
    if (actorPropertyWriteQueues.get(actor) === tracked) actorPropertyWriteQueues.delete(actor);
  });
}

export async function writePropertyExpression(actor, path, expression) {
  const current = foundry.utils.deepClone(actor.getFlag?.("nexus", "propertyExpressions") ?? actor.flags?.nexus?.propertyExpressions ?? {});
  const parts = String(path).split(".");
  let parent = current;
  for (const part of parts.slice(0, -1)) {
    if (!parent[part] || typeof parent[part] !== "object") parent[part] = {};
    parent = parent[part];
  }
  if (expression === null) delete parent[parts.at(-1)];
  else parent[parts.at(-1)] = String(expression).slice(0, 500);
  await actor.setFlag("nexus", "propertyExpressions", current);
}
