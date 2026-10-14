const { app, BrowserWindow, ipcMain, dialog, shell, net } = require('electron')
const { fetchExternalProducts } = require('./scraper')
const fs = require('fs')
const path = require('path')
const {
  addProduct,
  deleteProduct,
  ensureCategoryFile,
  getProducts,
  initializeDatabase,
  replaceProducts,
  saveExternalProducts,
  updateProduct,
} = require('./database')

const downloadsFolderTarget = '__food-business-manager-downloads__'

function registerIpcHandlers() {
  ipcMain.handle('products:list', () => getProducts())

  ipcMain.handle('products:add', (_event, product) => {
    addProduct(product)
    return getProducts()
  })

  ipcMain.handle('products:update', (_event, id, product) => {
    updateProduct(id, product)
    return getProducts()
  })

  ipcMain.handle('products:delete', (_event, id) => {
    deleteProduct(id)
    return getProducts()
  })

  const createBackup = (backup) => {
    const backupDir = path.join(app.getPath('documents'), 'food-business-manager', `backups-${getDateStamp()}`)
    fs.mkdirSync(backupDir, { recursive: true })

    const stamp = getLocalDateTimeStamp()
    const filePath = path.join(backupDir, `food-business-manager-backup-${stamp}.json`)
    const data = {
      version: 1,
      createdAt: new Date().toISOString(),
      settings: backup?.settings ?? {},
      products: Array.isArray(backup?.products) ? backup.products : getProducts(),
      deliveryHistory: Array.isArray(backup?.deliveryHistory) ? backup.deliveryHistory : [],
      wholesaleHistory: Array.isArray(backup?.wholesaleHistory) ? backup.wholesaleHistory : [],
    }

    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

    return {
      filePath,
      products: data.products,
    }
  }

  ipcMain.handle('backup:create', (_event, backup) => createBackup(backup))

  ipcMain.handle('backup:reset', (_event, backup) => {
    const result = createBackup(backup)
    replaceProducts([])
    return result
  })

  ipcMain.handle('backup:restore', (_event, backup) => {
    if (Array.isArray(backup?.products)) {
      replaceProducts(backup.products)
    }

    return getProducts()
  })

  ipcMain.handle('pdf:save-delivery', (_event, pdfData, fileName, folderPath) => {
    const targetFolder =
      folderPath === downloadsFolderTarget
        ? app.getPath('downloads')
        : typeof folderPath === 'string' && folderPath.trim().length > 0
        ? folderPath
        : path.join(app.getPath('documents'), 'food-business-manager', 'delivery-notes')

    fs.mkdirSync(targetFolder, { recursive: true })
    const filePath = path.join(targetFolder, fileName)
    const buffer = Buffer.from(pdfData)
    fs.writeFileSync(filePath, buffer)
    return { filePath }
  })

  ipcMain.handle('pdf:choose-delivery-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Valitse lähetyslistojen kansio',
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('pdf:open-file', async (_event, filePath) => {
    try {
      if (!filePath) return { success: false, error: 'No file path' }
      const res = await shell.openPath(filePath)
      // shell.openPath returns empty string on success
      return { success: res === '' , result: res }
    } catch (error) {
      console.error('Opening file failed:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('create-category-file', async (_event, categoryName) => {
    // Tallennetaan käyttäjän datakansioon kuten database.js

    try {
      const filePath = ensureCategoryFile(categoryName)
      return { success: true, fullPath: filePath }
    } catch (error) {
      console.error('Kategori tiedoston luotaessa tapahtui virhe:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Hae verkkokaupan tuotteet ja tallenna ne samoihin kategoriatiedostoihin kuin muut tuotteet.
  ipcMain.handle('scraper:fetch-products', async (_event, sourceUrl) => {
    const fetchedProducts = await fetchExternalProducts(sourceUrl)

    if (!Array.isArray(fetchedProducts)) {
      return {
        success: false,
        error: fetchedProducts?.error ?? 'Verkkokaupan tuotteiden haku epäonnistui',
        products: getProducts(),
      }
    }

    const saved = saveExternalProducts(fetchedProducts)
    const fetchedAt = new Date().toISOString()

    return {
      success: true,
      fetchedAt,
      ...saved,
      products: getProducts(),
    }
  })
}

function getDateStamp() {
  return getLocalDateTimeStamp().slice(0, 10)
}

function getLocalDateTimeStamp() {
  const now = new Date()
  const pad = (value, length = 2) => String(value).padStart(length, '0')

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, '../src/assets/app-icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const startUrl = process.env.ELECTRON_START_URL

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Renderer failed to load:', errorCode, errorDescription)
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details)
  })

  if (startUrl) {
    win.loadURL(startUrl)
    if (process.env.ELECTRON_DEBUG === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function ensureDefaultDeliveryFolder() {
  const folder = path.join(app.getPath('documents'), 'food-business-manager', 'delivery-notes')
  fs.mkdirSync(folder, { recursive: true })
  return folder
}

app.whenReady().then(() => {
  initializeDatabase(app)
  ensureDefaultDeliveryFolder()
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
