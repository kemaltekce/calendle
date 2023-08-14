<script lang="ts">
  import _ from 'lodash'
  import dayjs from 'dayjs'

  import Bullet from './lib/Bullet.svelte'
  import { afterUpdate, tick } from 'svelte'

  type bullet = {
    id: string
    style: string
    text: string
    ref: HTMLElement
  }
  let bulletClipBoard: { style: string; text: string } = null
  let week: { name: string; date: string; bullets: bullet[] }[] = []
  let previousWeek: { name: string; date: string; bullets: bullet[] }[] = []
  let editMode: boolean = true
  let dateStartOfWeek: any = ''
  let year: string = ''
  let month: string = ''

  window.api.onSendData(async (data) => {
    console.log(data)
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
    console.log(week)
    focusAndSetCaret(week[0].bullets[0].ref)
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

  async function addBullet(event: any, weekIndex: number) {
    const previousBullet: string = event.detail.bulletID
    const defaultBullet: bullet = {
      id: uuid(),
      style: event.detail.bulletStyle,
      text: event.detail.bulletText,
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
    } else if (weekIndex !== 0) {
      weekIndex = weekIndex - 1
      el = week[weekIndex].bullets.slice(-1)[0].ref
      focusAndSetCaret(el)
    }

    // scroll to top if first bullet
    if (weekIndex === 0 && previousBulletIndex === -1) {
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
      weekIndex = weekIndex + 1
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

    // if first bullet on monday
    if (bulletIndex === 0 && weekIndex === 0) {
      return
      // if first bullet on any other day. move bullet to previous weekday
    } else if (bulletIndex === 0) {
      // if last bullet in weekday, add empty default bullet
      if (bullets.length === 1) {
        const defaultBullet: bullet = {
          id: uuid(),
          style: 'todo',
          text: '',
          ref: null,
        }
        week[weekIndex].bullets = [defaultBullet]
      } else {
        week[weekIndex].bullets = [...bullets.slice(1)]
      }
      let bulletsWeekBefore: bullet[] = week[weekIndex - 1].bullets
      week[weekIndex - 1].bullets = [...bulletsWeekBefore, bullets[0]]
      finalWeeekIndex = weekIndex - 1
      finalBulletIndex = week[finalWeeekIndex].bullets.length - 1
      // move bullet inside same weekday
    } else {
      week[weekIndex].bullets = [
        ...bullets.slice(0, bulletIndex - 1),
        bullets[bulletIndex],
        ...bullets.slice(bulletIndex - 1, bulletIndex),
        ...bullets.slice(bulletIndex + 1),
      ]
      finalWeeekIndex = weekIndex
      finalBulletIndex = bulletIndex - 1
    }
    await tick()
    let el: HTMLElement = week[finalWeeekIndex].bullets[finalBulletIndex].ref
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
    if (bulletIndex + 1 === bullets.length && weekIndex === 7) {
      return
      // if last bullet on any other day. move bullet to next weekday
    } else if (bulletIndex + 1 === bullets.length) {
      // if last bullet in weekday, add empty default bullet
      if (bullets.length === 1) {
        const defaultBullet: bullet = {
          id: uuid(),
          style: 'todo',
          text: '',
          ref: null,
        }
        week[weekIndex].bullets = [defaultBullet]
      } else {
        week[weekIndex].bullets = [...bullets.slice(0, -1)]
      }
      let bulletsWeekAfter: bullet[] = week[weekIndex + 1].bullets
      week[weekIndex + 1].bullets = [bullets[bulletIndex], ...bulletsWeekAfter]
      finalWeeekIndex = weekIndex + 1
      finalBulletIndex = 0
      // move bullet inside same weekday
    } else {
      week[weekIndex].bullets = [
        ...bullets.slice(0, bulletIndex),
        bullets[bulletIndex + 1],
        bullets[bulletIndex],
        ...bullets.slice(bulletIndex + 2),
      ]
      finalWeeekIndex = weekIndex
      finalBulletIndex = bulletIndex + 1
    }
    await tick()
    let el: HTMLElement = week[finalWeeekIndex].bullets[finalBulletIndex].ref
    focusAndSetCaret(el)
  }

  function storeBullet(event: any) {
    bulletClipBoard = {
      style: event.detail.bulletStyle,
      text: event.detail.bulletText,
    }
  }
</script>

<main>
  <div
    class="absolute w-full border-b-[1px] border-[#555555] p-2 text-xs flex
    justify-between bg-[#f0f0f0]"
  >
    <div class="pl-3">calendle</div>
    <div>{month + '/' + year}</div>
    <div class="flex gap-x-3 pr-3">
      <button
        class="px-1"
        on:click={() =>
          loadWeek(dayjs().startOf('isoWeek').format('YYYY-MM-DD'))}>T</button
      >
      <button
        class="px-1"
        on:click={() =>
          loadWeek(dateStartOfWeek.subtract(1, 'week').format('YYYY-MM-DD'))}
        >P</button
      >
      <button
        class="px-1"
        on:click={() =>
          loadWeek(dateStartOfWeek.add(1, 'week').format('YYYY-MM-DD'))}
        >N</button
      >
    </div>
  </div>
  <div class="flex h-screen">
    <div
      class="grow-0 w-[50px] min-[700px]:grow min-[700px]:min-w-[50px] flex
      flex-col items-end overflow-hidden pt-14"
    >
      <div class="m-2 rounded h-[40%] w-[60px] bg-[#E1E6E0]" />
      <div class="m-2 rounded h-[25%] w-[150px] bg-[#E5C5C5]" />
      <div class="m-2 rounded h-[35%] w-[100px] bg-[#F9DFCC]" />
    </div>
    <div
      id="main"
      class="grow min-[700px]:grow-0 min-[700px]:min-w-[600px]
      min-[700px]:max-w-[600px] overflow-auto pt-7"
    >
      {#each week as day, i (day.name)}
        {#if day.name === 'someday'}
          <div
            class="px-7 py-7 m-3 my-9 flex flex-col
          border-[2px] border-[#555555] rounded shadow-[0_3px_0_#555555]
          "
          >
            <div class="text-xl pb-3"># someday</div>
            {#each day.bullets as bullet (bullet)}
              <Bullet
                bind:bullet
                bind:editMode
                {bulletClipBoard}
                on:addBullet={(e) => addBullet(e, i)}
                on:removeBullet={(e) => removeBullet(e, i)}
                on:moveUp={(e) => moveUp(e, i)}
                on:moveDown={(e) => moveDown(e, i)}
                on:moveBulletUp={(e) => moveBulletUp(e, i)}
                on:moveBulletDown={(e) => moveBulletDown(e, i)}
                on:storeBullet={(e) => storeBullet(e)}
              />
            {/each}
          </div>
        {:else}
          <div
            class="px-3 py-7 m-3 my-9 flex flex-col
          border-[2px] border-[#555555] rounded shadow-[0_3px_0_#555555]
          "
          >
            <div class="flex flex-row">
              <div class="pr-2 w-[20%] text-right text-[#C4C4C4] font-light">
                weekday:
              </div>
              <div class="">{'# ' + day.name}</div>
            </div>
            <div class="flex flex-row">
              <div class="pr-2 w-[20%] text-right text-[#C4C4C4] font-light">
                date:
              </div>
              <div class="">{day.date}</div>
            </div>
            <div class="flex flex-row">
              <div class="pr-2 w-[20%] text-right text-[#C4C4C4] font-light">
                focus:
              </div>
              <div class="flex flex-col flex-1">
                {#each day.bullets as bullet (bullet)}
                  <Bullet
                    bind:bullet
                    bind:editMode
                    {bulletClipBoard}
                    on:addBullet={(e) => addBullet(e, i)}
                    on:removeBullet={(e) => removeBullet(e, i)}
                    on:moveUp={(e) => moveUp(e, i)}
                    on:moveDown={(e) => moveDown(e, i)}
                    on:moveBulletUp={(e) => moveBulletUp(e, i)}
                    on:moveBulletDown={(e) => moveBulletDown(e, i)}
                    on:storeBullet={(e) => storeBullet(e)}
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
