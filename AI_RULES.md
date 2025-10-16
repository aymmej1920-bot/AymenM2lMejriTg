# AI Assistant Rules for Fleet Manager Pro Application

This document outlines the technical stack and specific library usage rules for developing the Fleet Manager Pro application. Adhering to these guidelines ensures consistency, maintainability, and leverages the strengths of our chosen technologies.

## Tech Stack Overview

*   **React**: A JavaScript library for building user interfaces.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality and developer experience.
*   **Vite**: A fast build tool that provides a lightning-fast development experience for modern web projects.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
*   **React Router**: A standard library for routing in React applications, enabling navigation between different views.
*   **shadcn/ui**: A collection of re-usable components built with Radix UI and Tailwind CSS, designed for easy customization and integration.
*   **Radix UI**: A low-level UI component library that provides unstyled, accessible components for building design systems.
*   **Lucide React**: A collection of beautiful and customizable open-source icons for React applications.

## Library Usage Rules

*   **UI Development**: All user interface components must be built using **React** and **TypeScript**.
*   **Styling**: **Tailwind CSS** must be used exclusively for all styling. Avoid writing custom CSS unless absolutely necessary and approved.
*   **Routing**: **React Router** should be used for all client-side navigation and route management. Routes should be defined in `src/App.tsx`.
*   **UI Components**: Prioritize using components from **shadcn/ui** for common UI elements (e.g., buttons, forms, dialogs, cards). If a specific component is not available or doesn't meet requirements, create a new, small, focused component.
*   **Icons**: All icons should be sourced from **Lucide React**.
*   **State Management**: For local component state, use React's `useState` and `useReducer` hooks. For global state, keep it simple and pass props down or use React Context if necessary, but avoid over-engineering.
*   **File Structure**:
    *   Pages should reside in `src/pages/`.
    *   Reusable components should reside in `src/components/`.
    *   Utility functions should reside in `src/utils/`.
    *   Type definitions should reside in `src/types/`.
*   **New Components**: Always create a new, separate file for every new component or hook, no matter how small. Do not add new components to existing files.
*   **Responsiveness**: All designs must be responsive and adapt well to different screen sizes using Tailwind CSS utilities.
*   **Error Handling**: Do not implement `try/catch` blocks for error handling unless specifically requested. Errors should be allowed to bubble up.
*   **Simplicity**: Prioritize simple and elegant solutions. Avoid over-engineering with complex patterns or unnecessary abstractions.