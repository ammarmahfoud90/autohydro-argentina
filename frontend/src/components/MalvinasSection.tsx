import { motion } from 'framer-motion';

export function MalvinasSection() {
  return (
    <section
      className="w-full py-12 px-4 sm:px-6"
      style={{ background: 'linear-gradient(180deg, #071224 0%, #0a1628 100%)' }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-8"
        >
          {/* Official Argentina map (Wikimedia Commons, public domain) */}
          <div className="shrink-0 flex items-center justify-center">
            <img
              src="/argentina_map.svg"
              alt="Mapa oficial bicontinental de la República Argentina"
              width={180}
              style={{
                filter:
                  'brightness(0) saturate(100%) invert(48%) sepia(60%) saturate(400%) hue-rotate(185deg) brightness(1.1)',
                maxWidth: '180px',
              }}
            />
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left">
            <p
              className="font-medium leading-snug mb-4"
              style={{ fontSize: '20px', color: '#ffffff' }}
            >
              Las Islas Malvinas, Georgias del Sur y Sandwich del Sur son y serán argentinas
            </p>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#94a3b8' }}>
              La soberanía argentina sobre las Islas Malvinas, Georgias del Sur y
              Sandwich del Sur y los espacios marítimos circundantes está consagrada
              en la Disposición Transitoria Primera de la Constitución Nacional Argentina.
            </p>
            {/* Argentine flag strip */}
            <div
              className="h-[3px] w-24 rounded-full overflow-hidden mx-auto sm:mx-0"
              style={{
                background: 'linear-gradient(to right, #74ACDF 33%, #ffffff 33% 66%, #74ACDF 66%)',
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
