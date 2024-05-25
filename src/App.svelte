<script lang="ts">
  import _ from 'lodash'
  import dayjs from 'dayjs'
  import isoWeek from 'dayjs/plugin/isoWeek'

  import Bullet from './lib/Bullet.svelte'
  import Error from './lib/Error.svelte'
  import Hotkey from './lib/Hotkey.svelte'
  import TimerWorker from './timer.ts?worker'
  import soundUrl from './assets/sound.mp3'
  import backgroundSoundUrl from './assets/background.mp3'

  import { afterUpdate, tick } from 'svelte'

  dayjs.extend(isoWeek)

  type bullet = {
    id: string
    style: string
    text: string
    indent: number
    ref: HTMLElement
  }
  let bulletClipBoard: { style: string; text: string; indent: number } = null
  let week: { name: string; date: string; bullets: bullet[] }[] = []
  let lists: string[] = []
  let list: string = ''
  let showLists: boolean = false
  let previousWeek: { name: string; date: string; bullets: bullet[] }[] = []
  let editMode: boolean = true
  let includingBullets: number = 0
  let dateStartOfWeek: any = ''
  let year: string = ''
  let month: string = ''
  let dateStartOfCurrentWeek: any = dayjs()
    .startOf('isoWeek')
    .format('YYYY-MM-DD')
  let today: any = dayjs().format('YYYY-MM-DD')
  let errorMessage: string = ''
  let colorStyle: number = 3
  let focusedWeekIndex: number = undefined
  let focusedBulletIndex: number = undefined
  let displayEscHint: boolean = false
  let displayHotkey: boolean = false
  let showWeekdays: boolean = false
  let weekday: { name: string; show: boolean; id: number }[] = [
    { name: 'Mo', show: true, id: 0 },
    { name: 'Tu', show: true, id: 1 },
    { name: 'We', show: true, id: 2 },
    { name: 'Th', show: true, id: 3 },
    { name: 'Fr', show: true, id: 4 },
    { name: 'Sa', show: true, id: 5 },
    { name: 'Su', show: true, id: 6 },
  ]
  let triggeredByListIteration: boolean = false
  let showFocus: boolean = false
  let timer: Worker = new TimerWorker()
  let timerDisplay: string = ''
  const audio = new Audio(soundUrl)
  let focusSessions: number = 0
  const audioLoop = new Audio(backgroundSoundUrl)
  audioLoop.loop = true
  audioLoop.volume = 0.3
  let loopPlaying: boolean = false

  timer.onmessage = (event) => {
    if (event.data === 'done') {
      audioLoop.pause()
      audio.play()
      window.api.showWindow()
      focusSessions += 1
      return
    }
    timerDisplay = event.data
    window.api.showTime(event.data)
  }

  window.api.onSendData(async (data, listname) => {
    data.forEach((day) => {
      day.bullets.forEach((bullet) => {
        bullet.ref = null
      })
    })
    week = JSON.parse(JSON.stringify(data))
    dateStartOfWeek = dayjs(data[0].date)
    year = dateStartOfWeek.format('YYYY')
    month = dateStartOfWeek.format('MMMM')
    list = listname
    await tick()
    if (triggeredByListIteration) {
      focusAndSetCaret(week[7].bullets[0].ref)
      triggeredByListIteration = false
    } else {
      focusAndSetCaret(week[nextWeekdayID(-1)].bullets[0].ref)
    }
  })

  window.api.onSendLists((data) => {
    lists = data
  })

  window.api.onSendError((message) => {
    errorMessage = message
  })

  function loadWeekAndList(date: string, list: string) {
    window.api.loadData(date, list)
  }

  // somehow we can't track the previous week data to compare the previous
  // week data to the current week data (previous week data = before change
  // data & current week data = changed data). Therefore we have to send
  // the whole week including all weekdays and someady to the backend and
  // save the week data and someday data at the same time even if one of them
  // didn't changed.
  // additoinally, we can't use the reactive prompt $: because binded objects
  // will trigger the reactivity twice. With after update we can reduce the
  // triggered update to one
  afterUpdate(() => {
    if (week.length > 0) {
      // create copy of week object
      let backendReadyData = JSON.parse(JSON.stringify(week))
      backendReadyData.forEach(function (day) {
        day.bullets.forEach(function (bullet) {
          delete bullet.ref
        })
      })
      window.api.saveData(backendReadyData)
    }
  })

  function updateTodayAndStartOfWeek() {
    dateStartOfCurrentWeek = dayjs().startOf('isoWeek').format('YYYY-MM-DD')
    today = dayjs().format('YYYY-MM-DD')
  }

  function uuid() {
    return Math.random().toString(16).slice(2)
  }

  function setCaret(contentEditableElement: HTMLElement, offset: number) {
    let range: any
    let selection: any
    range = document.createRange()
    if (contentEditableElement.childNodes[0] === undefined || offset === -1) {
      // use this if bullet is empty. If bullet is empty childNotes do
      // not exist.
      range.selectNodeContents(contentEditableElement)
    } else if (offset > contentEditableElement.innerText.length) {
      range.setStart(
        contentEditableElement.childNodes[0],
        contentEditableElement.innerText.length
      )
    } else {
      range.setStart(contentEditableElement.childNodes[0], offset)
    }
    range.collapse(false)
    selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function focusAndSetCaret(el: HTMLElement) {
    el.focus()
    setCaret(el, -1)
  }

  function firstWeekdayWithShow() {
    const firstWithShow = weekday.find((day) => day.show)
    return firstWithShow ? firstWithShow.id : 7
  }

  function focusFirstBullet() {
    let el: HTMLElement
    el = week[firstWeekdayWithShow()].bullets[0].ref
    focusAndSetCaret(el)
  }

  function focusFirstBulletIfNothingFocused(event: any) {
    if (event.key === 'j' && focusedBulletIndex === undefined) {
      event.preventDefault()
      focusFirstBullet()
    }
  }

  function focusLastBullet() {
    let el: HTMLElement
    const somedayBullets: bullet[] = week[week.length - 1].bullets
    el = somedayBullets[somedayBullets.length - 1].ref
    focusAndSetCaret(el)
  }

  async function addBullet(event: any, weekIndex: number) {
    const previousBullet: string = event.detail.bulletID
    const defaultBullet: bullet = {
      id: uuid(),
      style: event.detail.bulletStyle,
      text: event.detail.bulletText,
      indent: event.detail.bulletIndent,
      ref: null,
    }

    let bullets: bullet[] = week[weekIndex].bullets
    const previousBulletIndex: number = _.findIndex(
      bullets,
      function (b: bullet) {
        return b.id === previousBullet
      }
    )
    const newBulletIndex: number = previousBulletIndex + 1
    week[weekIndex].bullets = [
      ...bullets.slice(0, newBulletIndex),
      defaultBullet,
      ...bullets.slice(newBulletIndex),
    ]
    // wait for new bullet to have ref value
    await tick()
    week[weekIndex].bullets[newBulletIndex].ref.focus()
  }

  async function removeBullet(event: any, weekIndex: number) {
    let el: HTMLElement
    let previousBulletIndex: number
    let bullets: bullet[] = week[weekIndex].bullets

    const bulletIndex: number = _.findIndex(bullets, function (b: bullet) {
      return b.id == event.detail.bulletID
    })
    if (bulletIndex === 0) {
      previousBulletIndex = 0
    } else {
      previousBulletIndex = bulletIndex - 1
    }

    if (week[weekIndex].bullets.length > 1) {
      bullets = bullets.filter((b) => {
        return b.id !== event.detail.bulletID
      })
      week[weekIndex].bullets = bullets
      el = week[weekIndex].bullets[previousBulletIndex].ref
      focusAndSetCaret(el)
    } else if (event.detail.removeSingle) {
      const defaultBullet: bullet = {
        id: uuid(),
        style: 'todo',
        text: '',
        indent: 0,
        ref: null,
      }
      week[weekIndex].bullets = [defaultBullet]
      await tick()
      el = week[weekIndex].bullets[0].ref
      focusAndSetCaret(el)
    }
  }

  function moveUp(event: any, weekIndex: number) {
    let el: HTMLElement
    let bullets: bullet[] = week[weekIndex].bullets
    const bulletIndex: number = _.findIndex(bullets, function (b: bullet) {
      return b.id == event.detail.bulletID
    })
    const previousBulletIndex: number = bulletIndex - 1
    if (previousBulletIndex >= 0) {
      el = week[weekIndex].bullets[previousBulletIndex].ref
      focusAndSetCaret(el)
    } else if (weekIndex !== firstWeekdayWithShow()) {
      weekIndex = previousWeekdayID(weekIndex)
      el = week[weekIndex].bullets.slice(-1)[0].ref
      focusAndSetCaret(el)
    }

    // scroll to top if first bullet
    if (weekIndex === firstWeekdayWithShow() && previousBulletIndex === -1) {
      document.getElementById('main').scrollTo(0, 0)
    }
  }

  function moveDown(event: any, weekIndex: number) {
    let el: HTMLElement
    let bullets: bullet[] = week[weekIndex].bullets
    const bulletIndex: number = _.findIndex(bullets, function (b: bullet) {
      return b.id == event.detail.bulletID
    })
    const previousBulletIndex: number = bulletIndex + 1
    if (previousBulletIndex <= bullets.length - 1) {
      el = week[weekIndex].bullets[previousBulletIndex].ref
      focusAndSetCaret(el)
    } else if (weekIndex !== 7) {
      weekIndex = nextWeekdayID(weekIndex)
      el = week[weekIndex].bullets[0].ref
      focusAndSetCaret(el)
    } else if (weekIndex === 7 && previousBulletIndex === bullets.length) {
      // scroll to bottom if last bullet
      const mainDiv = document.getElementById('main')
      mainDiv.scrollTo(0, mainDiv.scrollHeight)
    }
  }

  async function moveBulletUp(event: any, weekIndex: number) {
    let finalWeeekIndex: number
    let finalBulletIndex: number

    let bullets: bullet[] = week[weekIndex].bullets
    const bulletIndex: number = _.findIndex(bullets, function (b: bullet) {
      return b.id == event.detail.bulletID
    })

    // if first bullet on first displayed weekday
    if (bulletIndex === 0 && weekIndex === firstWeekdayWithShow()) {
      return
      // if first bullet on any other day. move bullet to previous weekday
    } else if (bulletIndex === 0) {
      // if last bullet in weekday, add empty default bullet
      if (bullets.length === 1 + includingBullets) {
        const defaultBullet: bullet = {
          id: uuid(),
          style: 'todo',
          text: '',
          indent: 0,
          ref: null,
        }
        week[weekIndex].bullets = [defaultBullet]
      } else {
        week[weekIndex].bullets = [...bullets.slice(1 + includingBullets)]
      }
      let bulletsWeekBefore: bullet[] =
        week[previousWeekdayID(weekIndex)].bullets
      week[previousWeekdayID(weekIndex)].bullets = [
        ...bulletsWeekBefore,
        ...bullets.slice(0, 1 + includingBullets),
      ]
      finalWeeekIndex = previousWeekdayID(weekIndex)
      finalBulletIndex =
        week[finalWeeekIndex].bullets.length - 1 - includingBullets
      // move bullet inside same weekday
    } else {
      week[weekIndex].bullets = [
        ...bullets.slice(0, bulletIndex - 1),
        ...bullets.slice(bulletIndex, 1 + bulletIndex + includingBullets),
        ...bullets.slice(bulletIndex - 1, bulletIndex),
        ...bullets.slice(bulletIndex + 1 + includingBullets),
      ]
      finalWeeekIndex = weekIndex
      finalBulletIndex = bulletIndex - 1
    }
    await tick()
    let el: HTMLElement = week[finalWeeekIndex].bullets[finalBulletIndex].ref
    el.blur()
    focusAndSetCaret(el)
  }

  async function moveBulletDown(event: any, weekIndex: number) {
    let finalWeeekIndex: number
    let finalBulletIndex: number

    let bullets: bullet[] = week[weekIndex].bullets
    const bulletIndex: number = _.findIndex(bullets, function (b: bullet) {
      return b.id == event.detail.bulletID
    })

    // if last bullet in someday
    if (
      bulletIndex + 1 + includingBullets === bullets.length &&
      weekIndex === 7
    ) {
      return
      // if last bullet on any other day. move bullet to next weekday
    } else if (bulletIndex + 1 + includingBullets === bullets.length) {
      // if last bullet in weekday, add empty default bullet
      if (bullets.length === 1 + includingBullets) {
        const defaultBullet: bullet = {
          id: uuid(),
          style: 'todo',
          text: '',
          indent: 0,
          ref: null,
        }
        week[weekIndex].bullets = [defaultBullet]
      } else {
        week[weekIndex].bullets = [...bullets.slice(0, -1 - includingBullets)]
      }
      let bulletsWeekAfter: bullet[] = week[nextWeekdayID(weekIndex)].bullets
      week[nextWeekdayID(weekIndex)].bullets = [
        ...bullets.slice(bulletIndex, bulletIndex + 1 + includingBullets),
        ...bulletsWeekAfter,
      ]
      finalWeeekIndex = nextWeekdayID(weekIndex)
      finalBulletIndex = 0
      // move bullet inside same weekday
    } else {
      week[weekIndex].bullets = [
        ...bullets.slice(0, bulletIndex),
        ...bullets.slice(
          bulletIndex + 1 + includingBullets,
          bulletIndex + 1 + includingBullets + 1
        ),
        ...bullets.slice(bulletIndex, bulletIndex + includingBullets + 1),
        ...bullets.slice(bulletIndex + 2 + includingBullets),
      ]
      finalWeeekIndex = weekIndex
      finalBulletIndex = bulletIndex + 1
    }
    await tick()
    let el: HTMLElement = week[finalWeeekIndex].bullets[finalBulletIndex].ref
    el.blur()
    focusAndSetCaret(el)
  }

  function storeBullet(event: any) {
    bulletClipBoard = {
      style: event.detail.bulletStyle,
      text: event.detail.bulletText,
      indent: event.detail.bulletIndent,
    }
  }

  function focusedBullet(weekIndex: number, bulletIndex: number) {
    focusedWeekIndex = weekIndex
    focusedBulletIndex = bulletIndex
  }

  function blurBullet() {
    focusedWeekIndex = undefined
    focusedBulletIndex = undefined
  }

  function nextWeekdayID(id: number) {
    const nextWeekday = weekday.find((day) => day.id > id && day.show)
    return nextWeekday ? nextWeekday.id : 7
  }

  function previousWeekdayID(id: number) {
    const nextWeekday = weekday
      .slice(0, id)
      .reverse()
      .find((day) => day.id < id && day.show)
    return nextWeekday ? nextWeekday.id : 7
  }

  function iterateList(date: string, list: string, step: number) {
    const index = lists.indexOf(list)
    let iterateIndex = index + step
    if (iterateIndex === -1) {
      iterateIndex = lists.length - 1
    } else if (iterateIndex >= lists.length) {
      iterateIndex = 0
    }
    triggeredByListIteration = true
    loadWeekAndList(date, lists[iterateIndex])
  }

  function startTimer() {
    timer.postMessage({ action: 'start', minutes: 52 })
  }

  function continueTimer() {
    timer.postMessage({ action: 'continue' })
  }

  function pauseTimer() {
    timer.postMessage({ action: 'pause' })
  }

  function deleteTimer() {
    timer.postMessage({ action: 'delete' })
  }

  function triggerTimer(event: any) {
    switch (event.detail.action) {
      case 'start':
        startTimer()
        break
      case 'pause':
        pauseTimer()
        break
      case 'continue':
        continueTimer()
        break
      case 'delete':
        deleteTimer()
        break
      case 'clear':
        focusSessions = 0
        break
    }
  }

  function loopMusic() {
    if (loopPlaying) {
      audioLoop.pause()
    } else {
      audioLoop.play()
    }
    loopPlaying = !loopPlaying
  }
</script>

<svelte:window
  on:focus={updateTodayAndStartOfWeek}
  on:keydown={focusFirstBulletIfNothingFocused}
/>

<main>
  <Error bind:errorMessage />
  <Hotkey bind:displayHotkey />
  <div
    class="absolute bottom-0 w-[30px] h-[30px] flex items-center justify-center group"
  >
    <button
      class="invisible group-hover:visible text-[#C4C4C4]"
      on:click={() => {
        displayHotkey = true
      }}>?</button
    >
  </div>
  <div
    class="absolute w-full border-b-[1px] border-[#1d1a1a] p-2 text-xs flex flex-col
    bg-[#f9f9f9]"
  >
    <div class="flex w-full justify-between">
      <div class="flex flex-1 gap-x-3 pl-3">
        <button
          class=""
          on:click={() => {
            colorStyle = (colorStyle % 3) + 1
          }}
        >
          {month + '/' + year}
        </button>
        {#if includingBullets}
          <div class="text-[#C4C4C4]" class:invisible={includingBullets === 0}>
            {includingBullets}
          </div>
        {/if}
        {#if displayEscHint}
          <div
            class="bg-[#E5C4C4] text-center"
            class:invisible={!displayEscHint}
          >
            esc
          </div>
        {/if}
        <div>
          {timerDisplay}
        </div>
        <div class="flex gap-x-2" title="focus sessions">
          {#each { length: focusSessions } as _}
            <div class="">&#x25C6</div>
          {/each}
        </div>
      </div>
      <div class="flex flex-1 justify-end gap-x-3 pr-3">
        <button
          title="focus"
          class="px-1"
          on:click={() => {
            showFocus = !showFocus
          }}
        >
          F
        </button>
        <button
          title="lists"
          class="px-1"
          on:click={() => {
            showLists = !showLists
          }}
        >
          L
        </button>
        <button
          title="weekday"
          class="px-1"
          on:click={() => {
            showWeekdays = !showWeekdays
          }}
        >
          W
        </button>
        <button
          title="today"
          class="px-1"
          on:click={() =>
            loadWeekAndList(
              dayjs().startOf('isoWeek').format('YYYY-MM-DD'),
              list
            )}>T</button
        >
        <button
          title="previous week"
          class="px-1"
          on:click={() =>
            loadWeekAndList(
              dateStartOfWeek.subtract(1, 'week').format('YYYY-MM-DD'),
              list
            )}>P</button
        >
        <button
          title="next week"
          class="px-1"
          on:click={() =>
            loadWeekAndList(
              dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD'),
              list
            )}>N</button
        >
        <!-- <button
          title="switch"
          class="px-1"
          on:click={() => window.api.relaunch()}>S</button
        > -->
        <button title="switch" class="px-1" on:click={() => loopMusic()}
          >M</button
        >
      </div>
    </div>
    {#if showWeekdays}
      <div class="flex self-end gap-x-1 pr-3 pt-2">
        {#each weekday as day (day.name)}
          <button
            class="px-1 rounded-[1px]"
            class:bg-[#555555]={day.show}
            class:text-[#f9f9f9]={day.show}
            on:click={() => {
              day.show = !day.show
            }}>{day.name}</button
          >
        {/each}
      </div>
    {/if}
    {#if showLists}
      <div class="flex self-end gap-x-1 pr-3 pt-2">
        {#each lists as name (name)}
          <button
            class="px-1 rounded-[1px]"
            class:bg-[#555555]={name == list}
            class:text-[#f9f9f9]={name == list}
            on:click={() => {
              loadWeekAndList(
                dayjs().startOf('isoWeek').format('YYYY-MM-DD'),
                name
              )
            }}>{name}</button
          >
        {/each}
      </div>
    {/if}
    {#if showFocus}
      <div class="flex self-end pr-3 pt-2 gap-x-3">
        <button class="hover:underline" on:click={startTimer}>start</button>
        <button class="hover:underline" on:click={pauseTimer}>pause</button>
        <button class="hover:underline" on:click={continueTimer}
          >continue</button
        >
        <button class="hover:underline" on:click={deleteTimer}>delete</button>
      </div>
      <div class="flex self-end pr-3 pt-2">
        <button
          class="hover:underline"
          on:click={() => {
            focusSessions = 0
          }}>clear focus sessions</button
        >
      </div>
    {/if}
  </div>
  <div class="flex h-screen">
    <div
      class="grow-0 w-[50px] min-[900px]:grow min-[900px]:min-w-[50px] flex
      flex-col items-end overflow-hidden pt-14"
      class:hidden={colorStyle != 1}
    >
      <div class="m-2 rounded h-[40%] w-[60px] bg-[#E1E6E0]" />
      <div class="m-2 rounded h-[25%] w-[150px] bg-[#E5C5C5]" />
      <div class="m-2 rounded h-[35%] w-[100px] bg-[#F9DFCC]" />
    </div>
    <div
      id="main"
      class="grow overflow-auto pt-7"
      class:min-[900px]:grow-0={colorStyle == 1}
      class:min-[900px]:min-w-[800px]={colorStyle == 1}
      class:min-[900px]:max-w-[800px]={colorStyle == 1}
    >
      {#each week as day, i (day.name)}
        {#if day.name === list}
          <div
            class="px-7 py-7 m-3 my-9 flex flex-col
          border-[2px] border-[#1d1a1a] rounded shadow-[0_3px_0_#1d1a1a]
          "
            class:!border-none={colorStyle == 3}
            class:!shadow-none={colorStyle == 3}
          >
            <div class="pb-3 text-xl"># {list}</div>
            {#each day.bullets as bullet, j (bullet)}
              <Bullet
                bind:bullet
                bind:editMode
                bind:includingBullets
                maxIncludeBullets={day.bullets.length - j - 1}
                highlight={i == focusedWeekIndex &&
                  focusedBulletIndex < j &&
                  j < focusedBulletIndex + includingBullets + 1}
                {bulletClipBoard}
                on:addBullet={(e) => addBullet(e, i)}
                on:removeBullet={(e) => removeBullet(e, i)}
                on:moveUp={(e) => moveUp(e, i)}
                on:moveDown={(e) => moveDown(e, i)}
                on:moveBulletUp={(e) => moveBulletUp(e, i)}
                on:moveBulletDown={(e) => moveBulletDown(e, i)}
                on:storeBullet={(e) => storeBullet(e)}
                on:previousWeek={() =>
                  loadWeekAndList(
                    dateStartOfWeek.subtract(1, 'week').format('YYYY-MM-DD'),
                    list
                  )}
                on:nextWeek={() =>
                  loadWeekAndList(
                    dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD'),
                    list
                  )}
                on:previousList={() =>
                  iterateList(dateStartOfCurrentWeek, list, -1)}
                on:nextList={() =>
                  iterateList(dateStartOfCurrentWeek, list, 1)}
                on:todayWeek={() =>
                  loadWeekAndList(dateStartOfCurrentWeek, list)}
                on:relaunch={() => window.api.relaunch()}
                on:focusFirstBullet={() => focusFirstBullet()}
                on:focusLastBullet={() => focusLastBullet()}
                on:focusedBullet={() => focusedBullet(i, j)}
                on:blurBullet={() => blurBullet()}
                on:displayEscHint={() => (displayEscHint = true)}
                on:disableEscHint={() => (displayEscHint = false)}
                on:triggerTimer={(e) => triggerTimer(e)}
                on:loopMusic={() => loopMusic()}
              />
            {/each}
          </div>
        {:else if weekday[_.findIndex( weekday, { name: day.name.slice(0, 2) } )].show}
          <div
            class="py-7 m-3 my-9 flex flex-col px-3
          border-[#1d1a1a] rounded shadow-[0_3px_0_#1d1a1a00] border-[2px]
          "
            class:!border-none={colorStyle == 3}
            class:!shadow-none={colorStyle == 3}
          >
            <div class="flex flex-row">
              <div class="pr-2 w-[7rem] text-right text-[#C4C4C4] font-light">
                weekday:
              </div>
              <div class:font-bold={day.date === today}>
                {'# ' + day.name}
              </div>
            </div>
            <div class="flex flex-row">
              <div class="pr-2 w-[7rem] text-right text-[#C4C4C4] font-light">
                date:
              </div>
              <div>{day.date}</div>
            </div>
            <div class="flex flex-row">
              <div class="pr-2 w-[7rem] text-right text-[#C4C4C4] font-light">
                focus:
              </div>
              <div class="flex flex-col flex-1">
                {#each day.bullets as bullet, j (bullet)}
                  <Bullet
                    bind:bullet
                    bind:editMode
                    bind:includingBullets
                    maxIncludeBullets={day.bullets.length - j - 1}
                    highlight={i == focusedWeekIndex &&
                      focusedBulletIndex < j &&
                      j < focusedBulletIndex + includingBullets + 1}
                    {bulletClipBoard}
                    on:addBullet={(e) => addBullet(e, i)}
                    on:removeBullet={(e) => removeBullet(e, i)}
                    on:moveUp={(e) => moveUp(e, i)}
                    on:moveDown={(e) => moveDown(e, i)}
                    on:moveBulletUp={(e) => moveBulletUp(e, i)}
                    on:moveBulletDown={(e) => moveBulletDown(e, i)}
                    on:storeBullet={(e) => storeBullet(e)}
                    on:previousWeek={() =>
                      loadWeekAndList(
                        dateStartOfWeek
                          .subtract(1, 'week')
                          .format('YYYY-MM-DD'),
                        list
                      )}
                    on:nextWeek={() =>
                      loadWeekAndList(
                        dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD'),
                        list
                      )}
                    on:previousList={() =>
                      iterateList(dateStartOfCurrentWeek, list, -1)}
                    on:nextList={() =>
                      iterateList(dateStartOfCurrentWeek, list, 1)}
                    on:todayWeek={() =>
                      loadWeekAndList(dateStartOfCurrentWeek, list)}
                    on:relaunch={() => window.api.relaunch()}
                    on:focusFirstBullet={() => focusFirstBullet()}
                    on:focusLastBullet={() => focusLastBullet()}
                    on:focusedBullet={() => focusedBullet(i, j)}
                    on:blurBullet={() => blurBullet()}
                    on:displayEscHint={() => (displayEscHint = true)}
                    on:disableEscHint={() => (displayEscHint = false)}
                    on:triggerTimer={(e) => triggerTimer(e)}
                    on:loopMusic={() => loopMusic()}
                  />
                {/each}
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
    <div
      class="grow-0 w-[50px] min-[900px]:grow min-[900px]:min-w-[50px] flex
      flex-col items-start overflow-hidden pt-14"
      class:hidden={colorStyle != 1}
    >
      <div class="m-2 rounded h-[30%] w-[150px] bg-[#E5C5C5]" />
      <div class="m-2 rounded h-[20%] w-[60px] bg-[#E1E6E0]" />
      <div class="m-2 rounded h-[50%] w-[100px] bg-[#F9DFCC]" />
    </div>
  </div>
</main>

<style>
  ::-webkit-scrollbar {
    display: none;
  }
</style>
