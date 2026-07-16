import type { Command } from './Command.js';

// Pure TS, no React — this is what apps/editor wraps in a `useEditorStore` hook (ARCHITEKTURA.md),
// and what replaces the Rails draft/publish snapshot as the *only* undo mechanism.
export class CommandStack<TState> {
  private state: TState;
  private readonly undoStack: Command<TState>[] = [];
  private redoStack: Command<TState>[] = [];

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState(): TState {
    return this.state;
  }

  execute(command: Command<TState>): TState {
    this.state = command.do(this.state);
    this.undoStack.push(command);
    this.redoStack = [];
    return this.state;
  }

  undo(): TState {
    const command = this.undoStack.pop();
    if (!command) return this.state;

    this.state = command.undo(this.state);
    this.redoStack.push(command);
    return this.state;
  }

  redo(): TState {
    const command = this.redoStack.pop();
    if (!command) return this.state;

    this.state = command.do(this.state);
    this.undoStack.push(command);
    return this.state;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
