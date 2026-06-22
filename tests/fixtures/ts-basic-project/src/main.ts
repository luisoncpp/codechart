// @Architecture(descriptionShort="Entry point initializing services and launching UI")
import { App } from "./ui";
import { TodoStore } from "./core";

export function bootstrap(): void {
  // eslint-disable-next-line no-console
  console.log("todo app booting", typeof App, typeof TodoStore);
}

bootstrap();
