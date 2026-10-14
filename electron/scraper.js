const { net } = require('electron')
const cheerio = require('cheerio')


async function fetchExternalProducts(sourceUrl) {
  let index = 0
  try {
    const parsedUrl = new URL(sourceUrl)
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      throw new Error('Product source must be a public HTTPS URL without credentials')
    }
    const baseUrl = parsedUrl.href.endsWith('/') ? parsedUrl.href : `${parsedUrl.href}/`
    const list = []
    const pages = []

    for (let page = 1; ; page++) {
      const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`
      let response

      try {
        response = await net.fetch(url)
      } catch (error) {
        if (page === 1) {
          throw error
        }
        break
      }

      if (!response.ok) {
        if (page === 1) {
          throw new Error(`Scrape HTTP error: ${response.status} ${response.statusText}`)
        }
        break
      }
      
      const html = await response.text()
      const pageDocument = cheerio.load(html)

      if (page > 1 && pageDocument('li.product, li[class*="product"]').length === 0) {
        break
      }

      pages.push(html)
    }

    for (const html of pages) {
      const $ = cheerio.load(html)

      const products = $('li.product, li[class*="product"]')

      products.each((productIndex, element) => {
        let productName = $(element).find('h2').text() || "N/A"
        let category = $(element).find('[class="ast-woo-product-category"]').text() || "Yleinen"

        // Tee array tuotteen hinnoista, koska se tuote voi olla alennuksessa ja näyttää kahta eri hintaa
        const priceArray = $(element)
          .find('.price del, .price ins, [class*="price"] del, [class*="price"] ins')
          .map((_, priceElement) => $(priceElement).text().trim())
          .get()

        if (priceArray.length === 0) {
          const regularPrice = $(element).find('.price, [class*="price"]').first().text().trim()
          if (regularPrice) {
            priceArray.push(regularPrice)
          }
        }
        let priceRaw = priceArray[0] || "0" // Ota ensimmäinen eli AKLUPERÄINEN HINTA!!

        let priceALV = $(element).find('[class*="woocommerce-price-suffix"]').text() || "0"

        productName = productName.trim()
        category = category.trim()
        priceRaw = priceRaw.trim()
        priceALV = priceALV.trim()

        priceRaw = priceRaw
          .replace(/€/g, "")
          .replace(/\u00A0/g, "") 
          .replace(/,/g, ".")
          .trim()

        const regexMatch = priceRaw.match(/\d+(\.\d+)?/)

        const numericFilter = regexMatch ? regexMatch[0] : "0"
        const finalPrice = parseFloat(numericFilter) || 0

        const alvMatch = priceALV.match(/(\d+[,.]?\d*)/)
        const alvValue = alvMatch ? parseFloat(alvMatch[0].replace(",", ".")) : 0

        if (productName && productName !== "N/A") {
          list.push({
            id: productIndex + index + 100, // + 100 jottei id ole sama kuin paikallisessa tuotteissa
            nimi: productName,
            kategoria: category,
            tukkuhinta: 0,
            suositushinta: finalPrice,
            alv: alvValue,
            selected: false
          })
        }
        index++
      })
    }
  return list
  } catch (error) {
    console.error('Error fetching external store data:', error)
    return { error: error.message }
  }
}

module.exports = { fetchExternalProducts }