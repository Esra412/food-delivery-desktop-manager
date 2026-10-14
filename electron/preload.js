const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    add: (product) => ipcRenderer.invoke('products:add', product),
    update: (id, product) => ipcRenderer.invoke('products:update', id, product),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    // Yeni fonksiyonu buraya, products grubunun altına ekledik:
    createCategoryFile: (categoryName) => ipcRenderer.invoke('create-category-file', categoryName),
  },
  backups: {
    create: (backup) => ipcRenderer.invoke('backup:create', backup),
    reset: (backup) => ipcRenderer.invoke('backup:reset', backup),
    restore: (backup) => ipcRenderer.invoke('backup:restore', backup),
  },
  pdf: {
    saveDeliveryPdf: (pdfData, fileName, folderPath) =>
      ipcRenderer.invoke('pdf:save-delivery', pdfData, fileName, folderPath),
    chooseDeliveryFolder: () => ipcRenderer.invoke('pdf:choose-delivery-folder'),
    openFile: (filePath) => ipcRenderer.invoke('pdf:open-file', filePath),
  },
  // Lisää scraper-ominaisuudet contextBridgeen
  scraper: {
    scrapeProducts: (sourceUrl) => ipcRenderer.invoke('scraper:fetch-products', sourceUrl),
  },
})
