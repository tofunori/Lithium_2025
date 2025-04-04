# Lithium Battery Recycling Dashboard

This interactive dashboard provides a comprehensive overview of lithium battery recycling facilities across North America. The dashboard includes an interactive map, detailed facility information, and data visualizations to help understand the current state of the industry.

## Features

- **Interactive Map**: Visualize the geographic distribution of recycling facilities
- **Facility Profiles**: Detailed pages for each facility with comprehensive information
- **Data Visualizations**: Charts showing capacity, technology distribution, and regional breakdown
- **Search & Filter**: Quickly find facilities by name, company, or status

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js) or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd lithium-recycling-dashboard
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Setup

1.  **Configure Environment Variables:** Follow the instructions in the [Environment Variables](#environment-variables) section below to set up your `.env` file with the necessary Firebase and API configurations.

### Running Locally (Development)

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
2.  Open your browser and navigate to the URL provided (usually `http://localhost:5173` or similar). The application will automatically reload when you make changes to the code.

### Building for Production

1.  **Create a production build:**
    ```bash
    npm run build
    # or
    yarn build
    ```
2.  This command compiles the application and outputs the static files to the `dist/` directory. These files are ready to be deployed to a static web host.

## Environment Variables

This project uses environment variables for configuration, particularly for Firebase and API endpoints. These are managed using `.env` files.

1.  **Create a `.env` file:** Copy the `.env.example` (or create one from scratch) to `.env` in the project root.
    ```
    cp .env.example .env
    ```
2.  **Fill in the variables:** Populate the `.env` file with your specific configuration details, especially for Firebase.

   *   `VITE_FIREBASE_API_KEY`: Your Firebase project's API Key.
   *   `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase project's Auth Domain.
   *   `VITE_FIREBASE_DATABASE_URL`: Your Firebase project's Database URL (if using Realtime Database).
   *   `VITE_FIREBASE_PROJECT_ID`: Your Firebase project's ID.
   *   `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase project's Storage Bucket.
   *   `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase project's Messaging Sender ID.
   *   `VITE_FIREBASE_APP_ID`: Your Firebase project's App ID.
   *   `VITE_FIREBASE_MEASUREMENT_ID`: Your Firebase project's Measurement ID (optional).
   *   `VITE_API_URL`: The base URL for the backend API (e.g., `http://localhost:3000/api` for development).

3.  **Environment-Specific Files:**
    *   `.env.development`: Variables specifically for the development environment (overrides `.env`).
    *   `.env.production`: Variables specifically for the production environment (overrides `.env`). **Do not commit sensitive production keys.** Set these in your deployment environment.

**Important:** Add `.env`, `.env.*.local`, and potentially `.env.local` to your `.gitignore` file to avoid committing sensitive credentials.


## Directory Structure

```
lithium_dashboard/
├── index.html                 # Main dashboard page
├── css/
│   └── styles.css             # Dashboard and facility page styles
├── js/
│   ├── dashboard.js           # Dashboard functionality
│   └── facilityData.js        # Facility data and helper functions
├── facilities/                # Individual facility pages
│   ├── licycle-arizona.html   # Example facility page
│   └── ...
├── images/                    # Images folder
│   ├── facilities/            # Facility images
│   └── logos/                 # Company logos
└── generate_facility_pages.html # Tool to generate facility pages
```

## Customizing the Dashboard

### Adding New Facilities

To add new facilities to the dashboard, edit the `facilityData.js` file in the `js/` folder. Add a new feature object to the `features` array following the existing structure.

### Modifying Styles

The dashboard's appearance can be customized by editing the `styles.css` file in the `css/` folder.

## Deploying the Dashboard

To deploy the dashboard to a web server, simply copy all the files to your web hosting. Make sure to maintain the directory structure.

## Data Sources

This dashboard is based on research into lithium battery recycling facilities in North America, with data compiled from:
- Company websites and press releases
- Industry reports and news articles
- Government documents and databases
- Academic research papers

## License

This dashboard is provided for educational and research purposes only.
