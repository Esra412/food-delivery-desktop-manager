export interface Product {
  id: number
  nimi: string
  nimiEn?: string
  nimiSv?: string
  kategoria: string
  kategoriaEn?: string
  kategoriaSv?: string
  pakkauskoko?: string
  tukkuhinta: number
  suositushinta: number
  alv?: number
  varasto?: number
  source?: string
  selected?: boolean
}
