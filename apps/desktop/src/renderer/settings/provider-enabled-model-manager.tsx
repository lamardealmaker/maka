import { MultiSelector } from '@astryxdesign/core';
import type { MultiSelectorOptionType } from '@astryxdesign/core/MultiSelector';
import type { ModelCatalogEntry } from '@maka/core/model-catalog';
import { useUiLocale } from '@maka/ui';
import { getProviderSettingsCopy } from '../locales/settings-provider-copy';

/**
 * Adapts Maka's model catalog to Astryx's multi-select field.
 *
 * A CheckboxList was the wrong shape here: Astryx scopes it to 3–7 options and
 * says to use MultiSelector past that, and a provider like OpenAI lists dozens —
 * the settings page turned into a wall of checkboxes taller than everything else
 * on it combined. MultiSelector keeps the same one-line field weight as the
 * selectors around it, and brings the search that a list that long needs.
 *
 * `enabledModelIds` remains the only product state. Models the user declared by
 * hand sit in their own titled section rather than being spelled into a label:
 * the selector groups them, so "which of these did the provider advertise" is
 * answered by structure and stays true when the label is truncated.
 *
 * Adding is a separate act with its own dialog — see provider-add-model-dialog.
 * Its button lives beside 测试连接 in the section's action row, not under this
 * field: all three act on the section, and stacking them read as two unrelated
 * button rows.
 */
export function EnabledModelManager(props: {
  modelChoices: ModelCatalogEntry[];
  enabledModelIds: string[];
  disabled: boolean;
  onChange(ids: string[]): void;
}) {
  const copy = getProviderSettingsCopy(useUiLocale()).detail;
  const byId = new Map(props.modelChoices.map((model) => [model.id, model] as const));

  const { options, count } = (() => {
    const seen = new Set<string>();
    const catalogued: Array<{ value: string; label: string }> = [];
    const manual: Array<{ value: string; label: string }> = [];
    for (const model of props.modelChoices) {
      if (!model.canUseAsChatDefault) continue;
      seen.add(model.id);
      catalogued.push({ value: model.id, label: modelDisplayLabel(model) });
    }
    // Always surface an already-enabled model even if it is not a current
    // chat-default candidate (a stale id, a model dropped from the latest
    // catalog, or an ID the user entered by hand), so the user can still
    // toggle it off.
    for (const id of props.enabledModelIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const model = byId.get(id);
      if (model) catalogued.push({ value: id, label: modelDisplayLabel(model) });
      else manual.push({ value: id, label: id });
    }
    const list: MultiSelectorOptionType[] = [...catalogued];
    if (manual.length > 0) {
      list.push({ type: 'section', title: copy.manualModelSection, options: manual });
    }
    return { options: list, count: catalogued.length + manual.length };
  })();

  return (
    <MultiSelector
      label={copy.enabledModels}
      // The section is already headed 模型 and says what the list is for; a
      // visible field label repeated it in a third type style. Kept as the
      // accessible name so the trigger still announces what it selects.
      isLabelHidden
      options={options}
      value={props.enabledModelIds}
      onChange={props.onChange}
      isDisabled={props.disabled || count === 0}
      disabledMessage={count === 0 ? copy.noModels : undefined}
      placeholder={copy.noModels}
      // Names, not "N selected": Astryx hard-codes the English word into the
      // count display, and the labels answer "which ones" in the same width.
      triggerDisplay="labels"
      hasSearch
      searchPlaceholder={copy.searchModels}
      hasSelectAll
      selectAllLabel={copy.selectAllModels}
      width="100%"
    />
  );
}

function modelDisplayLabel(model: Pick<ModelCatalogEntry, 'id' | 'displayName'>): string {
  return model.displayName?.trim() || model.id;
}
