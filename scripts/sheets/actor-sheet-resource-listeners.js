/**
 * Play-mode controls for resource meters and sliders.
 * Persistence remains delegated to the Actor sheet's value updater.
 */
export function activateActorSheetResourceListeners(sheet, html, dependencies) {
  const { clamp, updateSheetResourcePreview } = dependencies;

  const setResourceFromTrack = (track, event) => {
    if (sheet._mode !== "play") return;
    const card = track.closest(".nexus-component");
    const slider = card?.querySelector("[data-resource-slider]");
    if (!slider) return;
    const rect = track.getBoundingClientRect();
    const vertical = track.classList.contains("nexus-sheet-resource-track")
      && track.closest(".nexus-sheet-resource-preview")?.classList.contains("is-vertical");
    const ratio = vertical
      ? 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)))
      : Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const min = Number(slider.min || 0);
    slider.value = String(Math.round(min + ratio * (Number(slider.max) - min)));
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  };

  html.find(".nexus-component[data-action-type='resource-slider'] .nexus-resource-bar, .nexus-component[data-action-type='resource-slider'] .nexus-sheet-resource-track, .nexus-component[data-action-type='resource-slider'] .nexus-asset-meter-track")
    .on("pointerdown", event => {
      if (event.button !== 0 || sheet._mode !== "play") return;
      event.preventDefault();
      const track = event.currentTarget;
      track.setPointerCapture?.(event.pointerId);
      setResourceFromTrack(track, event);
    })
    .on("pointermove", event => {
      if (event.buttons === 1) setResourceFromTrack(event.currentTarget, event);
    })
    .on("pointerup", event => {
      const track = event.currentTarget;
      setResourceFromTrack(track, event);
      track.closest(".nexus-component")?.querySelector("[data-resource-slider]")?.dispatchEvent(new Event("change", { bubbles: true }));
    });

  html.find("[data-resource-slider]").on("input", event => {
    const input = event.currentTarget;
    const card = input.closest(".nexus-component");
    if (!card) return;
    const max = Number(input.max);
    const value = Number(input.value);
    const percent = max > 0 ? clamp(value / max * 100, 0, 100) : 0;
    const vertical = !!card.querySelector(".nexus-sheet-resource-preview.is-vertical");
    card.querySelectorAll(".nexus-resource-bar-fill,.nexus-asset-meter-fill").forEach(fill => {
      fill.style.width = vertical ? "100%" : percent + "%";
      fill.style.height = vertical ? percent + "%" : "100%";
    });
    card.querySelector(".nexus-resource-ring")?.style.setProperty("--nexus-resource-percent", percent + "%");
    const resourceValues = card.querySelector(".nexus-resource-values");
    const ringValues = card.querySelector(".nexus-resource-ring-values");
    const barValues = card.querySelector(".nexus-resource-bar-values");
    for (const values of [resourceValues, ringValues]) {
      const current = values?.querySelector("strong");
      if (current) current.textContent = String(value);
    }
    const barCurrent = barValues?.querySelector("strong");
    if (barCurrent) barCurrent.textContent = String(value);
    const component = (sheet._currentLayout?.components ?? []).find(item => item.id === card.dataset.id);
    if (component?.type === "sheet-resource") {
      const preview = card.querySelector(".nexus-sheet-resource-preview");
      updateSheetResourcePreview(preview, {
        label: component.sheetContent1 ?? "PV",
        icon: component.sheetContent2 ?? "❤️",
        current: value,
        max,
        color: component.sheetColor ?? "#d94b4b",
        trackColor: component.sheetTrackColor ?? "#080d14",
        orientation: component.sheetOrientation ?? "horizontal"
      });
      const values = card.querySelector(".nexus-sheet-resource-values");
      if (values && !values.querySelector("input")) values.textContent = value + " / " + max;
    }
  });

  html.find("[data-resource-slider]").on("change", async event => {
    const input = event.currentTarget;
    if (!input.dataset.systemPath) return;
    await sheet._updateSystemValue(input);
  });
}
