<script lang="ts">
  export let displayHotkey: boolean

  const hotkeys: { key: string; description: string }[] = [
    { key: 'enter', description: 'add new bullet' },
    { key: 'remove', description: 'if no text delete bullet' },
    { key: 'arrow down', description: 'move down' },
    { key: 'arrow up', description: 'move up' },
    { key: 'tab', description: 'indent' },
    { key: 'shift+tab', description: 'unindent' },
    { key: '&#x2318;+i', description: 'change bullet type' },
    { key: '&#x2318;+j', description: 'move bullet down' },
    { key: '&#x2318;+k', description: 'move bullet up' },
    { key: '&#x2318;+h', description: 'go to previous week' },
    { key: '&#x2318;+l', description: 'go to next week' },
    { key: 'shift+&#x2318;+h', description: 'go to previous list' },
    { key: 'shift+&#x2318;+l', description: 'go to next list' },
    { key: '&#x2318;+t', description: 'go to current week' },
    { key: '&#x2318;+o', description: 'restart calendle' },
    { key: 'esc', description: 'activate hover mode' },
  ]
  const hoverHotkeys: { key: string; description: string }[] = [
    { key: 'i/a', description: 'activate edit mode / deactivate hover mode' },
    { key: 'j', description: 'move down' },
    { key: 'k', description: 'move up' },
    { key: 'd', description: 'delete bullet' },
    { key: 'y', description: 'copy/yank bullet' },
    { key: 'p', description: 'paste copied or deleted bullet' },
    { key: 'o', description: 'add new bullet' },
    { key: '>', description: 'indent bullet' },
    { key: '<', description: 'unindent bullet' },
    { key: 'g', description: 'go to first bullet' },
    { key: 'G', description: 'go to last bullet' },
    { key: 'J', description: 'increase highlighted bullets' },
    { key: 'K', description: 'decrease highlighted bullets' },
    { key: '1-9', description: 'increase highlighted bullets by 1-9' },
  ]
</script>

{#if displayHotkey}
  <div
    class="absolute z-10 bg-[#E1E6E0] w-[calc(100%-2rem*2)] mx-[2rem]
    my-[1rem] p-5 flex flex-row rounded"
  >
    <div class="grow">
      <div class="text-3xl font-bold pb-4">Hotkeys</div>
      {#each hotkeys as hotkey}
        <div class="flex pb-1">
          <div class="pr-3 font-bold whitespace-nowrap">
            {@html hotkey.key + ':'}
          </div>
          <div>{hotkey.description}</div>
        </div>
      {/each}
      <div class="pt-7 pb-3">in hover mode:</div>
      {#each hoverHotkeys as hotkey}
        <div class="flex pb-1">
          <div class="pr-3 font-bold whitespace-nowrap">
            {@html hotkey.key + ':'}
          </div>
          <div>{hotkey.description}</div>
        </div>
      {/each}
    </div>
    <button
      class="self-start"
      on:click={() => {
        displayHotkey = false
      }}>x</button
    >
  </div>
{/if}
