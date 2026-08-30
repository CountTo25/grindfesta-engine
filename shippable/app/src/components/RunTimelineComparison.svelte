<script lang="ts">
  import type { TimelineComparison } from "../game/runTimelineComparison";
  import { elapsedTime } from "../game/view";

  export let rows: TimelineComparison[] = [];

  const time = (value: number | null) => value === null ? "—" : elapsedTime(value);
  function change(row: TimelineComparison) {
    if (row.status === "new") return "New";
    if (row.status === "missing") return "Not reached";
    if (row.status === "same") return "No change";
    const difference = Math.abs(row.deltaMs ?? 0);
    return `${elapsedTime(difference)} ${(row.deltaMs ?? 0) < 0 ? "earlier" : "later"}`;
  }
</script>

{#if rows.length === 0}
  <p class="end-run-empty">No timeline items were recorded this run.</p>
{:else}
  <div class="run-timeline-frame">
    <table class="run-timeline-comparison">
      <thead>
        <tr>
          <th scope="col">Timeline item</th>
          <th scope="col">Previous</th>
          <th scope="col">This run</th>
          <th scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.key)}
          <tr data-status={row.status}>
            <th scope="row">{row.text}</th>
            <td>{time(row.previousMs)}</td>
            <td>{time(row.currentMs)}</td>
            <td class="timeline-change">{change(row)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
