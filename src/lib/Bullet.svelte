<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import _ from 'lodash'

  export let bullet: bullet
  export let editMode: boolean
  export let bulletClipBoard: { style: string; text: string }

  const dispatch = createEventDispatcher()

  type bullet = {
    id: string
    style: string
    text: string
    ref: HTMLElement
  }
  type style = {
    icon: string
    crossed: boolean
    grey: boolean
  }
  const bulletStyle: {
    todo: style
    focus: style
    done: style
    doneUnfinished: style
    migrate: style
    someday: style
    note: style
  } = {
    todo: { icon: '&#x25AA', crossed: false, grey: false },
    focus: { icon: '&#x25C6;', crossed: false, grey: false },
    done: { icon: '&#215;', crossed: true, grey: true },
    doneUnfinished: { icon: '&#215;', crossed: false, grey: true },
    migrate: { icon: '&#xbb;', crossed: true, grey: true },
    someday: { icon: '&#xab', crossed: true, grey: true },
    note: { icon: '&#8211;', crossed: false, grey: false },
  }
  const bulletPriority: string[] = [
    'todo',
    'focus',
    'done',
    'doneUnfinished',
    'migrate',
    'someday',
    'note',
  ]

  function uuid() {
    return Math.random().toString(16).slice(2)
  }

  function iterateStyle() {
    let nextBulletStyleIndex: number = bulletPriority.indexOf(bullet.style) + 1
    if (bulletPriority.length === nextBulletStyleIndex) {
      nextBulletStyleIndex = 0
    }
    bullet.style = bulletPriority[nextBulletStyleIndex]
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!editMode) {
      e.preventDefault()
      if (e.key === 'j' && !e.metaKey) {
        dispatch('moveDown', { bulletID: bullet.id })
      } else if (e.key === 'k' && !e.metaKey) {
        dispatch('moveUp', { bulletID: bullet.id })
      } else if (e.key === 'd') {
        dispatch('storeBullet', {
          bulletStyle: bullet.style,
          bulletText: bullet.text,
        })
        dispatch('removeBullet', { bulletID: bullet.id, removeSingle: true })
      } else if (e.key === 'p') {
        dispatch('addBullet', {
          bulletID: bullet.id,
          bulletStyle: bulletClipBoard.style,
          bulletText: bulletClipBoard.text,
        })
      } else if (e.key === 'y') {
        dispatch('storeBullet', {
          bulletStyle: bullet.style,
          bulletText: bullet.text,
        })
      } else if (e.key === 'o') {
        dispatch('addBullet', {
          bulletID: bullet.id,
          bulletStyle: bullet.style,
          bulletText: '',
        })
        editMode = true
      }
    }

    if (e.key === 'i' && e.metaKey) {
      e.preventDefault()
      iterateStyle()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      dispatch('addBullet', {
        bulletID: bullet.id,
        bulletStyle: bullet.style,
        bulletText: '',
      })
    } else if (e.key === 'Backspace') {
      if (bullet.text.length === 0) {
        e.preventDefault()
        dispatch('removeBullet', { bulletID: bullet.id, removeSingle: false })
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      dispatch('moveUp', { bulletID: bullet.id })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      dispatch('moveDown', { bulletID: bullet.id })
    } else if (e.key === 'Escape') {
      editMode = false
    } else if (e.key === 'i' || e.key === 'a') {
      editMode = true
    } else if (e.key === 'j' && e.metaKey) {
      dispatch('moveBulletDown', { bulletID: bullet.id })
    } else if (e.key === 'k' && e.metaKey) {
      dispatch('moveBulletUp', { bulletID: bullet.id })
    }
  }
</script>

<div
  class="flex flex-row gap-2 items-start
    {bulletStyle[bullet.style].grey ? 'text-[#C4C4C4]' : ''}"
>
  <button
    contenteditable="false"
    bind:innerHTML={bulletStyle[bullet.style].icon}
    on:click={() => iterateStyle()}
  />
  <div
    role="textbox"
    tabindex="0"
    class="px-1 rounded flex-1"
    class:line-through={bulletStyle[bullet.style].crossed}
    class:decoration-2={bulletStyle[bullet.style].crossed}
    class:caret-[#55555500]={!editMode}
    class:focus:bg-gray-300={!editMode}
    contenteditable="true"
    bind:innerText={bullet.text}
    bind:this={bullet.ref}
    on:keydown={(event) => onKeyDown(event)}
  />
</div>

<style>
  [contenteditable] {
    outline: none;
  }
</style>
