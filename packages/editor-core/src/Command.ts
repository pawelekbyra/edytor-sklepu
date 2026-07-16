// Every mutation (move a section, change a preference, publish) is an object with symmetric
// do/undo — see ARCHITEKTURA.md § packages/editor-core.
export interface Command<TState> {
  do(state: TState): TState;
  undo(state: TState): TState;
}
