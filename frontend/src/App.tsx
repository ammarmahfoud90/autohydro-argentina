import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
// Home is eagerly loaded — it's the entry point, don't flash a skeleton.
import { Home } from './pages/Home';

// Route-level code splitting: one chunk per page.
const Calculator = lazy(() =>
  import('./pages/Calculator').then((m) => ({ default: m.Calculator })),
);
const About = lazy(() =>
  import('./pages/About').then((m) => ({ default: m.About })),
);
const Sources = lazy(() =>
  import('./pages/Sources').then((m) => ({ default: m.Sources })),
);
const Manning = lazy(() =>
  import('./pages/Manning').then((m) => ({ default: m.Manning })),
);
const Culvert = lazy(() =>
  import('./pages/Culvert').then((m) => ({ default: m.Culvert })),
);
const Hyetograph = lazy(() =>
  import('./pages/Hyetograph').then((m) => ({ default: m.Hyetograph })),
);
const NotFound = lazy(() =>
  import('./pages/NotFound').then((m) => ({ default: m.NotFound })),
);
const History = lazy(() =>
  import('./pages/History').then((m) => ({ default: m.History })),
);
const Proyecto = lazy(() =>
  import('./pages/Proyecto').then((m) => ({ default: m.Proyecto })),
);
const FrequencyAnalysis = lazy(() =>
  import('./pages/FrequencyAnalysis').then((m) => ({ default: m.FrequencyAnalysis })),
);
const FloodRouting = lazy(() =>
  import('./pages/FloodRouting').then((m) => ({ default: m.FloodRouting })),
);
const PMDEstimator = lazy(() =>
  import('./pages/PMDEstimator').then((m) => ({ default: m.PMDEstimator })),
);

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
      <div className="animate-pulse text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-gray-500 text-sm">Cargando…</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/proyecto" element={<Proyecto />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/calculadora/manning" element={<Manning />} />
              <Route path="/manning" element={<Manning />} />
              <Route path="/calculadora/alcantarilla" element={<Culvert />} />
              <Route path="/alcantarilla" element={<Culvert />} />
              <Route path="/culverts" element={<Navigate to="/calculadora/alcantarilla" replace />} />
              <Route path="/calculadora/hietograma" element={<Hyetograph />} />
              <Route path="/calculadora/frecuencia" element={<FrequencyAnalysis />} />
              <Route path="/calculadora/transito" element={<FloodRouting />} />
              <Route path="/calculadora/pmd" element={<PMDEstimator />} />
              <Route path="/hyetograph" element={<Navigate to="/calculadora/hietograma" replace />} />
              <Route path="/hietograma" element={<Navigate to="/calculadora/hietograma" replace />} />
              <Route path="/calculadora" element={<Navigate to="/calculator" replace />} />
              <Route path="/calculadora/alcantarillas" element={<Navigate to="/calculadora/alcantarilla" replace />} />
              <Route path="/fuentes" element={<Navigate to="/sources" replace />} />
              <Route path="/inicio" element={<Navigate to="/" replace />} />
              <Route path="/acerca" element={<Navigate to="/about" replace />} />
              <Route path="/acerca-de" element={<Navigate to="/about" replace />} />
              <Route path="/historial" element={<History />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
