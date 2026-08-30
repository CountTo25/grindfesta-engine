<script lang="ts">
  import type { InventoryEntry } from "../engine/core";
  import type { ItemData } from "../game/types";
  import { GlassPanel, GlassProgress } from "../ui";

  export let inventory: Partial<Record<string, InventoryEntry>> = {};
  export let items: ItemData[] = [];
  $: itemByUuid = Object.fromEntries(items.map((item) => [item.uuid, item]));
  $: entries = Object.entries(inventory).flatMap(([itemId, entry]) =>
    entry && entry.amount > 0 ? [[itemId, entry] as const] : []);
</script>

<GlassPanel title="Inventory" className="game-column-panel">
  <div class="generated-inventory">
    {#each entries as [itemId, entry] (itemId)}
      {@const item = itemByUuid[itemId]}
      <div class="glass-card inventory-entry">
        <span>
          <b>{item?.name ?? itemId}</b>
          {#if item?.description}<small>{item.description}</small>{/if}
        </span>
        <strong>
          {entry.amount}{item?.capacity === null ? "" : `/${item?.capacity ?? ""}`}
        </strong>
        {#if item?.autoUse}
          <div class="inventory-cooldown">
            <small>{entry.cooldownMs > 0 ? `${(entry.cooldownMs / 1000).toFixed(1)}s` : "Ready"}</small>
            <GlassProgress
              percent={item.autoUse.cooldownMs > 0
                ? (entry.cooldownMs / item.autoUse.cooldownMs) * 100
                : 0}
              label={`${item.name} auto-use cooldown`}
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</GlassPanel>
