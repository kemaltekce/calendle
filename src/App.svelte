<script lang="ts">
  import _ from 'lodash'
  import dayjs from 'dayjs'
  import isoWeek from 'dayjs/plugin/isoWeek'

  import Bullet from './lib/Bullet.svelte'
  import Error from './lib/Error.svelte'
  import Hotkey from './lib/Hotkey.svelte'
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
  let changeStyle: boolean = false
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

  window.api.onSendData(async (data) => {
    data.forEach((day) => {
      day.bullets.forEach((bullet) => {
        bullet.ref = null
      })
    })
    week = JSON.parse(JSON.stringify(data))
    dateStartOfWeek = dayjs(data[0].date)
    year = dateStartOfWeek.format('YYYY')
    month = dateStartOfWeek.format('MMMM')
    await tick()
    focusAndSetCaret(week[0].bullets[0].ref)
  })

  window.api.onSendError((message) => {
    errorMessage = message
  })

  function loadWeek(date: string) {
    window.api.loadData(date)
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
    }

    // scroll to bottom if last bullet
    if (weekIndex === 7 && previousBulletIndex === bullets.length) {
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
    class="absolute w-full border-b-[1px] border-[#333333] p-2 text-xs flex flex-col
    bg-[#f9f9f9]"
  >
    <div class="flex w-full justify-between">
      <div class="flex flex-1 gap-x-3 pl-3">
        <button
          class=""
          on:click={() => {
            changeStyle = !changeStyle
          }}
        >
          calendle
        </button>
        <div
          class="w-[1rem] text-[#C4C4C4]"
          class:invisible={includingBullets === 0}
        >
          {includingBullets}
        </div>
        <div
          class="w-[2rem] bg-[#E5C4C4] text-center"
          class:invisible={!displayEscHint}
        >
          esc
        </div>
      </div>
      <button
        class=""
        on:click={() => {
          colorStyle = (colorStyle % 3) + 1
        }}
      >
        {month + '/' + year}
      </button>
      <div class="flex flex-1 justify-end gap-x-3 pr-3">
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
            loadWeek(dayjs().startOf('isoWeek').format('YYYY-MM-DD'))}
          >T</button
        >
        <button
          title="previous week"
          class="px-1"
          on:click={() =>
            loadWeek(dateStartOfWeek.subtract(1, 'week').format('YYYY-MM-DD'))}
          >P</button
        >
        <button
          title="next week"
          class="px-1"
          on:click={() =>
            loadWeek(dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD'))}
          >N</button
        >
        <button
          title="switch"
          class="px-1"
          on:click={() => window.api.relaunch()}>S</button
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
  </div>
  <div class="flex h-screen">
    <div
      class="grow-0 w-[50px] min-[700px]:grow min-[700px]:min-w-[50px] flex
      flex-col items-end overflow-hidden pt-14"
      class:hidden={colorStyle != 1}
    >
      <div
        class="m-2 rounded h-[40%] w-[60px] bg-[#E1E6E0]"
        class:hidden={changeStyle}
      />
      <div
        class="m-2 rounded h-[25%] w-[150px] bg-[#E5C5C5]"
        class:hidden={changeStyle}
      />
      <div
        class="m-2 rounded h-[35%] w-[100px] bg-[#F9DFCC]"
        class:hidden={changeStyle}
      />
    </div>
    <div
      id="main"
      class="grow overflow-auto pt-7"
      class:min-[700px]:grow-0={colorStyle == 1}
      class:min-[700px]:min-w-[600px]={colorStyle == 1}
      class:min-[700px]:max-w-[600px]={colorStyle == 1}
      class:border-x-[1px]={changeStyle && colorStyle == 1}
      class:border-[#333333]={changeStyle && colorStyle == 1}
    >
      {#each week as day, i (day.name)}
        {#if day.name === 'someday'}
          <div
            class="px-7 py-7 m-3 my-9 flex flex-col
          border-[2px] border-[#333333] rounded shadow-[0_3px_0_#333333]
          "
            class:border-none={changeStyle}
            class:shadow-none={changeStyle}
            class:!mx-7={changeStyle}
            class:!px-0={changeStyle}
            class:!border-none={colorStyle == 3}
            class:!shadow-none={colorStyle == 3}
          >
            <div
              class="pb-3"
              class:text-xl={!changeStyle}
              class:text-3xl={changeStyle}
            >
              # someday
            </div>
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
                  loadWeek(
                    dateStartOfWeek.subtract(1, 'week').format('YYYY-MM-DD')
                  )}
                on:nextWeek={() =>
                  loadWeek(
                    dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD')
                  )}
                on:todayWeek={() => loadWeek(dateStartOfCurrentWeek)}
                on:relaunch={() => window.api.relaunch()}
                on:focusFirstBullet={() => focusFirstBullet()}
                on:focusLastBullet={() => focusLastBullet()}
                on:focusedBullet={() => focusedBullet(i, j)}
                on:blurBullet={() => blurBullet()}
                on:displayEscHint={() => (displayEscHint = true)}
                on:disableEscHint={() => (displayEscHint = false)}
              />
            {/each}
          </div>
        {:else if weekday[_.findIndex( weekday, { name: day.name.slice(0, 2) } )].show}
          <div
            class="py-7 m-3 my-9 flex flex-col
          border-[#333333] rounded shadow-[0_3px_0_#333333]
          "
            class:px-3={!changeStyle}
            class:border-[2px]={!changeStyle}
            class:mx-7={changeStyle}
            class:!pb-[4rem]={changeStyle}
            class:border-b-[1px]={changeStyle}
            class:rounded-none={changeStyle}
            class:shadow-none={changeStyle}
            class:!border-none={colorStyle == 3}
            class:!shadow-none={colorStyle == 3}
          >
            <div
              class="flex flex-row"
              class:text-3xl={changeStyle}
              class:uppercase={changeStyle}
              class:tracking-[0.7rem]={changeStyle}
            >
              <div
                class="pr-2 w-[7rem] text-right text-[#C4C4C4] font-light"
                class:hidden={changeStyle}
              >
                weekday:
              </div>
              <div class:font-bold={day.date === today}>
                {(changeStyle ? '#' : '# ') + day.name}
              </div>
            </div>
            <div
              class="flex flex-row"
              class:text-xs={changeStyle}
              class:pb-4={changeStyle}
            >
              <div
                class="pr-2 w-[7rem] text-right text-[#C4C4C4] font-light"
                class:hidden={changeStyle}
              >
                date:
              </div>
              <div class:text-[#C4C4C4]={changeStyle}>{day.date}</div>
            </div>
            <div class="flex flex-row">
              <div
                class="pr-2 w-[7rem] text-right text-[#C4C4C4] font-light"
                class:hidden={changeStyle}
              >
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
                      loadWeek(
                        dateStartOfWeek
                          .subtract(1, 'week')
                          .format('YYYY-MM-DD')
                      )}
                    on:nextWeek={() =>
                      loadWeek(
                        dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD')
                      )}
                    on:todayWeek={() => loadWeek(dateStartOfCurrentWeek)}
                    on:relaunch={() => window.api.relaunch()}
                    on:focusFirstBullet={() => focusFirstBullet()}
                    on:focusLastBullet={() => focusLastBullet()}
                    on:focusedBullet={() => focusedBullet(i, j)}
                    on:blurBullet={() => blurBullet()}
                    on:displayEscHint={() => (displayEscHint = true)}
                    on:disableEscHint={() => (displayEscHint = false)}
                  />
                {/each}
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
    <div
      class="grow-0 w-[50px] min-[700px]:grow min-[700px]:min-w-[50px] flex
      flex-col items-start overflow-hidden pt-14"
      class:hidden={colorStyle != 1}
    >
      <div
        class="m-2 rounded h-[30%] w-[150px] bg-[#E5C5C5]"
        class:hidden={changeStyle}
      />
      <div
        class="m-2 rounded h-[20%] w-[60px] bg-[#E1E6E0]"
        class:hidden={changeStyle}
      />
      <div
        class="m-2 rounded h-[50%] w-[100px] bg-[#F9DFCC]"
        class:hidden={changeStyle}
      />
    </div>
  </div>
</main>

<style>
  ::-webkit-scrollbar {
    display: none;
  }
</style>
