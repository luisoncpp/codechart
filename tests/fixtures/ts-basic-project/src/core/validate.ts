import { Todo } from "./todo";

export function isValid(todo: Todo): boolean {
  return todo.title.trim().length > 0;
}
