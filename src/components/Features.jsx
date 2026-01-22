import { motion } from 'framer-motion'

const features = [
  {
    icon: '🌍',
    title: '24+ Languages',
    description: 'Support for major languages including English, Telugu, Hindi, Spanish, French, Chinese, Japanese, and more.',
    badge: 'Popular'
  },
  {
    icon: '⚡',
    title: 'Real-Time Translation',
    description: 'Speak naturally and see instant AI-powered translations as subtitles. No delays, no confusion.',
    badge: 'Fast'
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description: 'End-to-end encrypted video calls. Your conversations stay completely private and secure.',
    badge: 'Secure'
  },
  {
    icon: '📱',
    title: 'Works Everywhere',
    description: 'No downloads needed. Works seamlessly on desktop, mobile, and tablet browsers.',
    badge: 'Easy'
  },
  {
    icon: '👥',
    title: 'Multiple Participants',
    description: 'Connect with multiple people simultaneously, each hearing their preferred language.',
    badge: 'Flexible'
  },
  {
    icon: '🎯',
    title: 'Simple Interface',
    description: 'Intuitive design. Create a meeting in seconds. Share a link. Start talking. That\'s it.',
    badge: 'Simple'
  }
]

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Why Choose{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Video Translation Meet
            </span>
            ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features that make global communication effortless
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 group"
            >
              {/* Badge */}
              <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold rounded-full">
                {feature.badge}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-4xl">{feature.icon}</span>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-primary/20 transition-colors"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
