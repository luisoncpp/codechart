import { Todo } from "../core";

export function TodoItem({ todo }: { todo: Todo }) {
  return <li className={todo.done ? "done" : ""}>{todo.title}</li>;
}
