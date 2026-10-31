/**
 * ============================================================================
 * File:        src/App.tsx
 * Purpose:     Application shell: providers, header/footer, and routing
 *              between the six pages.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial shell (Heritage at Risk v1.0)
 *   - 2026-10-31  Added the Lost America route (#/lost), lazy-loaded
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — fast load times:
 * The ArcGIS SDK is the heaviest part of the app. Pages that show a map are
 * loaded with React.lazy(), so the SDK is only downloaded when someone opens
 * the map or the State Explorer. The Home and Findings pages appear almost
 * instantly because they need only React and our own small modules.
 */
import { lazy, Suspense } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { AnalysisProvider } from "./context/AnalysisContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useHashRoute } from "./hooks/useHashRoute";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import AboutDataPage from "./pages/AboutDataPage";
import AboutProjectPage from "./pages/AboutProjectPage";

const MapPage = lazy(() => import("./pages/MapPage"));
const StateExplorerPage = lazy(() => import("./pages/StateExplorerPage"));
const LostAmericaPage = lazy(() => import("./pages/LostAmericaPage"));

/** Chooses the page component for the current route. */
function Router() {
  const { route, navigate } = useHashRoute();
  let page;
  switch (route.page) {
    case "lost":
      page = <LostAmericaPage />;
      break;
    case "map":
      page = <MapPage />;
      break;
    case "explore":
      page = <StateExplorerPage stateParam={route.params[0]} navigate={navigate} />;
      break;
    case "dashboard":
      page = <DashboardPage />;
      break;
    case "data":
      page = <AboutDataPage />;
      break;
    case "about":
      page = <AboutProjectPage />;
      break;
    case "":
      page = <HomePage />;
      break;
    default:
      page = (
        <div className="page">
          <h1>Page not found</h1>
          <p>
            There is no page at “#/{route.page}”. <a href="#/">Go to the home page</a>.
          </p>
        </div>
      );
  }
  return (
    <>
      <Header currentPage={route.page} />
      <main id="main" tabIndex={-1} className={`main main--${route.page || "home"}`}>
        <Suspense fallback={<p className="loading">Loading the map…</p>}>{page}</Suspense>
      </main>
      {route.page !== "map" && <Footer />}
    </>
  );
}

/** Root component. */
export default function App() {
  return (
    <ThemeProvider>
      <AnalysisProvider>
        <Router />
      </AnalysisProvider>
    </ThemeProvider>
  );
}
