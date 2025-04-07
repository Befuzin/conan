/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class dreamingActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
  async rollAbility(abilityKey) {
    const actor = this;
    const ability = actor.system.abilities[abilityKey];
    const flexDie = actor.system.flex?.die || "d6";
  
    // Prompt for Rule of Three
    const ruleMod = await new Promise(resolve => {
      new Dialog({
        title: "Rule of Three Modifier",
        content: `
          <form>
            <div class="form-group">
              <label>Extra Modifier (-3 to +3)</label>
              <input type="number" name="ruleMod" min="-3" max="3" value="0"/>
            </div>
          </form>`,
        buttons: {
          ok: {
            label: "Roll",
            callback: html => resolve(Number(html.find('[name="ruleMod"]').val()))
          }
        },
        default: "ok"
      }).render(true);
    });
  
    // Prepare rolls
    const mainDie = `1${ability.value}`; // e.g., "1d6"
    const totalMod = Number(ability.modifier) + ruleMod;
  
    const mainRoll = await new Roll(mainDie).roll({ async: true });
    const mainResult = mainRoll.terms[0].results[0].result;
    const finalTotal = mainResult + totalMod;
  
    const flexRoll = await new Roll(`1${flexDie}`).roll({ async: true });
    const flexResult = flexRoll.terms[0].results[0].result;
    const flexMax = parseInt(flexDie.slice(1));
  
    const autoFail = mainResult === 1;
    const flexTriggered = flexResult === flexMax;
  
    // Output message
    let content = `<b>${abilityKey.toUpperCase()} Roll</b><br>`;
    content += `Main Die: <strong>${mainResult}</strong><br>`;
    content += `Modifier: ${totalMod >= 0 ? "+" : ""}${totalMod}<br>`;
    content += `<strong>Total: ${finalTotal}</strong><br>`;
    content += `Flex Die (${flexDie}): ${flexResult}<br>`;
  
    if (autoFail) content += `<span style="color:red;"><b>Automatic Failure!</b></span><br>`;
    if (flexTriggered) content += `<span style="color:green;"><b>Flex Triggered!</b></span><br>`;
  
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
  }
  




  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.dreaming || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      const die = ability.value; // e.g., "d6", "d10"
      const mod = ability.modifier ?? 0;
    
      // Combine into rollable string like "1d6+2"
      const modString = mod >= 0 ? `+${mod}` : `${mod}`;
      ability.mod = `1${die}${modString}`;
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }
}
