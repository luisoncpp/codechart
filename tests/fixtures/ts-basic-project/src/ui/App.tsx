import { fetchTitles, type ITodoStore } from "../services";
import { TodoList } from "./TodoList";
import { TodoStore } from "../core";

export function App() {
  const store = new TodoStore();
  // Listen for store broadcasts over the ambient global bus — a soft edge in
  // from core/store, with no import to match it.
  on("todos:changed", () => void store.all());
  void fetchTitles().then((result) => {
    for (const title of result.data ?? []) store.add(title);
  });
  return <TodoList store={store} />;
}
