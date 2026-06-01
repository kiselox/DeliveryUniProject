# POLONEZ Delivery 🚗💨 — Real-Time Express Delivery Service Simulator (Poznań)

![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)

**POLONEZ Delivery** is an interactive, real-time express food delivery simulator adapted to the geographic map of **Poznań, Poland**. 

The project solves a complex, real-world logistics and coordination puzzle by establishing real-time communication between customers, restaurants, and couriers via a central administrative support dashboard. It integrates an advanced geographical and mathematical model: automated price calculation based on geolocation, dynamic pricing based on active weather conditions and surging demand multipliers, and real-time courier GPS tracking using Leaflet maps with visual route mapping.

The user interface is designed using **Glassmorphism aesthetics (frosted glass effects)** with a sleek, dark-purple neon color scheme, creating a premium and immersive visual experience.

---

## 🗺️ System Architecture & Workflow

The entire lifecycle of an order and the interaction between the system's modules are illustrated in the diagram below:

```mermaid
graph TD
    %% Node Styling
    classDef client fill:#ff99c8,stroke:#333,stroke-width:2px;
    classDef support fill:#dec0f1,stroke:#333,stroke-width:2px;
    classDef courier fill:#b9fbc0,stroke:#333,stroke-width:2px;
    classDef db fill:#a0c4ff,stroke:#333,stroke-width:2px;

    subgraph ClientRole [👨‍💻 Customer Module]
        A[Poznań Restaurant Grid] -->|Dish Selection & Cart| B[Order Details Form]
        B -->|Coordinate Selection & Location Sharing| C[Create Order]
    end

    subgraph ServerLayer [⚙️ Backend & Database]
        C -->|POST /orders| D[(Dual Database: Postgres/PostGIS vs. JSON db.json)]
        D -->|Haversine / PostGIS Calculations & Geocoding| E[Order Status: Ready for Pickup]
    end

    subgraph SupportRole [🎧 Support & Dispatch Console]
        E -->|React Query Polling 3s| F[Dispatch Monitor Admin.jsx]
        F -->|Weather & Demand Adjustment| G[Mutation /settings and /orders/:id]
        G -->|Update Rates & Surges| D
    end

    subgraph CourierRole [🚴 Courier Console]
        E -->|Leaflet Map Visualization| H[Courier Console Courier.jsx]
        H -->|Accept Order| I(Status: Accepted)
        I -->|Travel to Restaurant| J(Status: Picked Up)
        J -->|Deliver to Customer| K(Status: Delivering)
        K -->|Enter Verification PIN| L(Status: Delivered)
        L -->|Credit Courier Balance| D
    end

    %% Apply Styles
    class A,B,C client;
    class D,E db;
    class F,G support;
    class H,I,J,K,L courier;
```

---

## 🚀 1. Quick Start

Follow these steps to set up and run the project locally.

### Prerequisites
* **Node.js**: Version `18.x` or higher.
* **npm**: Version `9.x` or higher.
* *(Optional)*: A running **PostgreSQL** database with the **PostGIS** extension enabled for production-grade spatial querying.

### Installation
Clone the repository and install all dependencies in the root directory:
```bash
npm install
```

### Environment Setup
Create a `.env` file in the root directory of the project with the following configuration:
```env
PORT=3001
# Add your PostgreSQL connection string to activate PostGIS-driven production mode
# DATABASE_URL=postgresql://username:password@localhost:5432/polonez_delivery
```

### Running the Application
The application consists of a React/Vite frontend and an Express backend, designed to run concurrently.

1. **Start the Backend Server** (REST API, running by default on port `3001`):
   ```bash
   npm run server
   ```
2. **Start the Vite Dev Server** (Frontend, running by default on port `5173`):
   ```bash
   npm run dev
   ```

