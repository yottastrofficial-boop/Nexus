/**
 * Skill and proficiency controls for the Actor sheet.
 * The sheet class owns the underlying roll and persistence operations.
 */
export function activateActorSheetSkillListeners(sheet, html, dependencies) {
  const { NEXUS_SKILLS, getNexusSkillModifier } = dependencies;

  html.find("[data-skill-roll]").on("click", event => {
    event.preventDefault();
    event.stopPropagation();
    return sheet._rollSkill(event.currentTarget.dataset.skillRoll);
  });

  html.find("[data-skill-proficient-level]").on("change", event => {
    const input = event.currentTarget;
    if (input.value === "" || !Number.isFinite(Number(input.value))) return;
    return sheet._setSkillProficientLevel(input.dataset.skillProficientLevel, Number(input.value));
  });

  html.find("[data-proficiency-level]").on("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const card = button.closest(".nexus-component");
    if (card) sheet._setProficiencyLevel(card.dataset.id, Number(button.dataset.proficiencyLevel));
  });

  html.find("[data-skill-proficiency-toggle]").on("click", async event => {
    const button = event.currentTarget;
    const skill = NEXUS_SKILLS.find(item => item.key === button.dataset.skillProficiencyToggle);
    if (!skill || sheet._mode !== "play") return;
    event.preventDefault();
    event.stopPropagation();
    const current = getNexusSkillModifier(sheet.actor, skill.key);
    const currentLevel = Number(current?.proficientLevel) || 0;
    const nextLevel = event.altKey ? 0 : currentLevel + (event.shiftKey ? -1 : 1);
    const componentId = button.closest(".nexus-component")?.dataset.id;
    await sheet._setSkillProficientLevel(skill.key, nextLevel);
    if (componentId) await sheet._runComponentAction(componentId, "click");
  });
}
