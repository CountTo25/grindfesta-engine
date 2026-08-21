import { mount } from "svelte";
import App_component from "./app.svelte";

const app = mount(App_component, {
  target: document.getElementById("app")!,
});

export default app;
