import { loadAppSettings } from '../settings/appSettings'
import en from './en.json'
import fi from './fi.json'
import sv from './sv.json'

type Dictionary = typeof fi
type TranslationKey = keyof Dictionary
export type Language = 'fi' | 'en' | 'sv'

type TranslationArgs = Record<string, string | number>

const dictionaries: Record<Language, Dictionary> = {
  fi,
  en,
  sv,
}

export function getLanguage(): Language {
  const language = loadAppSettings().language
  return language === 'en' || language === 'sv' ? language : 'fi'
}

export function getDictionary(language: Language) {
  return dictionaries[language]
}

export function useI18n() {
  const dictionary = dictionaries[getLanguage()]

  return {
    language: getLanguage(),
    t: (key: TranslationKey, args?: TranslationArgs) => {
      const value = dictionary[key] ?? fi[key] ?? key
      if (!args) {
        return value
      }

      return Object.entries(args).reduce(
        (current, [arg, argValue]) =>
          current.replace(new RegExp(`{{${arg}}}`, 'g'), String(argValue)),
        value,
      )
    },
  }
}
