# Frontend guide

Package: artifacts/gcuf-web (@workspace/gcuf-web). Stack: React 19, TypeScript, Vite 7, wouter, TanStack Query and Tailwind CSS 4.

## Entry and app shell

src/main.tsx imports global CSS, finds the #root element and renders App.

src/App.tsx creates a QueryClient (one retry, 30-second stale time), wraps ThemeProvider, AuthProvider, QueryClientProvider and TooltipProvider, configures wouter using Vite BASE_URL, then selects public landing/login or authenticated staff UI based on useAuth(). It displays Sidebar and staff pages. Department and user routes are conditionally visible to admins; backend authorization remains mandatory.

## Routes

| Path | Page |
|---|---|
| / | Dashboard when authenticated; landing when signed out |
| /login | Login when signed out; dashboard when signed in |
| /courses | Courses |
| /courses/:id | Course detail |
| /students | Students |
| /analytics | Analytics |
| /toppers | Toppers/merit |
| /departments | Admin-only departments |
| /users | Admin-only staff users |
| fallback | Not found |

## Page responsibilities

- pages/landing.tsx: public portal and roll-number lookup.
- pages/login.tsx: staff login.
- pages/dashboard.tsx: staff overview.
- pages/courses.tsx and course-detail.tsx: course list and detailed results.
- pages/students.tsx: student management/search.
- pages/departments.tsx and users.tsx: admin management.
- pages/analytics.tsx and toppers.tsx: analytics and merit list.
- components/Sidebar.tsx: staff navigation.
- lib/use-auth: auth state.
- components/ui: reusable UI primitives.

Shared packages provide API hooks and Zod contracts. Radix primitives, lucide-react and Recharts support UI, icons and charts.

## Commands

    PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gcuf-web run dev
    pnpm --filter @workspace/gcuf-web run typecheck
    pnpm --filter @workspace/gcuf-web run build

Review vite.config.ts when changing the API proxy, base path or dev server behavior.
