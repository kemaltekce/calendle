<script lang="ts">
  export let errorMessage: string
</script>

{#if errorMessage}
  <div
    class="absolute z-10 bg-[#E46F74] w-[calc(100%-2rem*2)] mx-[2rem]
    my-[1rem] p-5 flex flex-row rounded text-slate-700"
  >
    <div class="grow">error: {errorMessage}</div>
    <button
      on:click={() => {
        errorMessage = ''
      }}>x</button
    >
  </div>
{/if}
