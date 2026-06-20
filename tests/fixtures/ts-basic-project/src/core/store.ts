import { Todo, makeTodo } from "./todo";

export class TodoStore {
  private todos: Todo[] = [];

  add(title: string): Todo {
    const todo = makeTodo(String(this.todos.length + 1), title);
    this.todos.push(todo);
    return todo;
  }

  all(): Todo[] {
    return this.todos.slice();
  }

  toggle(id: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
  }
}
