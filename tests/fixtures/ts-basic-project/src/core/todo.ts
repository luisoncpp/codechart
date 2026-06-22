// @Architecture(descriptionShort="Domain type definitions for Todos")
export interface Todo {
  id: string;
  title: string;
  done: boolean;
}

export function makeTodo(id: string, title: string): Todo {
  return { id, title, done: false };
}
