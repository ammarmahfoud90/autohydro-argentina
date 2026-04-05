import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const STORAGE_KEY = 'autohydro-onboarding-done';

export function useOnboarding() {
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) return;

    const timer = setTimeout(() => {
      const driverObj = driver({
        animate: true,
        overlayOpacity: 0.75,
        stagePadding: 10,
        allowClose: true,
        showProgress: true,
        doneBtnText: 'Empezar →',
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        onDestroyed: () => {
          localStorage.setItem(STORAGE_KEY, 'true');
        },
        steps: [
          {
            element: '[data-tour="hero-title"]',
            popover: {
              title: 'Bienvenido a AutoHydro Argentina',
              description:
                'Calculá caudales de diseño con datos IDF verificados de 18 localidades en 11 provincias argentinas. Todos los datos provienen de fuentes oficiales.',
              side: 'bottom',
            },
          },
          {
            element: '[data-tour="iniciar-calculo"]',
            popover: {
              title: 'Calculadora hidrológica',
              description:
                'Calculá caudales de diseño paso a paso: seleccioná tu localidad, ingresá los parámetros de la cuenca y obtené el caudal de diseño con trazabilidad completa.',
              side: 'bottom',
            },
          },
          {
            element: '[data-tour="mapa-localidades"]',
            popover: {
              title: '18 localidades verificadas',
              description:
                'Hacé clic en cualquier pin para ver los datos IDF disponibles. Verde = serie larga (>30 años), amarillo = serie media, naranja = serie corta.',
              side: 'top',
            },
          },
          {
            element: '[data-tour="nav-calculadoras"]',
            popover: {
              title: 'Modo Proyecto — diseño integral',
              description:
                '¿Tenés un proyecto completo? El Modo Proyecto encadena IDF → cuenca → hietograma → hidrograma → canal → informe en un solo flujo guiado con memoria de cálculo consolidada.',
              side: 'bottom',
            },
          },
          {
            element: '[data-tour="nav-fuentes"]',
            popover: {
              title: 'Datos 100% verificados',
              description:
                'Cada dato IDF tiene su fuente oficial citada: resoluciones provinciales, publicaciones del INA, tesis doctorales. Cero datos fabricados.',
              side: 'bottom',
            },
          },
        ],
      });

      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
