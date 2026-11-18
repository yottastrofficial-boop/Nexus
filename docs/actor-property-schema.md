# NEXUS Actor Property Schema

**Schema version:** 4  
**Source of mechanics:** `REGRAS NEXUS.pdf` (core rulebook)  
**Scope:** Actor/personagem properties. Item documents keep their own data model and are not mixed into this registry.

## Design principles

- Stable technical keys are independent from Portuguese display labels.
- `name` identifies the property; `exib` is its short display label; `value` is the value used by formulas and bindings.
- Mechanical properties are stored values by default; the Core does not assign pre-made calculations or formulas to them.
- Formulas may be supplied by imported Library cards or explicitly configured by the user. They read current Actor values and are re-evaluated when dependencies change.
- Actor data remains under `system.*`; the property layer exposes paths without imposing a calculation.
- Legacy paths remain readable where practical, while migrations preserve user-authored values.

## Canonical property families

### Attributes

Six modifiers grouped into the three rulebook nuclei. The nuclei are organizational groups, not additional numeric attributes.

- `attributes.for.name`, `attributes.for.exib`, `attributes.for.value`
- `attributes.des.name`, `attributes.des.exib`, `attributes.des.value`
- `attributes.sab.name`, `attributes.sab.exib`, `attributes.sab.value`
- `attributes.int.name`, `attributes.int.exib`, `attributes.int.value`
- `attributes.car.name`, `attributes.car.exib`, `attributes.car.value`
- `attributes.von.name`, `attributes.von.exib`, `attributes.von.value`

The stored numeric values remain at `system.attributes.<key>`. The `.value` property maps to that source path.

### Skills

Every skill has the same contract:

- `skills.<key>.name`: Portuguese display name.
- `skills.<key>.exib`: short label for compact UI.
- `skills.<key>.value`: stored numeric value; no automatic attribute/MB calculation is applied by the property layer.
- `skills.<key>.proficientLevel`: persisted numeric proficiency level.
- `skills.<key>.proficient`: derived boolean training state.
- `skills.<key>.attribute`: associated attribute code.
- `skills.<key>.description`: rulebook summary.

Example: `skills.stealth.name`, `skills.stealth.exib`, `skills.stealth.value`.

`proficientLevel` is the canonical persisted numeric field. `0` means no proficiency, positive values indicate proficiency, and negative values represent deficiency in the current NEXUS implementation. The magnitude remains available to explicit formulas. The Core does not calculate a default skill total from attributes, proficiency or MB.

### Resources

PV, PM and PE expose `name`, `exib`, `value`, `max` and `temporary`. The numeric values remain stored in `system.resources.<resource>`.

The PE recovery reference is exposed as `resources.pe.recovery.value`.

### Progression and recovery

- `identity.level`: stored character level.
- `progression.mb.value`: stored MB value.
- `recovery.count.value`: stored number of recovery dice.
- `recovery.die.value`: stored recovery die size.
- `recovery.spent`: stored number of spent dice.
- `recovery.available.value`: stored number of remaining dice.

### Movement, defense and initiative

- `combat.movement.value`: stored movement value.
- `combat.movement.meters`: stored value; no automatic unit conversion is applied.
- `combat.defense.value`: stored defense value.
- `combat.initiative.value`: stored initiative value.

The former `combat.mb`, `combat.ddr`, `combat.desl` and scalar `combat.defense` paths are read as compatibility aliases where applicable.

### Carrying capacity

- `encumbrance.base.value`: stored base capacity.
- `encumbrance.bonus.value`: stored bonus.
- `encumbrance.capacity.value`: stored total capacity.
- `encumbrance.current.value`: stored current load.
- `encumbrance.overloaded.value`: stored state.

Current load is a stored total. Automatic summation from embedded Items is intentionally kept separate for a later inventory integration.

### Identity, personality and conditions

Identity fields include concept, ancestry, lineage, legacy, talent, class, archetype, function and level. The actor's name remains the Foundry document name and is available through `name` and the compatibility alias `identity.name`.

Personality fields include appearance, traits, flaws, bonds, ideals, motivation and alignment. Conditions are stored as a collection so the system can represent ordinary conditions and cumulative condition levels without inventing parallel numeric attributes.

## Migration behavior

The migration:
- Normalizes legacy skill proficiency representations into the canonical numeric `proficientLevel` field and removes obsolete boolean fields.
- Preserves manually stored mechanical values, including MB, defense, initiative, recovery values, PE recovery and carrying-capacity totals.
- Copies the legacy movement alias into the current movement field only when the current field is absent; it does not delete the legacy value.
- Initializes missing temporary resource values and conditions without replacing existing values.
- Preserves native property definitions, custom aliases and custom alias data.

## Foundry and other systems: architectural lessons

The implementation follows Foundry's separation between document data, schema definitions and derived data. D&D5e demonstrates the value of stable internal identifiers plus separate labels and abbreviations for abilities and skills. Call of Cthulhu and Tormenta20 are treated as examples of system-specific Actor data models rather than sources of NEXUS mechanics.

No game rules are imported from those systems. NEXUS's names, attributes, skills and formulas remain grounded in its own core rulebook.

## Organização do seletor (1.0.0.33)

- Os caminhos canônicos de token ficam sob `identity.token.*`; os aliases de compatibilidade `token.img` e `token.border` continuam resolvíveis em expressões antigas, mas não aparecem como propriedades independentes.
- As propriedades de carga são apresentadas diretamente sob o grupo `encumbrance` (Carga): Base, Bônus, Capacidade, Atual e Excedida.
- O caminho legado `encumbrance.current` é ocultado no catálogo quando o caminho canônico `encumbrance.current.value` está disponível. A origem persistida da carga atual permanece compatível com o campo já existente.
