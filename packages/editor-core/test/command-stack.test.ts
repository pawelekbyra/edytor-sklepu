import { describe, expect, it } from 'vitest';
import type { Command } from '../src/Command.js';
import { CommandStack } from '../src/CommandStack.js';

// A trivial numeric command is enough to test the stack mechanics in isolation from any Page/schema
// concerns — those are covered by the MoveSectionCommand/MoveBlockCommand tests.
class AddCommand implements Command<number> {
  constructor(private readonly amount: number) {}
  do(state: number): number {
    return state + this.amount;
  }
  undo(state: number): number {
    return state - this.amount;
  }
}

describe('CommandStack', () => {
  it('executes a command and updates state', () => {
    const stack = new CommandStack(0);
    stack.execute(new AddCommand(5));
    expect(stack.getState()).toBe(5);
  });

  it('undo reverts the last command', () => {
    const stack = new CommandStack(0);
    stack.execute(new AddCommand(5));
    stack.undo();
    expect(stack.getState()).toBe(0);
  });

  it('redo re-applies an undone command', () => {
    const stack = new CommandStack(0);
    stack.execute(new AddCommand(5));
    stack.undo();
    stack.redo();
    expect(stack.getState()).toBe(5);
  });

  it('undo/redo compose across multiple commands in order', () => {
    const stack = new CommandStack(0);
    stack.execute(new AddCommand(5));
    stack.execute(new AddCommand(3));
    expect(stack.getState()).toBe(8);

    stack.undo();
    expect(stack.getState()).toBe(5);
    stack.undo();
    expect(stack.getState()).toBe(0);

    stack.redo();
    expect(stack.getState()).toBe(5);
    stack.redo();
    expect(stack.getState()).toBe(8);
  });

  it('executing a new command after an undo clears the redo stack', () => {
    const stack = new CommandStack(0);
    stack.execute(new AddCommand(5));
    stack.undo();
    stack.execute(new AddCommand(2));

    expect(stack.getState()).toBe(2);
    expect(stack.canRedo).toBe(false);
    stack.redo();
    expect(stack.getState()).toBe(2);
  });

  it('undo/redo on an empty stack is a no-op', () => {
    const stack = new CommandStack(0);
    stack.undo();
    stack.redo();
    expect(stack.getState()).toBe(0);
  });

  it('canUndo/canRedo reflect stack state', () => {
    const stack = new CommandStack(0);
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);

    stack.execute(new AddCommand(1));
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);

    stack.undo();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });
});
