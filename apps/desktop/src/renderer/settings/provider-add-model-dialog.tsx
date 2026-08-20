import { useState, type FormEvent } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Button, CheckboxInput, HStack, NumberInput, TextInput, useUiLocale } from '@maka/ui';
import { getProviderSettingsCopy } from '../locales/settings-provider-copy';

/**
 * A model the user declared by hand, for a provider whose inference key has no
 * callable model-list endpoint (火山方舟 Agent Plan and Ark direct API today).
 *
 * The ID alone is not enough to run the model: an ID Maka has never seen
 * carries no context window, so `resolveSelectedModelContextWindow` returns
 * undefined and the history budget falls back to a flat 32k
 * (context-budget-policy.ts) — three percent of a 1M-token window. The dialog
 * therefore collects the facts the runtime actually reads, in one place, at the
 * moment the user is looking at the provider's own model page.
 *
 * Adding is deliberately NOT part of the enabled-models selector: picking from
 * a known set and introducing a new one are different acts with different
 * consequences, and the selector has nowhere to put these fields.
 */
export interface ManualModelDraft {
  id: string;
  contextWindow: number;
  maxOutputTokens?: number;
  vision: boolean;
}

export function AddModelDialog(props: {
  isOpen: boolean;
  existingModelIds: readonly string[];
  onOpenChange(open: boolean): void;
  onSubmit(draft: ManualModelDraft): void;
}) {
  const copy = getProviderSettingsCopy(useUiLocale()).detail;
  const [id, setId] = useState('');
  const [contextWindow, setContextWindow] = useState<number | null>(null);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | null>(null);
  const [vision, setVision] = useState(false);
  const [idTouched, setIdTouched] = useState(false);
  const [contextWindowTouched, setContextWindowTouched] = useState(false);

  const trimmedId = id.trim();
  const duplicate = props.existingModelIds.includes(trimmedId);
  const idError = !trimmedId
    ? copy.addModelIdRequired
    : duplicate
      ? copy.addModelIdDuplicate
      : null;
  // Required, not defaulted: an unknown window falls back to a flat 32k history
  // budget, and guessing higher on the user's behalf would turn a wasted window
  // into requests the provider rejects outright. Whoever types an exact model ID
  // is reading the provider's own model page, where this number is stated.
  const contextWindowError = contextWindow ? null : copy.addModelContextWindowRequired;

  function close() {
    setId('');
    setContextWindow(null);
    setMaxOutputTokens(null);
    setVision(false);
    setIdTouched(false);
    setContextWindowTouched(false);
    props.onOpenChange(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setIdTouched(true);
    setContextWindowTouched(true);
    if (idError || contextWindowError || !contextWindow) return;
    props.onSubmit({
      id: trimmedId,
      contextWindow,
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      vision,
    });
    close();
  }

  if (!props.isOpen) return null;
  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open) close(); }} purpose="form" width={480}>
      <Layout
        header={<DialogHeader title={copy.addModelTitle} onOpenChange={(open) => { if (!open) close(); }} />}
        content={(
          <LayoutContent>
            <form id="maka-add-model-form" onSubmit={submit}>
              <FormLayout>
                {/* The exact ID, kept verbatim through selection and inference —
                    `deepseek-v4-pro-beta` is a different model from
                    `deepseek-v4-pro`, and only the user knows which one their
                    plan actually serves. */}
                <TextInput
                  label={copy.addModelIdField}
                  description={copy.addModelIdFieldHelp}
                  isRequired
                  hasAutoFocus
                  value={id}
                  placeholder={copy.addModelIdPlaceholder}
                  onChange={(next) => {
                    setIdTouched(true);
                    setId(next);
                  }}
                  status={idTouched && idError ? { type: 'error', message: idError } : undefined}
                />
                <NumberInput
                  label={copy.addModelContextWindow}
                  description={copy.addModelContextWindowHelp}
                  isRequired
                  value={contextWindow}
                  hasClear
                  isIntegerOnly
                  min={1}
                  onChange={(next) => {
                    setContextWindowTouched(true);
                    setContextWindow(next);
                  }}
                  status={contextWindowTouched && contextWindowError
                    ? { type: 'error', message: contextWindowError }
                    : undefined}
                />
                <NumberInput
                  label={copy.addModelMaxOutput}
                  description={copy.addModelMaxOutputHelp}
                  value={maxOutputTokens}
                  hasClear
                  isIntegerOnly
                  min={1}
                  onChange={setMaxOutputTokens}
                />
                <CheckboxInput
                  label={copy.addModelVision}
                  value={vision}
                  onChange={setVision}
                />
              </FormLayout>
            </form>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter>
            {/* One button, as in scheduled-task-form-dialog: the header's close
                control and Escape are already two ways out, so a footer 取消
                would be a third route to the same place. */}
            <HStack gap={2} hAlign="end">
              <Button
                variant="primary"
                type="submit"
                form="maka-add-model-form"
                isDisabled={Boolean(idError || contextWindowError)}
                label={copy.addModelIdConfirm}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}
