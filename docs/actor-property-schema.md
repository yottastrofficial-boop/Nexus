# NEXUS Actor Property Schema

**Schema version:** 2  
**Source of mechanics:** `REGRAS NEXUS.pdf` (core rulebook)  
**Scope:** Actor/personagem properties. Item documents keep their own data model and are not mixed into this registry.

## Design principles

- Stable technical keys are independent from Portuguese display labels.
- `name` identifies the property; `exib` is its short display label; `value` is the value used by formulas and bindings.
- Stored values and formula-backed values are separate. Default formulas for derived properties are displayed and editable in the Inspector; a manual value or custom formula can replace the default.
- Actor data remains under `system.*`; paths are exposed without requiring the UI to know how a value is calculated.
- Legacy paths remain readable where practical, while migrations normalize stored data to the current shape.

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
- `skills.<key>.value`: numeric total modifier (attribute + MB when proficient).
- `skills.<key>.proficient`: boolean training state.
- `skills.<key>.attribute`: associated attribute code.
- `skills.<key>.description`: rulebook summary.

Example: `skills.stealth.name`, `skills.stealth.exib`, `skills.stealth.value`.

The old signed `proficientLevel` representation is migrated to a boolean. Negative proficiency is not part of the core rulebook model.

### Resources

PV, PM and PE expose `name`, `exib`, `value`, `max` and `temporary`. The numeric values remain stored in `system.resources.<resource>`.

The PE recovery reference is exposed as `resources.pe.recovery.value`.

### Progression and recovery

- `identity.level`: stored character level.
- `progression.mb.value`: derived MB.
- `recovery.count.value`: number of recovery dice, derived from level.
- `recovery.die.value`: recovery die size, derived from level.
- `recovery.spent`: stored number of spent dice.
- `recovery.available.value`: remaining dice.

### Movement, defense and initiative

- `combat.movement.value`: stored movement in grid spaces.
- `combat.movement.meters`: derived conversion using 1.5 m per grid space.
- `combat.defense.value`: derived base defense using the rulebook formula and the stored additional modifier.
- `combat.initiative.value`: derived from the relevant attribute.

The former `combat.mb`, `combat.ddr`, `combat.desl` and scalar `combat.defense` paths are read as compatibility aliases where applicable.

### Carrying capacity

- `encumbrance.base.value`: base capacity.
- `encumbrance.bonus.value`: attribute contribution.
- `encumbrance.capacity.value`: derived total capacity.
- `encumbrance.current.value`: stored current load.
- `encumbrance.overloaded.value`: derived comparison.

Current load is a stored total. Automatic summation from embedded Items is intentionally kept separate for a later inventory integration.

### Identity, personality and conditions

Identity fields include concept, ancestry, lineage, legacy, talent, class, archetype, function and level. The actor's name remains the Foundry document name and is available through `name` and the compatibility alias `identity.name`.

Personality fields include appearance, traits, flaws, bonds, ideals, motivation and alignment. Conditions are stored as a collection so the system can represent ordinary conditions and cumulative condition levels without inventing parallel numeric attributes.

## Migration behavior

The migration:
- Converts old skill proficiency values to booleans.
- Removes old derived MB and recovery-count fields from persisted combat data.
- Converts a non-default legacy defense total into an additional modifier, preserving the existing total where possible.
- Moves the legacy movement alias into the canonical movement field when needed.
- Initializes temporary resource values, recovery tracking, carrying-load tracking and conditions.
- Clears the old native-property override list so the new registry becomes authoritative.
- Preserves custom aliases and custom alias data.

## Foundry and other systems: architectural lessons

The implementation follows Foundry's separation between document data, schema definitions and derived data. D&D5e demonstrates the value of stable internal identifiers plus separate labels and abbreviations for abilities and skills. Call of Cthulhu and Tormenta20 are treated as examples of system-specific Actor data models rather than sources of NEXUS mechanics.

No game rules are imported from those systems. NEXUS's names, attributes, skills and formulas remain grounded in its own core rulebook.

## Organização do seletor (1.0.0.33)

- Os caminhos canônicos de token ficam sob `identity.token.*`; os aliases de compatibilidade `token.img` e `token.border` continuam resolvíveis em expressões antigas, mas não aparecem como propriedades independentes.
- As propriedades de carga são apresentadas diretamente sob o grupo `encumbrance` (Carga): Base, Bônus, Capacidade, Atual e Excedida.
- O caminho legado `encumbrance.current` é ocultado no catálogo quando o caminho canônico `encumbrance.current.value` está disponível. A origem persistida da carga atual permanece compatível com o campo já existente.
