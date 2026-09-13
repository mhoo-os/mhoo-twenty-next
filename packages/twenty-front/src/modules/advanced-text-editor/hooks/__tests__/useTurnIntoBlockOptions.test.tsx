import { useAdvancedTextEditor } from '@/advanced-text-editor/hooks/useAdvancedTextEditor';
import { AI_INSTRUCTIONS_EDITOR_PROFILE } from '@/ai/constants/AiInstructionsEditorProfile';
import { useTurnIntoBlockOptions } from '@/advanced-text-editor/hooks/useTurnIntoBlockOptions';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { type PropsWithChildren } from 'react';

type WrapperProps = PropsWithChildren;

const Wrapper = ({ children }: WrapperProps) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const createEditor = () =>
  new Editor({
    extensions: [Document, Paragraph, Text, Heading],
    content: '<p>Workspace instructions</p>',
  });

describe('useTurnIntoBlockOptions editor lifecycle', () => {
  const editors: Editor[] = [];
  const newEditor = () => {
    const editor = createEditor();
    editors.push(editor);
    return editor;
  };

  afterEach(() => {
    editors.forEach((editor) => editor.destroy());
    editors.length = 0;
  });

  it('keeps live paragraph and heading formatting available', () => {
    const editor = newEditor();
    const { result } = renderHook(() => useTurnIntoBlockOptions(editor), {
      wrapper: Wrapper,
    });

    expect(result.current.map((option) => option.id)).toEqual([
      'paragraph',
      'heading1',
      'heading2',
      'heading3',
    ]);
    expect(result.current.find((option) => option.isActive())?.id).toBe(
      'paragraph',
    );
    act(() => {
      result.current.find((option) => option.id === 'heading2')?.onClick();
    });
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
    expect(result.current.find((option) => option.isActive())?.id).toBe(
      'heading2',
    );
  });

  it('returns no callbacks for a destroyed editor snapshot', () => {
    const editor = newEditor();
    const { result, rerender } = renderHook(
      () => useTurnIntoBlockOptions(editor),
      { wrapper: Wrapper },
    );

    act(() => editor.destroy());
    rerender();

    expect(result.current).toEqual([]);
  });

  it('handles an unavailable editor followed by a live instance', () => {
    const { result, rerender } = renderHook(
      ({ editor }: { editor: Editor | null }) =>
        useTurnIntoBlockOptions(editor),
      { initialProps: { editor: null as Editor | null }, wrapper: Wrapper },
    );
    expect(result.current).toEqual([]);

    rerender({ editor: newEditor() });
    expect(result.current.map((option) => option.id)).toContain('heading1');

    rerender({ editor: null });
    expect(result.current).toEqual([]);
  });

  it('keeps AI instructions formatting live across fullscreen transitions', () => {
    const { result, rerender } = renderHook(
      ({ fullScreen }) => {
        const editor = useAdvancedTextEditor(
          {
            profile: AI_INSTRUCTIONS_EDITOR_PROFILE,
            placeholder: undefined,
            readonly: false,
            defaultValue: undefined,
            onUpdate: () => {},
          },
          [fullScreen],
        );

        return { editor, options: useTurnIntoBlockOptions(editor) };
      },
      { initialProps: { fullScreen: false }, wrapper: Wrapper },
    );

    for (const fullScreen of [true, false]) {
      const previous = result.current.editor;
      rerender({ fullScreen });
      expect(previous?.isDestroyed).toBe(true);
      expect(result.current.editor).not.toBe(previous);
      act(() => {
        result.current.options
          .find((option) => option.id === 'heading2')
          ?.onClick();
      });
      expect(result.current.editor?.isActive('heading', { level: 2 })).toBe(
        true,
      );
    }
  });

  it('uses the replacement editor before its first transaction', () => {
    const first = newEditor();
    const second = newEditor();
    const third = newEditor();
    const { result, rerender } = renderHook(
      ({ editor }) => useTurnIntoBlockOptions(editor),
      { initialProps: { editor: first }, wrapper: Wrapper },
    );

    // The field replaces its editor when entering and leaving fullscreen.
    // Tiptap's selector store still caches the previous instance at this render.
    for (const [previous, next] of [
      [first, second],
      [second, third],
    ]) {
      act(() => previous.destroy());
      rerender({ editor: next });
      expect(result.current.map((option) => option.id)).toContain('heading2');
      act(() => {
        result.current.find((option) => option.id === 'heading2')?.onClick();
      });
      expect(next.isActive('heading', { level: 2 })).toBe(true);
    }
  });
});
