import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Break Language Barriers in{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Real-Time
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Connect with anyone, anywhere, in any language. Video calls with instant AI-powered translation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/meet">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
                >
                  <span>Start a Meeting</span>
                  <span>→</span>
                </motion.button>
              </Link>
              
              <motion.a
                href="#how-it-works"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-white text-primary border-2 border-primary rounded-full font-semibold text-lg hover:bg-primary/5 transition-colors flex items-center justify-center"
              >
                Learn More
              </motion.a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">24+</div>
                <div className="text-sm text-gray-600">Languages</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">30 MIN</div>
                <div className="text-sm text-gray-600">Free</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">0</div>
                <div className="text-sm text-gray-600">Downloads</div>
              </div>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20"
            >
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <div className="text-6xl mb-4">👤</div>
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                  </motion.div>
                  <div className="font-semibold text-gray-700">English</div>
                  <div className="mt-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                    Hello!
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="text-4xl text-primary"
                  >
                    🔄
                  </motion.div>
                  <div className="text-xs text-gray-500 mt-2">AI Translation</div>
                </div>

                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    className="relative"
                  >
                    <div className="text-6xl mb-4">👤</div>
                    <div className="absolute inset-0 bg-secondary/20 rounded-full blur-xl"></div>
                  </motion.div>
                  <div className="font-semibold text-gray-700">తెలుగు</div>
                  <div className="mt-2 px-4 py-2 bg-secondary/10 rounded-full text-sm font-medium text-secondary">
                    హలో!
                  </div>
                </div>
              </div>
              <div className="text-center mt-6 text-sm text-gray-500">
                ✨ Real-time AI Translation
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
