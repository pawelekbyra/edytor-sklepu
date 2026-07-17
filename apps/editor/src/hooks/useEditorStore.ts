'use client';

import { type Command, CommandStack } from '@pawelekbyra/editor-core';
import type { Page } from '@pawelekbyra/schema';
import { useRef, useState } from 'react';

// Thin React wrapper around the (deliberately React-free) CommandStack from `@pawelekbyra/editor-core`
// — see ARCHITEKTURA.md "apps/editor: Stan edytora: editor-core CommandStack opakowany hookiem
// useEditorStore". CommandStack itself doesn't trigger re-renders, so every mutation also updates
// local state to notify React.
export function useEditorStore(initialPage: Page) {
  const stackRef = useRef<CommandStack<Page>>();
  if (!stackRef.current) {
    stackRef.current = new CommandStack(initialPage);
  }
  const stack = stackRef.current;

  const [page, setPage] = useState(initialPage);

  return {
    page,
    execute(command: Command<Page>) {
      setPage(stack.execute(command));
    },
    undo() {
      setPage(stack.undo());
    },
    redo() {
      setPage(stack.redo());
    },
    canUndo: stack.canUndo,
    canRedo: stack.canRedo,
  };
}
