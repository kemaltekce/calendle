// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron')
const { join } = require('path')

// global parameters
let mainWindow
let tray

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
      preload: join(__dirname, 'preload.ts'),
    },
  })

  // and load the index.html of the app.
  mainWindow.loadFile('dist/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', () => {})

  // also check focus data date if app not reopened every day but kept open
  mainWindow.on('focus', () => {})
}

// tray method
const createTray = () => {
  tray = new Tray(join(__dirname, 'icons/focle_icon.png'))
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