Once both servers are running successfully, navigate to: **[http://localhost:5173/](http://localhost:5173/)**

---

## 💎 2. Core Modules & Dual-DB Architecture

All states, lists, and positions are synchronized across modules every **3 seconds** using **React Query Polling**, providing an immersive, lag-free simulator experience.

### ⚙️ Dual-Mode Database Engine (Seamless Adaptability)
The backend dynamically adapts its data storage, geocoding, and routing calculations based on the environment configuration:

| Metric / Feature | 🏢 Production Mode (PostgreSQL + PostGIS) | 💾 Local Mode (JSON Fallback) |
| :--- | :--- | :--- |
| **Activation Rule** | Valid `DATABASE_URL` present in the `.env` file | Absence of `DATABASE_URL` (Default fallback) |
| **Storage Engine** | PostgreSQL Relational Database with `postgis` | Local `db.json` file with in-memory caching |
| **Distance Calculation** | Highly accurate SQL-level spatial queries via `ST_DistanceSphere` | Mathematical **Haversine formula** calculated in JavaScript |
| **Geo-Coordinate Type** | Standardized Spatial Geography Point: `GEOGRAPHY(Point, 4326)` | Serialized JSON coordinate objects: `{ lat, lng }` |
| **Data Integrity** | ACID transactions, automated migrations on startup | Synchronous write-backs to `db.json` on each update |

---

### 🛠️ Role-Specific Features

#### 1. ⚙️ Robust Backend & Infrastructure (`server.js`)
* **Poznań Street Geocoder**: A custom server-side text normalizer for Polish addresses (e.g., `ł -> l`, `ó -> o`, `ę -> e`) paired with a coordinate dictionary of famous Poznań streets and landmarks (Półwiejska, Garbary, Jeżyce, CDV, Lake Malta, etc.) returning absolute GPS coordinates.
* **Auto-Migrations**: When connected to PostgreSQL, the server automatically checks, updates, and creates the spatial tables (`orders`, `couriers`, `vendors`, `settings`), applying PostGIS data types out of the box.
* **REST API Layer**: Complete set of endpoints managing courier configurations, vendors, menu item sets, settings, and orders.

---

#### 2. 👨‍💻 Premium Customer Interface (`src/pages/Customer/`)
* **Poznań Venues Hub (`CustomerMain.jsx`)**: An elegant grid showcasing famous Poznań dining venues (KFC, McDonald's, Pasibus, etc.) with real-time text-filtering and custom hover animations.
* **Reactive Checkout Shopping Cart (`CustomerMenu.jsx`)**: Responsive cart overlay calculating item quantities, subtotals, and real-time delivery fees as items are added or removed.
* **Geographical Order Form**:
  * An interactive Leaflet map allows users to visually drag and drop their location pin.
  * Single-tap HTML5 Geolocation sharing.
  * Comprehensive delivery details form: *Street Name*, *House Number*, *Apartment*, *Floor*, *Phone Number*, and *Courier Notes* with secure default fallbacks preventing JS runtime errors.

---

#### 3. 🚴 Courier Navigation & Console (`src/pages/Courier.jsx`)
* **Multi-Transport Support**: Support for three distinct courier transport tiers, each dynamically calculating travel rates and earnings:
  * 🚲 **Bicycle** — Standard per-kilometer base rate.
  * 🛵 **Scooter** — Mid-tier base rate optimized for swift traffic navigation.
  * 🚗 **Car** — Premium base rate suited for long-distance deliveries.
* **Interactive Mapping with Route Tracing**: Real-time Leaflet mapping showing the courier's GPS location, the restaurant location, and the customer's delivery destination. Connects the points with a distinct, styled vector routing polyline.
* **Real-Time Earnings Calculator**: Displays calculated order payout live on screen based on the dynamic formula:
  $$\text{Payout} = \max\left(5.0,\, (\text{Distance} \times \text{Transport Rate} + \text{Weather Surcharge}) \times \text{Demand Multiplier}\right)$$
* **External Navigation Redirect**: Integrated button to quickly push current destination coordinates to **Google Maps** for active voice guidance on external navigation apps.
* **Secure Delivery Pin Verification**: Safe-close protocol requiring the courier to input the last 4 characters of the unique order ID to confirm successful handoff.

---

#### 4. 🎧 Support & Dispatch Console (`src/pages/Admin.jsx`)
* **Optimized Dispatch Interface**: The main queue list is stripped of redundant metrics (like raw distance or estimated arrival times), giving dispatchers a spacious, easy-to-read workspace.
* **Strict Chronological Queue**: Orders are arranged based on checkout time, displaying the newest orders at the very top.
* **Chronological Time Badges**: Adds a dedicated `Time` column showing exact checkout times (e.g., `🕒 14:35`).
* **Precise Status Colors**: Active transit orders are displayed with a clear, color-coded status badge: `🔵 In transit to customer`.
* **Glassmorphism Detail Drawer (`👁️ Details`)**: Open an elegant overlay displaying full order summaries: client contact details, floor/apartment details, courier notes, and exact payout breakdown.
* **Global Demand Regulator (`⚡ Demand`)**: Command panel containing a fluid demand multiplier slider (ranging from `1.0x` to `5.0x`) and preset quick-buttons that recalculate all active courier payouts instantly.
* **Weather Simulator Dashboard**: Dynamic controls representing weather conditions (Clear `+0 PLN`, Rainy `+5 PLN`, Snowy `+10 PLN`) that instantly write surcharge mutations back to the server.

---

## 🗺️ 3. Folder Directory & Code Layout

The project follows a modular React + Express codebase architecture:

```
├── server.js                 # Express backend server (APIs, Geocoder, Dual DB, Haversine)
├── db.json                   # Local Database fallback (JSON storage)
├── package.json              # Project dependencies, scripts, and runtime commands
├── ai-instructions.md        # [GUIDE] Strict code rules and architectural guide for AI agents
├── src/
│   ├── main.jsx              # React mounting point
│   ├── App.jsx               # Global router, role-based navigation routes, layout styling
│   ├── index.css             # Main stylesheet (Glassmorphic variables, Leaflet overrides, themes)
│   │
│   ├── components/           # Universal UI components (Presenter-only)
│   │   ├── Header.jsx        # Navigation bar with address and search elements
│   │   ├── RestaurantCard.jsx# Hover-animated cards in the restaurant directory
│   │   └── MenuItemCard.jsx  # Individual menu items with quantity pickers
│   │
│   ├── pages/                # Page-level containers (State management, maps, logic hooks)
│   │   ├── Customer/         # Customer Module
│   │   │   ├── CustomerMain.jsx # Poznań Restaurant Grid selector
│   │   │   └── CustomerMenu.jsx # Cart, checkout map interface, and address forms
│   │   │
│   │   ├── Courier.jsx       # Courier dashboard with interactive maps and route tracing
│   │   └── Admin.jsx         # Support panel with climate systems, surge rates, and order charts
│   │
│   └── services/             # Dynamic API service adapters (Axios wrapper)
│       ├── api.js            # Axios client initialization (pointing to port 3001)
│       ├── customer-services.js # Account profile and authentication logic
│       ├── orders-services.js   # Order creation, mutations, and status changes
│       └── vendors-services.js  # Menu and Restaurant fetching services
```

> [!NOTE]
> There is a specialized guide `ai-instructions.md` located in the project's root. It highlights **8 strict coding rules** (including the total restriction of TailwindCSS, React Query v5 guidelines, and Leaflet layer cleanup). Developers and AI coding partners should read this guide before making modifications!

---

## 🚀 4. Technical Roadmap & Next Steps

This roadmap is designed for developer sprints or collaborative AI coding agents. You can hand off these tasks directly to your AI partner to immediately start implementing them.

---

### 📋 Task 1: Real-World Google Maps API Integration
* **🎯 Goal**: Replace the current Leaflet configuration with Google Maps API.
* **💡 Motivation**: Leaflet maps currently draw routes in direct vector lines ("as the crow flies"). Replacing them with Google Maps Directions Service will enable calculating actual routes along Poznań's streets, taking travel mode (bicycle, driving, walking) into account and computing real-time durations adjusted for traffic.
* **🛠️ Implementation Steps**:
  1. Install the official Google Maps loader: `npm install @googlemaps/js-api-loader`.
  2. Configure a Google Cloud Console API key and register it in `.env` as `VITE_GOOGLE_MAPS_API_KEY`.
  3. Refactor `Courier.jsx` and `CustomerMenu.jsx` to mount Google Maps instead of Leaflet.
  4. Integrate `google.maps.DirectionsService` and `google.maps.DirectionsRenderer` to map real routes from `[Courier] ➔ [Restaurant] ➔ [Customer]`.
  5. Apply a dark/neon custom JSON styling theme to the Google Map to match the current purple Glassmorphism aesthetics.
* **🔬 Verification**:
  - Open the Courier Console; verify maps load cleanly with zero styling fragments.
  - Accept an order and confirm that the path polyline curves around Poznań streets and does not clip straight through buildings.

---

### 📋 Task 2: JWT Authentication and Role-Based Route Guards
* **🎯 Goal**: Protect the Courier (`/courier`) and Support Admin (`/admin`) routes behind credential logins and JWT tokens.
* **💡 Motivation**: Any user can currently access dispatch controls or another courier's route by entering the URL, which is a major security flaw.
* **🛠️ Implementation Steps**:
  1. Install security packages on the backend: `npm install jsonwebtoken bcrypt`.
  2. Add a `users` table schema (in PostgreSQL) or section (in `db.json`) containing `id, username, password_hash, role (customer/courier/admin)`.
  3. Create backend authentication routes `/api/auth/register` (hashing passwords with `bcrypt`) and `/api/auth/login` (returning signed JWT tokens).
  4. Write an Express validation middleware `authenticateToken` to secure mutating endpoints (e.g. settings updates, order status patches).
  5. Create a `ProtectedRoute.jsx` wrapper component on the frontend that reads token claims and checks them against required route roles in React context, routing unauthorized attempts back to `/login`.
* **🔬 Verification**:
  - Attempt to access `/admin` while unauthenticated. The app should immediately redirect you to the `/login` screen.
  - Log in with valid credentials, verify that the token is stored correctly in cookie/localStorage, and confirm that access is successfully granted.

---

### 📋 Task 3: Migrate React Query Polling to WebSockets (Socket.io)
* **🎯 Goal**: Implement instant data synchronization and real-time courier tracking without regular 3-second polling cycles.
* **💡 Motivation**: Periodic HTTP polling cycles generate a high volume of redundant server requests. Migrating to WebSockets allows the backend to instantly push updates only when changes occur.
* **🛠️ Implementation Steps**:
  1. Install socket modules: `npm install socket.io` (backend) and `npm install socket.io-client` (frontend).
  2. Bind the Express server inside an HTTP server wrapper in `server.js` and initialize `socket.io`.
  3. On the backend, trigger `io.emit('order_updated', order)` whenever orders are created (`POST /orders`) or updated (`PATCH /orders/:id`).
  4. Emit `courier_location` socket events when couriers update their GPS position, allowing dispatchers to watch couriers move smoothly across the screen.
  5. Set up WebSocket event listeners in the React frontend, invalidating relevant React Query keys or updating local page states immediately upon receiving socket alerts.
* **🔬 Verification**:
  - Open two separate browser tabs: the Customer page and the Support dashboard.
  - Create a new order as a customer and verify that it instantly appears in the Support queue with zero latency.

---

### 📋 Task 4: Completed Order History and Courier Earnings Wallet
* **🎯 Goal**: Equip couriers with a dedicated history screen documenting completed tasks and full earnings breakdowns.
* **💡 Motivation**: Couriers need full transparency into their historical shifts—visualizing their base pay, weather bonuses, active demand rates, and total withdrawable balance.
* **🛠️ Implementation Steps**:
  1. Extend the backend `orders` schemas to store historical financials when an order completes: `payout_base`, `payout_surcharge`, `payout_coefficient`, and `payout_total`.
  2. Implement an Express endpoint `GET /couriers/:id/history` filtering for completed orders (`Delivered` status) under the specific courier's ID.
  3. Create a visually striking "My Earnings" Glassmorphism card/tab in `Courier.jsx`.
  4. Render aggregated metrics: total lifetime earnings and number of successfully completed deliveries.
  5. Create an interactive log tracking completed deliveries showing dates, dropoff coordinates, travel distance, and full price calculation breakdowns.
* **🔬 Verification**:
  - Fulfill an order in the Courier page (entering the 4-digit verification code).
  - Open the "My Earnings" panel, verify that the total balance increases by the exact calculated payout, and confirm that the delivery appears in the log list with accurate breakdown metrics.
