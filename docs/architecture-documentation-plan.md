# Plan: Vue.js Architecture Documentation (`docs/vue-architecture.md`)

This document outlines the plan for creating comprehensive architecture documentation for the modernized Vue.js version of the Lithium Recycling Dashboard project.

## 1. Introduction

*   Brief overview of the project's purpose (Lithium Recycling Dashboard).
*   Goal of the modernization (moving to Vue 3 + Vite).
*   Purpose of this document (guide for developers).

## 2. Core Technologies

*   List the main technologies used (Vite, Vue 3 Composition API, Vue Router, Pinia, Firebase, Chart.js, Leaflet).
*   Briefly mention why each was chosen (if known, otherwise state their role).

## 3. Project Structure

*   Explain the layout of the `src/` directory (`main.js`, `components/`, `views/`, `services/`, `stores/`, `assets/` if applicable).
*   Describe the purpose of each main directory.
*   Mention the role of `public/` and `index.html`.
*   Clarify the status of legacy directories/files if necessary (e.g., the `.html` files in `src/views/`).

## 4. Architecture Deep Dive

*   **Views (`src/views/`):**
    *   Explain that these are the top-level page components.
    *   How they are linked via Vue Router.
*   **Components (`src/components/`):**
    *   Purpose: Reusable UI elements.
    *   Naming conventions (e.g., PascalCase).
    *   Recommendation for creating new components (keep them focused, props down, events up).
*   **Routing (`src/main.js` & Vue Router):**
    *   How routes are defined in `main.js`.
    *   Use of `createWebHistory`.
    *   Passing props via routes (e.g., `:id`).
    *   Brief mention of navigation guards if used beyond logging.
*   **State Management:**
    *   **Global State (`provide`/`inject` in `main.js`):** Explain how basic global state (auth, theme) is managed using Vue's Composition API. Mention `readonly` for safety.
    *   **Feature State (Pinia in `src/stores/`):** Explain that Pinia stores are used for managing more complex state related to specific features (facilities, documents). Describe the typical structure of a Pinia store (state, getters, actions).
*   **Services (`src/services/`):**
    *   Purpose: Encapsulating external interactions (API calls, Firebase, browser APIs).
    *   Examples: `authService.js`, `facilities.js`.
    *   How views/components interact with services.
*   **Firebase Integration:**
    *   How Firebase is configured (`src/firebase-config.js`).
    *   Which services are used (Auth, Firestore likely).
    *   How services interact with Firebase (e.g., `authService.js` uses Firebase Auth).

## 5. Diagrams (Mermaid Syntax)

*   **Component Hierarchy Example:** A simple diagram showing a View composed of several Components.
*   **Data Flow Diagram:** A diagram illustrating how data flows from a Service -> Pinia Store -> View -> Component, and how user actions flow back up.
*   **Request Flow Diagram:** Illustrating a typical request lifecycle.

## 6. Best Practices & Contributing

*   **Adding a New Feature (e.g., a new page/view):**
    *   Create new View component in `src/views/`.
    *   Add route in `src/main.js`.
    *   Create necessary child Components in `src/components/`.
    *   If needed, create a new Service in `src/services/`.
    *   If complex state is involved, create a new Pinia Store in `src/stores/`.
    *   Write unit tests (mentioning Vitest).
*   **Coding Style:** Refer to any established linting rules (e.g., ESLint, Prettier) if configured, otherwise suggest standard Vue practices.
*   **State Management:** When to use Pinia vs. local component state vs. `provide`/`inject`.
*   **API Interaction:** Always go through the Services layer.

## 7. Build & Deployment

*   Briefly mention the Vite commands (`dev`, `build`, `preview`).
*   Reference `vercel.json` and `firebase.json` for deployment configurations.