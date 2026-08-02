# Cloudflare Pages Deployment & Domain Architecture

This document outlines the exact procedure to take the WayOnTop monorepo live using Cloudflare Pages. 

Because we use Vite to build Single Page Applications (SPAs), we do not need to manage servers. Cloudflare Pages will host our static assets globally at the edge.

## 1. Domain Routing Architecture
The system is divided into two separate Cloudflare Projects, mapped to specific subdomains and paths:

### Project 1: The Consumer App
- **Domain:** `lalbagh.top`
- **What it hosts:** The main public AR navigation app, the sponsor pages, and the landing/help pages. Because it is a React SPA, React Router will handle the sub-paths internally.
- **Route Mapping:**
  - `lalbagh.top` ➔ **Consumer AR App** (The core navigation experience)
  - `lalbagh.top/sponsor` ➔ **Sponsor Portal** (Where users see sponsor deals or where sponsors can sign up)
  - `lalbagh.top/guide` *(Recommended over /what)* ➔ **Landing Page / Help Guide** (Explains what the app is and how to use it)

### Project 2: The Producer App
- **Domain:** `producer.lalbagh.top`
- **What it hosts:** The secure, internal admin tool for mapping the venue and managing gamification/sponsors.
- **Route Mapping:**
  - `producer.lalbagh.top/*` ➔ **Admin Dashboard**

---

## 2. How to Go Live (Step-by-Step)

### Step A: Deploy the Consumer App
1. Log into your Cloudflare Dashboard and navigate to **Workers & Pages** > **Pages** > **Connect to Git**.
2. Select your `hammaadworks/wayontop` GitHub repository.
3. Name the project: `wayontop-consumer`.
4. Configure the Build Settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build:consumer` *(or `npm run build --workspace=consumer`)*
   - **Build output directory:** `consumer/dist`
5. Click **Save and Deploy**.
6. Once deployed, go to the project's **Custom Domains** tab and add `lalbagh.top`.

### Step B: Deploy the Producer App
1. Go back to **Workers & Pages** and click **Connect to Git** again.
2. Select the *exact same* `wayontop` GitHub repository.
3. Name the project: `wayontop-producer`.
4. Configure the Build Settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build:producer` *(or `npm run build --workspace=producer`)*
   - **Build output directory:** `producer/dist`
5. Click **Save and Deploy**.
6. Once deployed, go to the project's **Custom Domains** tab and add `producer.lalbagh.top`.

---

## 3. Critical Production Requirements

### The `_redirects` File (SPA Routing)
Because both apps use React Router, if a user navigates directly to `lalbagh.top/sponsor` or refreshes the page, Cloudflare's server will look for a file named `sponsor.html` and return a 404 error. 

To fix this, we have a file named `_redirects` inside both `consumer/public/` and `producer/public/` containing this exact line:
```text
/* /index.html 200
```
**Never delete this file.** It tells Cloudflare to serve `index.html` for every path, allowing React Router to take over and display the correct page.

### HTTPS & Geolocation APIs
Cloudflare Pages automatically provisions free SSL/TLS certificates. This is critical because browser hardware APIs like `Geolocation` and `DeviceOrientationEvent` (which power the AR compass) will **only** work in production if the site is served over strict HTTPS. 

### Auto-Deployments
Since both projects are connected to the same GitHub repo, whenever you push new code to the `main` branch, Cloudflare will automatically trigger a build for **both** the Consumer and Producer apps simultaneously. The shared components in `packages/ui` will be freshly compiled into both apps on every push.
