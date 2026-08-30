import { mount } from "svelte";
import GrindfestaApp from "./GrindfestaApp.svelte";

const app = mount(GrindfestaApp, {
  target: document.getElementById("app")!,
});

export default app;
