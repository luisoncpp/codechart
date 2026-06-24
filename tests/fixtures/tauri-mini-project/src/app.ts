import { greet } from "./ipc/client";

export function run(): void {
  void greet("world");
}
