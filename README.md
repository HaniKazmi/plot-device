# Plot Device

Plot Device is a personal data dashboard and media consumption tracker built with React, TypeScript, and Vite. It pulls data directly from Google Sheets to display insights and visualizations for Video Games, TV Shows, Movies, and Holidays.

## Features

- **Google Sheets as a Backend**: Reads tracking data seamlessly from Google Sheets using the Google Sheets API.
- **Data Visualization**: Rich interactive charts and visualizations powered by [Highcharts](https://www.highcharts.com/).
- **Media Tracking**: Specialized views and dashboards for tracking:
  - Video Games
  - Shows
  - Movies
  - Holidays
- **Modern UI**: Clean, responsive, and customizable user interface built with Material-UI (MUI).
- **Client-Side Architecture**: Uses Google Auth and `gapi` to authenticate and fetch data directly from the browser.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Material-UI (MUI)
- **Charting**: Highcharts & `@highcharts/react`
- **Routing**: React Router DOM
- **Authentication & Data**: Google API Client (`gapi`)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Google Cloud Platform (GCP) project with the Google Sheets API enabled.
- OAuth 2.0 Client IDs configured for Google Auth.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/HaniKazmi/plot-device.git
   cd plot-device
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

You need to configure your Google API credentials by creating a `.env.local` file in the root of the project.

1. Create a file named `.env.local`:
   ```bash
   touch .env.local
   ```
2. Add your Google Client ID and API Key to the file:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=your_google_api_key_here
   ```

### Running Locally

Start the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will typically be available at `http://localhost:5173`.

### Building and Deployment

To build the project for production:

```bash
npm run build
```

To deploy to GitHub Pages (uses the `gh-pages` package):

```bash
npm run deploy
```

## Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the production bundles using Vite.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run format`: Formats code via Prettier.
- `npm run preview`: Previews the production build locally.
- `npm run analyze`: Analyzes bundle size with `source-map-explorer`.

## License

This project is intended for personal use.
