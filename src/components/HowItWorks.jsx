import { motion } from 'framer-motion'

const steps = [
  {
    number: '1',
    icon: '🚀',
    title: 'Create a Meeting',
    description: 'Click "New meeting" to generate a unique meeting link instantly. No registration required.'
  },
  {
    number: '2',
    icon: '📤',
    title: 'Share the Link',
    description: 'Send the meeting link to anyone you want to connect with via email, chat, or social media.'
  },
  {
    number: '3',
    icon: '🌐',
    title: 'Select Languages',
    description: 'Choose what language you speak and what language you want to hear from 24+ options.'
  },
  {
    number: '4',
    icon: '💬',
    title: 'Start Talking',
    description: 'Speak naturally. See real-time translations as subtitles. Connect globally, communicate locally.'
  }
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            How It{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get started in 4 simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line (hidden on mobile, shown on desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-secondary opacity-20 z-0"></div>
              )}

              <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center">
                {/* Step Number */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative inline-block mb-6"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {step.number}
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10"
                  ></motion.div>
                </motion.div>

                {/* Icon */}
                <div className="text-5xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
