// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron')
const { join } = require('path')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
var isoWeek = require('dayjs/plugin/isoWeek')
const { start } = require('repl')

dayjs.extend(isoWeek)

// global parameters
let mainWindow
let tray
const dirPath = path.join(__dirname, 'data')
const somedayFile = 'someday'

function uuid() {
  return Math.random().toString(16).slice(2)
}

// file system methods
async function createDirectory(path) {
  try {
    await fs.promises.access(path)
    console.log('Directory exists')
  } catch (err) {
    console.log('Directory does not exist. Creating directory...')
    try {
      await fs.promises.mkdir(path, { recursive: true })
      console.log('Directory created successfully')
    } catch (err) {
      console.error('Error while creating directory:', err)
    }
  }
}

async function createFile(filePath, data) {
  try {
    await fs.promises.access(filePath)
    console.log('File exists')
  } catch (err) {
    console.log('File does not exist. Creating file...')
    try {
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf8'
      )
      console.log('File created successfully')
    } catch (err) {
      console.error('Error while creating file:', err)
    }
  }
}

function saveToFile(filePath, data) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), function (error) {
    if (error) throw error
  })
}

async function readFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
}

function getDefaultWeek(date) {
  const week = []
  for (let i = 0; i < 7; i++) {
    const currentDate = date.add(i, 'day')
    let day = {
      name: '',
      date: '',
      bullets: [{ id: uuid(), style: 'todo', text: '' }],
    }
    day['name'] = currentDate.format('dddd')
    day['date'] = currentDate.format('YYYY-MM-DD')
    week.push(day)
  }
  return week
}

function getFileName(date) {
  return date.isoWeekYear() + '-' + date.isoWeek()
}

// menu
Menu.setApplicationMenu(null)

// main window method
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    minWidth: 400,
    minHeight: 400,
    icon: join(__dirname, 'icons/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
    },
  })

  // and load the index.html of the app.
  mainWindow.loadFile('dist/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', async () => {
    createDirectory(dirPath)

    const startOfWeek = dayjs().startOf('isoWeek')
    console.log(startOfWeek)
    const week = getDefaultWeek(startOfWeek)
    const file = getFileName(startOfWeek)
    await createFile(path.join(dirPath, file), week)

    const somedayDefaultData = {
      name: 'someday',
      date: null,
      bullets: [{ id: uuid(), style: 'todo', text: '' }],
    }
    await createFile(path.join(dirPath, somedayFile), somedayDefaultData)

    const data = await readFile(path.join(dirPath, file))
    const somedayData = await readFile(path.join(dirPath, somedayFile))
    data.push(somedayData)
    mainWindow.webContents.send('on-send-data', data)
  })
}

// tray method
// TODO add tray icon and test tray
const createTray = () => {
  tray = new Tray(join(__dirname, 'icons/calendle_icon.png'))
  tray.setIgnoreDoubleClickEvents(true)
  tray.on('click', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow.show()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// It also checks if a single instance is already running. Instead of creating
// a new instance, it will load the first one.
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  // Create myWindow, load the rest of the app, etc...
  app.whenReady().then(() => {
    createWindow()
    createTray()

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('save-data', (event, data) => {
  const index = _.findIndex(data, function (x) {
    return x.name === 'someday'
  })
  someday = data.pop(index)
  file = getFileName(dayjs(data[0].date))
  saveToFile(path.join(dirPath, file), data)
  saveToFile(path.join(dirPath, somedayFile), someday)
})

ipcMain.on('load-data', async (event, date) => {
  // create file if it doesn't exist
  const startOfWeek = dayjs(date)
  const week = getDefaultWeek(startOfWeek)
  const file = getFileName(startOfWeek)
  await createFile(path.join(dirPath, file), week)

  const data = await readFile(path.join(dirPath, file))
  const somedayData = await readFile(path.join(dirPath, somedayFile))
  data.push(somedayData)
  mainWindow.webContents.send('on-send-data', data)
})
