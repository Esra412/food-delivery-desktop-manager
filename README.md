# Food Business Manager

A desktop application for small food businesses to manage product information, prepare deliveries, and generate customer-ready PDFs and price lists. Product, package, pricing, customer, and delivery details are managed locally in one application.

The application runs as an Electron desktop app with a React and Vite frontend. The interface is available in Finnish, English and Swedish. An optional product sync can read publicly available product listings from a store URL configured by the user.

## Main Features

- Product management with names, categories, package sizes, wholesale prices and recommended prices.
- Finnish, English and Swedish product names/categories for multilingual PDF output.
- Product selection from the home view.
- Delivery list creation with customer details, selected products, quantities and totals.
- Wholesale price list PDF generation for selected products.
- PDF saving and opening through Electron.
- Delivery history with search, date filters, sorting and PDF regeneration.
- Application settings for company information, PDF appearance, language, product source URL and backup/restore actions.
- Local product storage in category-specific JSON files under Electron `userData/products`.
- Local delivery history and settings storage in browser `localStorage`.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Electron
- electron-builder
- Zustand
- jsPDF
- lucide-react
- react-router-dom

## Project Structure

```text
food-business-manager/
  electron/
    main.js              Electron main process, IPC handlers and PDF/file operations
    preload.js           Safe API bridge exposed to the renderer
    database.js          Product JSON storage logic
    run-electron.js      Development launcher
  src/
    App.tsx              Application routes
    main.tsx             React entry point
    index.css            Global styles and Tailwind setup
    assets/              Application assets
    components/          Shared UI components
    i18n/                Translation dictionaries and helpers
    pages/               Main application pages
    pdf/                 PDF generation logic
    settings/            Application settings handling
    store/               Zustand product store
    theme/               Theme tokens
    types/               Shared TypeScript types
    utils/               Product language helpers
  public/
    favicon.svg
  TODO.md                Open tasks and ownership list
  vaatimusmaarittely.md  Finnish requirements specification
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Windows is required for creating the Windows installer

Install dependencies:

```bash
npm install
```

Start the development app:

```bash
npm run dev
```

This starts the Vite development server on `127.0.0.1:5174` and launches Electron after the server is ready.

On Windows PowerShell, use `npm.cmd` instead of `npm` if the execution policy blocks PowerShell scripts:

```powershell
npm.cmd run dev
```

Build the renderer:

```bash
npm run build
```

Create a Windows installer package:

```bash
npm run package
```

The installer output is written to `release/`. This folder is generated output and should not be committed.

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and Electron in development mode |
| `npm run dev:vite` | Start only the Vite development server |
| `npm run dev:electron` | Start Electron against the development server |
| `npm run build` | Build the renderer for production |
| `npm run package` | Build and package the Windows installer |

## Data Storage

The application uses two local storage layers. Products are stored by the Electron main process in the operating system user data folder:

```text
<Electron userData>/products/
```

Each product category has its own `.json` file. Product changes travel from the React renderer through the safe `window.electronAPI.products` bridge in `electron/preload.js` to the Electron main process and `electron/database.js`.

The renderer stores delivery history and application settings in browser `localStorage`. Existing installations retain their current storage keys for backwards compatibility.

The Settings page can export settings, create a complete JSON backup and restore products, settings and history. Automatic backups are written under the user's Documents folder.

## Application Pages

- **Home**: Search, filter and select products, refresh products from a configured public HTTPS source, and start a delivery list or price list.
- **Products**: Add, edit and delete products, manage categories and maintain multilingual product data.
- **Delivery**: Enter customer information, quantities and delivery dates, then generate a delivery-list PDF.
- **Wholesale**: Preview selected products grouped by category and generate a wholesale price-list PDF.
- **History**: Search, filter and sort previous delivery documents, then reopen or regenerate a PDF.
- **Settings**: Configure company information, PDF appearance, language, local storage and backups.

## Important Workflows

1. Add or edit products on the Products page.
2. Select products on the Home page.
3. Create either a delivery list or wholesale price list from the selected products.
4. Fill in delivery details and quantities when creating a delivery list.
5. Generate a PDF.
6. Review previous documents from the History page.
7. Use Settings for company details, language, PDF options and backup/restore.

## Testing Checklist

Before packaging a release, run `npm run build` and manually check the main workflows in Electron:

1. Add a product with Finnish, English and Swedish names.
2. Edit the product and verify that the category and package size are preserved.
3. Select products on Home and create a delivery list with quantities.
4. Generate a delivery PDF and verify customer data, totals, dates and language.
5. Generate a wholesale price list and verify category grouping and prices.
6. Open History, search by customer and regenerate an earlier PDF.
7. Export settings, create a backup, reset only in a test environment, and restore the backup.
8. Repeat PDF generation in browser fallback mode when changing PDF functionality.

The project does not currently contain an automated test suite, so the checklist is the primary regression check for the current release. Product sync requires a public HTTPS product-listing URL configured under Settings; no external request is made until the user starts a sync.

## Security and Data Boundaries

- The renderer accesses Electron functionality only through the preload bridge.
- Product file operations are handled in the Electron main process.
- The application currently uses local storage and local files; it does not send ordinary product or customer data to a remote backend.
- Product sync reads public product listing data from the HTTPS URL configured by the user. It does not upload local products, customer details or delivery history.
- Backup JSON files may contain customer information and should be stored securely.

## Development Notes

- Keep feature work aligned with `TODO.md` and `vaatimusmaarittely.md`.
- Do not store generated files such as `dist/` or `release/` in source control.
- Product storage is JSON-based. Do not reintroduce SQLite unless the storage architecture is intentionally redesigned.
- PDF features should be tested in both Electron and browser fallback paths when changed.
- UI text should gradually be moved to the i18n dictionaries in `src/i18n`.

## Known Pending Areas

- VAT handling needs configurable, product-specific tax rates.
- Delivery lists need a separate store name field.
- Delivery PDF creation controls should remain accessible while scrolling.
- Wholesale price lists should not be saved to history if that workflow is removed.
- History should show quantities clearly.
- Restore actions need a confirmation dialog.
- Integration planning is needed for the delivery list and invoicing software.

## Target Schedule

- Final feature version by the end of September.
- Testing and fixes during October.

See `TODO.md` for task ownership and `vaatimusmaarittely.md` for the detailed Finnish requirements.
