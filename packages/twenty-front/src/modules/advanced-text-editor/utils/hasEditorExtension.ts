import { type Editor } from '@tiptap/core';
import { isDefined } from 'twenty-shared/utils';

export const hasEditorExtension = (
  editor: Editor | null | undefined,
  extensionName: string,
) => {
  if (!isDefined(editor) || editor.isDestroyed) {
    return false;
  }

  return (
    editor.extensionManager?.extensions.some(
      (extension) => extension.name === extensionName,
    ) ?? false
  );
};
