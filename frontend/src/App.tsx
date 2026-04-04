import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { Calculator } from './pages/Calculator';
import { About } from './pages/About';
import { Sources } from './pages/Sources';
import { Manning } from './pages/Manning';
import { Culvert } from './pages/Culvert';
import { Hyetograph } from './pages/Hyetograph';
import { NotFound } from './pages/NotFound';
import { History } from './pages/History';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/calculadora/manning" element={<Manning />} />
            <Route path="/manning" element={<Manning />} />
            <Route path="/calculadora/alcantarilla" element={<Culvert />} />
            <Route path="/alcantarilla" element={<Culvert />} />
            <Route path="/culverts" element={<Navigate to="/calculadora/alcantarilla" replace />} />
            <Route path="/calculadora/hietograma" element={<Hyetograph />} />
            <Route path="/hyetograph" element={<Navigate to="/calculadora/hietograma" replace />} />
            <Route path="/hietograma" element={<Navigate to="/calculadora/hietograma" replace />} />
            <Route path="/historial" element={<History />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
