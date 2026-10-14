# Food Business Manager

A multilingual desktop application for small food businesses to manage products, prepare delivery documents, and create wholesale price lists. Product and customer information is managed locally, with PDF documents generated from the app.

The application is built with Electron, React, and TypeScript. Its interface and product data support Finnish, English, and Swedish.

## Features

- Manage products, categories, package sizes, wholesale prices, and recommended prices.
- Maintain product names and categories in Finnish, English, and Swedish.
- Select products and prepare delivery lists with customer details, quantities, and totals.
- Create delivery documents and wholesale price lists as PDFs.
- Search, filter, and sort delivery history, and reopen or regenerate delivery PDFs.
- Configure company details, language, and PDF appearance.
- Import product listings from a public HTTPS store URL configured in Settings.
- Export and restore backups containing products, settings, and delivery history.

## Technology

- Electron and electron-builder
- React 18, TypeScript, and Vite
- Tailwind CSS
- Zustand and React Router DOM
- jsPDF and lucide-react
- Cheerio for parsing product listings

## Project Structure

```text
electron/
  main.js             Electron main process, IPC, PDF, backup, and sync handlers
  preload.js          Renderer bridge for supported Electron APIs
  database.js         Local product JSON storage
  scraper.js          Public store product fetching and parsing
  run-electron.js     Electron development launcher
src/
  components/         Shared interface components
  i18n/               Finnish, English, and Swedish translations
  pages/              Application views
  pdf/                Delivery and wholesale PDF generation
  settings/           Application settings
  store/              Product state management
  types/              TypeScript type definitions
  utils/              Shared utilities
```

## Getting Started

### Requirements

- Node.js 18 or newer
- npm
- Windows to build the Windows installer

### Install and Run

```bash
git clone <repository-url>
cd food-delivery-desktop-manager
npm install
npm run dev
```

The development command starts the Vite server and Electron app. If PowerShell blocks the `npm` script, run `npm install` and `npm.cmd run dev` instead.

### Build and Package

Build the frontend:

```bash
npm run build
```

Create the Windows installer:

```bash
npm run package
```

Packaged files are written to `release/`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite and Electron for development |
| `npm run dev:vite` | Start only the Vite development server |
| `npm run dev:electron` | Start Electron after the Vite server is ready |
| `npm run build` | Build the production frontend |
| `npm run package` | Build and package the Windows installer |

## Local Data and Backups

Products are stored as category-specific JSON files in Electron's operating-system-specific `userData/products` directory. Application settings and delivery history are stored in the renderer's browser `localStorage`. Backups are written under the user's Documents folder and can include customer information; store them accordingly.

Product synchronization fetches listings from the public HTTPS URL entered by the user. The app does not upload local product data, customer details, or delivery history as part of that sync. Local application data is not encrypted by this storage design.

## `.gitignore` and Sensitive Files

The repository's `.gitignore` excludes dependencies, build and packaging output, logs, common editor and operating-system files, and files matching `*.local`. Product data and backups are normally stored outside the repository. The ignore rules do not cover every possible business-data file and do not currently exclude `.env` files. Do not put customer data, backups, credentials, or other sensitive local files in the repository; review `git status` before committing.

## License

This project is presented as a portfolio showcase. No separate license is included, so reuse is not automatically granted.