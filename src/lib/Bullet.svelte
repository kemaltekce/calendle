<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'

  import _ from 'lodash'

  export let bullet: bullet
  export let editMode: boolean
  export let includingBullets: number
  export let maxIncludeBullets: number
  export let bulletClipBoard: { style: string; text: string; indent: number }
  export let highlight: boolean

  const dispatch = createEventDispatcher()

  type bullet = {
    id: string
    style: string
    text: string
    indent: number
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
    noteGrey: style
    header: style
  } = {
    todo: { icon: '&#x25AA', crossed: false, grey: false },
    focus: { icon: '&#x25C6;', crossed: false, grey: false },
    done: { icon: '&#215;', crossed: true, grey: true },
    doneUnfinished: { icon: '&#215;', crossed: false, grey: true },
    migrate: { icon: '&#xbb;', crossed: true, grey: true },
    someday: { icon: '&#xab', crossed: true, grey: true },
    note: { icon: '&#8211;', crossed: false, grey: false },
    noteGrey: { icon: '&#8211;', crossed: false, grey: true },
    header: { icon: '#', crossed: false, grey: false },
  }
  const bulletPriority: string[] = [
    'todo',
    'focus',
    'done',
    'doneUnfinished',
    'migrate',
    'someday',
    'note',
    'noteGrey',
    'header',
  ]
  let isFocused: boolean = false

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

  function indentBullet() {
    bullet.indent = Math.min(bullet.indent + 1, 2)
  }

  function unindentBullet() {
    bullet.indent = Math.max(bullet.indent - 1, 0)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!editMode) {
      e.preventDefault()
      if (e.key === 'j' && !e.metaKey) {
        dispatch('moveDown', { bulletID: bullet.id })
      } else if (e.key === 'k' && !e.metaKey) {
        dispatch('moveUp', { bulletID: bullet.id })
      } else if (e.key === 'J' && !e.metaKey && e.shiftKey) {
        includingBullets = Math.min(includingBullets + 1, maxIncludeBullets)
      } else if (e.key === 'K' && !e.metaKey && e.shiftKey) {
        includingBullets = Math.max(
          Math.min(includingBullets - 1, maxIncludeBullets),
          0
        )
      } else if (e.key === 'd') {
        if (includingBullets > 0) {
          dispatch('displayEscHint')
          return
        }
        dispatch('storeBullet', {
          bulletStyle: bullet.style,
          bulletText: bullet.text,
          bulletIndent: bullet.indent,
        })
        dispatch('removeBullet', { bulletID: bullet.id, removeSingle: true })
      } else if (e.key === 'p') {
        if (includingBullets > 0) {
          dispatch('displayEscHint')
          return
        }
        dispatch('addBullet', {
          bulletID: bullet.id,
          bulletStyle: bulletClipBoard.style,
          bulletText: bulletClipBoard.text,
          bulletIndent: bulletClipBoard.indent,
        })
      } else if (e.key === 'y') {
        if (includingBullets > 0) {
          dispatch('displayEscHint')
          return
        }
        dispatch('storeBullet', {
          bulletStyle: bullet.style,
          bulletText: bullet.text,
          bulletIndent: bullet.indent,
        })
      } else if (e.key === 'g') {
        dispatch('focusFirstBullet')
      } else if (e.key === 'G') {
        dispatch('focusLastBullet')
      } else if (e.key === 'o' && !e.metaKey) {
        dispatch('addBullet', {
          bulletID: bullet.id,
          bulletStyle: bullet.style,
          bulletText: '',
          bulletIndent: bullet.indent,
        })
        editMode = true
        includingBullets = 0
      } else if (e.key === '<') {
        if (includingBullets > 0) {
          dispatch('displayEscHint')
          return
        }
        unindentBullet()
      } else if (e.key === '>') {
        if (includingBullets > 0) {
          dispatch('displayEscHint')
          return
        }
        indentBullet()
      } else if (isFinite(Number(e.key))) {
        const temp: string = String(includingBullets)
        includingBullets = Math.min(Number(temp + e.key), maxIncludeBullets)
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
        bulletIndent: bullet.indent,
      })
    } else if (e.key === 'Backspace') {
      if (bullet.text.length === 0) {
        if (bullet.indent > 0) {
          unindentBullet()
          return
        }
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
      includingBullets = 0
      dispatch('disableEscHint')
    } else if (e.key === 'i' || e.key === 'a') {
      editMode = true
      includingBullets = 0
    } else if (e.key === 'j' && e.metaKey) {
      dispatch('moveBulletDown', { bulletID: bullet.id })
    } else if (e.key === 'k' && e.metaKey) {
      dispatch('moveBulletUp', { bulletID: bullet.id })
    } else if (e.key === 'h' && e.metaKey) {
      dispatch('previousWeek')
    } else if (e.key === 'l' && e.metaKey) {
      dispatch('nextWeek')
    } else if (e.key === 't' && e.metaKey) {
      dispatch('todayWeek')
    } else if (e.key === 'o' && e.metaKey) {
      dispatch('relaunch')
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      unindentBullet()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      indentBullet()
    }
  }
</script>

<div
  class="flex flex-row gap-2 items-start
    {bulletStyle[bullet.style].grey ? 'text-[#C4C4C4]' : ''}"
>
  {#each Array(bullet.indent) as _, _}
    <div class="w-[1rem]" />
  {/each}
  <button
    contenteditable="false"
    class:hidden={(!isFocused && bullet.text == '---' && !highlight) ||
      (!isFocused && bullet.style == 'header' && !highlight)}
    bind:innerHTML={bulletStyle[bullet.style].icon}
    on:mousedown={() => iterateStyle()}
  />
  <div
    role="textbox"
    tabindex="0"
    class="px-1 rounded flex-1"
    class:line-through={bulletStyle[bullet.style].crossed}
    class:decoration-1={bulletStyle[bullet.style].crossed}
    class:caret-[#33333300]={!editMode}
    class:focus:bg-[#C4C4C450]={!editMode}
    class:text-[#00000000]={!isFocused && bullet.text == '---' && !highlight}
    class:bg-[#C4C4C4]={!isFocused && bullet.text == '---' && !highlight}
    class:h-[2px]={!isFocused && bullet.text == '---' && !highlight}
    class:my-[11px]={!isFocused && bullet.text == '---' && !highlight}
    class:self-center={!isFocused && bullet.text == '---' && !highlight}
    class:text-xl={!isFocused && bullet.style == 'header' && !highlight}
    class:px-0={!isFocused && bullet.style == 'header' && !highlight}
    class:bg-[#C4C4C450]={highlight}
    contenteditable="true"
    bind:innerText={bullet.text}
    bind:this={bullet.ref}
    on:keydown={(event) => onKeyDown(event)}
    on:focus={async () => {
      isFocused = true
      includingBullets = Math.min(includingBullets, maxIncludeBullets)
      // await tick so that after delete of a bullet the focused bullet has
      // updated infos about position
      await tick()
      dispatch('focusedBullet')
    }}
    on:blur={() => {
      isFocused = false
      dispatch('blurBullet')
    }}
  />
</div>

<style>
  [contenteditable] {
    outline: none;
  }
</style>
