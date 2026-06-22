// @Architecture(descriptionShort="Visual list rendering Todo items")
// Facade bypass (planted architectureViolation): imports core's private
// `store` module directly instead of the core facade (../core).
import { TodoStore } from "../core/store";
import { TodoItem } from "./TodoItem";

export function TodoList({ store }: { store: TodoStore }) {
  return (
    <ul>
      {store.all().map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
