import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary"></div>
      
      {/* Animated Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">
            Ready to Connect{' '}
            <span className="bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
              Globally
            </span>
            ?
          </h2>
          
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Start your first translated video call in seconds. No credit card required.
          </p>

          <Link to="/meet">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-white text-primary rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transition-shadow inline-flex items-center gap-3"
            >
              <span>Start a Meeting Now</span>
              <span className="text-2xl">→</span>
            </motion.button>
          </Link>

          <p className="mt-6 text-white/80 text-sm">
            ✨ Join thousands of users breaking language barriers every day
          </p>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-10 left-10 text-6xl opacity-20"
        >
          🌍
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute bottom-10 right-10 text-6xl opacity-20"
        >
          💬
        </motion.div>
      </div>
    </section>
  )
}
