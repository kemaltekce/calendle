let timerTimeout: ReturnType<typeof setTimeout> | undefined
let targetTime: number
let remainingTime: number = 0
let isRunning: boolean = false

self.onmessage = function (
  event: MessageEvent<{ action: string; minutes?: number }>
) {
  const action: string = event.data.action

  switch (action) {
    case 'start':
      const minutes: number = event.data.minutes || 0
      startTimer(minutes)
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
  }
}

function startTimer(minutes: number) {
  if (!isRunning && remainingTime == 0) {
    isRunning = true
    remainingTime = minutes * 60 * 1000
    targetTime = Date.now() + remainingTime

    const time: string = formatTime(remainingTime)
    self.postMessage(time)
    timerTimeout = setTimeout(updateTimer, 500)
    // updateTimer()
  }
}

function updateTimer() {
  const currentTime: number = Date.now()
  remainingTime = targetTime - currentTime

  if (remainingTime <= 0) {
    isRunning = false
    clearTimeout(timerTimeout)
    remainingTime = 0
    self.postMessage('00:00')
    self.postMessage('done')
    return
  }

  const time: string = formatTime(remainingTime)
  self.postMessage(time)
  timerTimeout = setTimeout(updateTimer, 1000)
}

function pauseTimer() {
  isRunning = false
  if (timerTimeout) {
    clearTimeout(timerTimeout)
  }
}

function continueTimer() {
  if (!isRunning && remainingTime > 0) {
    isRunning = true
    targetTime = Date.now() + remainingTime
    timerTimeout = setTimeout(updateTimer, 1000)
  }
}

function deleteTimer() {
  isRunning = false
  if (timerTimeout) {
    clearTimeout(timerTimeout)
  }
  remainingTime = 0
  self.postMessage('')
}

function formatTime(milliseconds: number): string {
  const totalSeconds: number = Math.floor(milliseconds / 1000)
  const minutes: number = Math.floor(totalSeconds / 60)
  const seconds: number = totalSeconds % 60
  return `${padZero(minutes)}:${padZero(seconds)}`
}

function padZero(value: number): string {
  return value < 10 ? `0${value}` : value.toString()
}

export {}
