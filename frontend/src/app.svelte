<script lang="ts">
  import {
    Glass_button,
    Glass_select,
    Glass_surface,
    Router_component,
    Segmented_control,
    Text_field,
    glass_reflections_enabled,
    glass_reflections,
    set_glass_reflections_enabled,
  } from "./lib";
  import type { Glass_option } from "./lib";
  import "./lib/styles/ui.css";

  const routing_settings = {};
  const current_route = null;
  const stage_options: Glass_option[] = [
    { value: "shape", label: "Shape" },
    { value: "build", label: "Build" },
    { value: "ship", label: "Ship" },
  ];
  const runtime_options: Glass_option[] = [
    { value: "rust", label: "Rust API" },
    { value: "static", label: "Static frontend" },
    { value: "worker", label: "Background worker" },
  ];

  let stage = "build";
  let runtime = "rust";
  let project_name = "starter_app";
  let status = "Ready for the next small, useful thing.";

  function start_project() {
    status = `${project_name || "Untitled project"} is ready to ${stage} with ${runtime}.`;
  }

  function reset_project() {
    stage = "build";
    runtime = "rust";
    project_name = "starter_app";
    status = "Starter settings restored.";
  }
</script>

<svelte:head>
  <meta name="color-scheme" content="dark" />
  <meta name="theme-color" content="#060806" />
</svelte:head>

<Router_component {routing_settings} {current_route}>
  <main use:glass_reflections class="app_shell" aria-labelledby="app_title">
    <Glass_surface tag="section" class_name="starter_panel" labelled_by="app_title">
      <div class="content_stack">
        <p class="eyebrow">simple_rust_svelte</p>
        <h1 id="app_title">Ready to build.</h1>
        <p class="muted_text">A compact Rust and Svelte foundation for focused tools.</p>
        <div class="starter_controls">
          <div class="field_stack wide_control">
            <span class="field_label">Stage</span>
            <Segmented_control bind:value={stage} options={stage_options} aria_label="Project stage" />
          </div>
          <Text_field bind:value={project_name} label="Project name" name="project_name" />
          <Glass_select bind:value={runtime} label="Runtime" name="runtime" options={runtime_options} />
        </div>
        <div class="action_row">
          <Glass_button variant="primary" on:click={start_project}>Start project</Glass_button>
          <Glass_button variant="standalone" on:click={() => (status = `Previewing ${project_name || "untitled project"}.`)}>Preview</Glass_button>
          <Glass_button variant="danger" on:click={reset_project}>Reset</Glass_button>
          <Glass_button
            pressed={$glass_reflections_enabled}
            on:click={() => set_glass_reflections_enabled(!$glass_reflections_enabled)}
          >
            Reflections
          </Glass_button>
          <Glass_button class_name="settings_button" icon_only aria_label="Project settings" title="Project settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.1 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7.8 7.8 0 0 0-1.7-1L14.5 3h-4L10 6a7.8 7.8 0 0 0-1.7 1L5.8 6l-2 3.4 2 1.6a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2 1.6 2 3.4 2.5-1a7.8 7.8 0 0 0 1.7 1l.5 3h4l.5-3a7.8 7.8 0 0 0 1.7-1l2.5 1 2-3.4-2.1-1.6ZM12.5 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" /></svg>
          </Glass_button>
        </div>
        <p class="status_line" aria-live="polite">{status}</p>
      </div>
    </Glass_surface>
  </main>
</Router_component>
