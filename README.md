# JSON Translation Manager

A web application for managing and editing multi-language translation files with a user-friendly interface. 

## Features

- 🔄 Drag-and-drop or upload JSON translation files
- 📝 Side-by-side translation editing
- 🔍 Visual indicators for missing translations
- 🌐 Support for nested translation keys
- 💾 Auto-save to localStorage
- 📦 Export updated translations as JSON files

## How to use

The application works by uploading JSON files and then editing the translations. At the moment no validation is done on the JSON files, so it's up to the user to ensure the JSON is valid.

I recommend naming the JSON files with the appropriate language code, such as `it.json` for Italian, `de.json` for German, etc.

## Tech Stack

- Angular 17+
- PrimeNG UI Components
- TypeScript
- Signals for state management

Perfect for developers and content managers working with i18n/l10n in Angular applications. Streamlines the process of managing and updating translation files across multiple languages.