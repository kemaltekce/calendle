// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain, Menu, Tray } = require('electron')
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
const somedayFile = 'someday'
const lists = ['someday', 'project', 'personal', 'work']

function uuid() {
  return Math.random().toString(16).slice(2)
}

// file system methods
async function createDirectory(path) {
  try {
    await fs.promises.access(path)
    console.log('Directory exists')
  } catch (error) {
    console.log('Directory does not exist. Creating directory...')
    try {
      await fs.promises.mkdir(path, { recursive: true })
      console.log('Directory created successfully')
    } catch (error) {
      const message = 'Error while creating directory: ' + error
      mainWindow.webContents.send('on-send-error', message)
      throw error
    }
  }
}

async function createFile(filePath, data) {
  try {
    await fs.promises.access(filePath)
    console.log('File exists')
  } catch (error) {
    console.log('File does not exist. Creating file...')
    try {
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf8'
      )
      console.log('File created successfully')
    } catch (error) {
      const message = 'Error while creating file: ' + error
      mainWindow.webContents.send('on-send-error', message)
      throw error
    }
  }
}

function saveToFile(filePath, data) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), function (error) {
    if (error) {
      const message = 'Error while writing to file: ' + error
      mainWindow.webContents.send('on-send-error', message)
      throw error
    }
  })
}

async function readFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    const message = 'Error while reading file: ' + error
    mainWindow.webContents.send('on-send-error', message)
    throw error
  }
}

function getDefaultWeek(date) {
  const week = []
  for (let i = 0; i < 7; i++) {
    const currentDate = date.add(i, 'day')
    let day = {
      name: '',
      date: '',
      bullets: [{ id: uuid(), style: 'todo', text: '', indent: 0 }],
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

function changeIndentFromBooleanToNumber(data) {
  data.forEach(function (weekday) {
    if (typeof weekday.bullets[0].indent == 'boolean') {
      weekday.bullets.forEach(function (bullet) {
        bullet.indent = bullet.indent ? 1 : 0
      })
    }
  })
  return data
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

  // add keyboard edit shortcuts
  var template = [
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          selector: 'selectAll:',
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  mainWindow.webContents.on('did-finish-load', async () => {
    const dialogOptions = {
      message: 'Select folder to save/read your calendle data',
      properties: ['openDirectory'],
    }
    try {
      result = await dialog.showOpenDialog(dialogOptions)
      if (result.canceled) {
        app.quit()
      }
    } catch (error) {
      const message = 'Error while selecting folder: ' + error
      mainWindow.webContents.send('on-send-error', message)
    }
    dirPath = result.filePaths[0]
    createDirectory(dirPath)

    const startOfWeek = dayjs().startOf('isoWeek')
    const week = getDefaultWeek(startOfWeek)
    const file = getFileName(startOfWeek)
    await createFile(path.join(dirPath, file), week)

    lists.forEach(async (list) => {
      const listDefaultData = {
        name: list,
        date: null,
        bullets: [{ id: uuid(), style: 'todo', text: '', indent: 0 }],
      }
      await createFile(path.join(dirPath, list), listDefaultData)
    })

    let data = await readFile(path.join(dirPath, file))
    const listData = await readFile(path.join(dirPath, lists[0]))
    data.push(listData)
    data = changeIndentFromBooleanToNumber(data)
    mainWindow.webContents.send('on-send-data', data, lists[0])
    mainWindow.webContents.send('on-send-lists', lists)
  })
}

// tray method
const createTray = () => {
  tray = new Tray(join(__dirname, 'icons/tray.png'))
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
  if (!Array.isArray(data) || data.length === 0) {
    const error =
      'Something went wrong. The data to be saved looks weired. It is either empty or not an array.'
    const message = 'Error while saving data: ' + error
    mainWindow.webContents.send('on-send-error', message)
    throw new Error(error)
  }
  const index = _.findIndex(data, function (x) {
    return lists.includes(x.name)
  })
  const list = data.pop(index)
  file = getFileName(dayjs(data[0].date))
  saveToFile(path.join(dirPath, file), data)
  saveToFile(path.join(dirPath, list.name), list)
})

ipcMain.on('load-data', async (event, date, list) => {
  // create file if it doesn't exist
  const startOfWeek = dayjs(date)
  const week = getDefaultWeek(startOfWeek)
  const file = getFileName(startOfWeek)
  await createFile(path.join(dirPath, file), week)

  let data = await readFile(path.join(dirPath, file))
  const listData = await readFile(path.join(dirPath, list))
  data.push(listData)
  data = changeIndentFromBooleanToNumber(data)
  mainWindow.webContents.send('on-send-data', data, list)
})

ipcMain.on('relaunch', async (event) => {
  app.relaunch()
  app.quit()
})
