import { motion } from 'framer-motion'

const features = [
  'HD Video Quality',
  'AI-Powered Translation',
  'No Registration Required',
  '30 Minutes Free '
]

export default function About() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
              About{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Video Translation Meet
              </span>
            </h2>
            
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Video Translation Meet is a revolutionary platform that breaks down language barriers in video communication. 
              Whether you're connecting with family abroad, conducting international business meetings, or collaborating 
              with global teams, our real-time AI translation technology ensures everyone understands each other perfectly.
            </p>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Built with cutting-edge technology including WebRTC for crystal-clear video, advanced speech recognition, 
              and powerful AI translation, we make global communication effortless and natural.
            </p>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative w-80 h-80 mx-auto">
              {/* Globe */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-9xl">🌍</span>
              </motion.div>

              {/* Orbits */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 10 + i * 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0"
                  style={{
                    padding: `${i * 30}px`
                  }}
                >
                  <div className="w-full h-full border-2 border-primary/20 rounded-full"></div>
                </motion.div>
              ))}

              {/* Floating Icons */}
              {['🎥', '🎤', '💬', '🌐'].map((icon, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -20, 0],
                    rotate: [0, 10, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.5
                  }}
                  className="absolute text-4xl"
                  style={{
                    top: `${20 + i * 20}%`,
                    left: `${10 + i * 25}%`
                  }}
                >
                  {icon}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
