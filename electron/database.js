const fs = require('fs')
const path = require('path')

let productsDir

function getProductsDir() {
  if (!productsDir) {
    throw new Error('Product JSON storage has not been initialized')
  }

  return productsDir
}

function normalizeCategory(category) {
  return String(category || 'MUUT').trim() || 'MUUT'
}

function normalizeProduct(product, id) {
  const name = String(product.nimi || '').trim()
  const normalizePrice = (value) => {
    const price = Number(value || 0)
    return Number.isFinite(price) ? price : 0
  }

  const normalized = {
    id: Number(id ?? product.id),
    nimi: name,
    nimiEn: product.nimiEn ? String(product.nimiEn).trim() : '',
    nimiSv: product.nimiSv ? String(product.nimiSv).trim() : '',
    kategoria: normalizeCategory(product.kategoria),
    kategoriaEn: product.kategoriaEn ? String(product.kategoriaEn).trim() : '',
    kategoriaSv: product.kategoriaSv ? String(product.kategoriaSv).trim() : '',
    pakkauskoko: product.pakkauskoko
      ? String(product.pakkauskoko).trim()
      : null,
    tukkuhinta: normalizePrice(product.tukkuhinta),
    suositushinta: normalizePrice(product.suositushinta),
  }

  if (product.alv !== undefined) {
    normalized.alv = Number(product.alv || 0)
  }

  if (product.varasto !== undefined) {
    normalized.varasto = Number(product.varasto || 0)
  }

  if (product.source) {
    normalized.source = String(product.source)
  }

  return normalized
}

function getCategoryFileName(category) {
  const fallback = 'muut'
  const slug = normalizeCategory(category)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || fallback}.json`
}

function getCategoryFilePath(category) {
  return path.join(getProductsDir(), getCategoryFileName(category))
}

function readJsonFile(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readAllProducts() {
  const dir = getProductsDir()

  if (!fs.existsSync(dir)) {
    return []
  }

  return fs
    .readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .flatMap((fileName) =>
      readJsonFile(path.join(dir, fileName)).map((product) =>
        normalizeProduct(product, product.id),
      ),
    )
    .filter((product) => product.id && product.nimi && product.kategoria)
}

function writeJsonFile(filePath, products) {
  fs.writeFileSync(filePath, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
}

function ensureCategoryFile(category) {
  const filePath = getCategoryFilePath(category)
  fs.mkdirSync(getProductsDir(), { recursive: true })

  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, [])
  }

  return filePath
}

function writeProductsByCategory(products) {
  const dir = getProductsDir()
  fs.mkdirSync(dir, { recursive: true })


  const existingJsonFiles = new Set(
    fs.readdirSync(dir).filter((fileName) => fileName.endsWith('.json')),
  )

  const grouped = products.reduce((acc, product) => {
    const normalized = normalizeProduct(product, product.id)
    const category = normalized.kategoria

    if (!acc[category]) {
      acc[category] = []
    }

    acc[category].push(normalized)
    return acc
  }, {})

  Object.entries(grouped).forEach(([category, categoryProducts]) => {
    categoryProducts.sort((a, b) => a.nimi.localeCompare(b.nimi, 'fi'))

    const fileName = getCategoryFileName(category)
    existingJsonFiles.delete(fileName)
    writeJsonFile(getCategoryFilePath(category), categoryProducts)
  })

  existingJsonFiles.forEach((fileName) => {
    const filePath = path.join(dir, fileName)

    try {
      fs.unlinkSync(filePath)
    } catch {
      writeJsonFile(filePath, [])
    }
  })
}

function getNextId(products) {
  if (products.length === 0) {
    return 1
  }

  return Math.max(...products.map((product) => Number(product.id) || 0)) + 1
}

function initializeDatabase(app) {
  // TÄMÄ KORJAA VIRHEEN: Tallennetaan käyttäjän omaan AppData-kansioon, johon sovelluksella on aina kirjoitusoikeus
  productsDir = path.join(app.getPath('userData'), 'products')
  
  // Varmistetaan heti käynnistyksessä, että kansio on olemassa
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true })
  }
  
  return productsDir
}

function getProducts() {
  return readAllProducts().sort((a, b) =>
    `${a.kategoria}${a.nimi}`.localeCompare(`${b.kategoria}${b.nimi}`, 'fi'),
  )
}

function addProduct(product) {
  const products = readAllProducts()
  const nextProduct = normalizeProduct(product, getNextId(products))

  products.push(nextProduct)
  writeProductsByCategory(products)

  return nextProduct.id
}

function updateProduct(id, product) {
  const productId = Number(id)
  const products = readAllProducts()
  const index = products.findIndex((item) => item.id === productId)

  if (index === -1) {
    throw new Error(`Product ${productId} was not found`)
  }

  products[index] = normalizeProduct(product, productId)
  writeProductsByCategory(products)
}

function deleteProduct(id) {
  const productId = Number(id)
  const products = readAllProducts().filter((product) => product.id !== productId)
  writeProductsByCategory(products)
}

function getProductKey(product) {
  return String(product.nimi || '').trim().toLowerCase()
}

function saveExternalProducts(externalProducts) {
  if (!Array.isArray(externalProducts)) {
    throw new Error('Verkkotuotteiden haku ei palauttanut tuotelistaa')
  }

  const products = readAllProducts()
  const productIndex = new Map(products.map((product, index) => [getProductKey(product), index]))
  let nextId = getNextId(products)
  let added = 0
  let updated = 0

  externalProducts
    .map((product) => normalizeProduct({ ...product, source: 'web' }))
    .filter((product) => product.nimi && product.kategoria)
    .forEach((product) => {
      const key = getProductKey(product)
      const existingIndex = productIndex.get(key)

      if (existingIndex !== undefined) {
        const existingProduct = products[existingIndex]
        products[existingIndex] = normalizeProduct(
          {
            ...existingProduct,
            ...product,
            id: existingProduct.id,
            source: 'web',
          },
          existingProduct.id,
        )
        updated += 1
        return
      }

      const newProduct = normalizeProduct(product, nextId)
      products.push(newProduct)
      productIndex.set(key, products.length - 1)
      nextId += 1
      added += 1
    })

  writeProductsByCategory(products)

  return {
    added,
    updated,
    total: externalProducts.length,
  }
}

function replaceProducts(products) {
  if (!Array.isArray(products)) {
    throw new Error('Backup products must be an array')
  }

  writeProductsByCategory(
    products
      .map((product) => normalizeProduct(product, product.id))
      .filter((product) => product.id && product.nimi && product.kategoria),
  )
}

module.exports = {
  addProduct,
  deleteProduct,
  ensureCategoryFile,
  getProducts,
  initializeDatabase,
  replaceProducts,
  saveExternalProducts,
  updateProduct,
}
