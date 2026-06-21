import { Todo, makeTodo } from "./todo";

// `emit`/`on` are an ambient global event bus (declared in a global .d.ts):
// the store broadcasts changes the UI listens for — a soft (runtime) edge that
// no import expresses.
export class TodoStore {
  private todos: Todo[] = [];

  add(title: string): Todo {
    const todo = makeTodo(String(this.todos.length + 1), title);
    this.todos.push(todo);
    emit("todos:changed");
    return todo;
  }

  all(): Todo[] {
    return this.todos.slice();
  }

  toggle(id: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
    emit("todos:changed");
  }
}
