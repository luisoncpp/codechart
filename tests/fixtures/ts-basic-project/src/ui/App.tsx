import { fetchTitles } from "../services";
import { TodoList } from "./TodoList";
import { TodoStore } from "../core";

export function App() {
  const store = new TodoStore();
  void fetchTitles().then((result) => {
    for (const title of result.data ?? []) store.add(title);
  });
  return <TodoList store={store} />;
}
