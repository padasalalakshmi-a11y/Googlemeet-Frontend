import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🎥</span>
              <span className="text-xl font-bold">Video Translation Meet</span>
            </div>
            <p className="text-gray-400 mb-4">
              Breaking language barriers, one conversation at a time.
            </p>
            <div className="flex gap-3">
              {['📘', '🐦', '📷', '💼'].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-bold text-lg mb-4">Features</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">24+ Languages</a></li>
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Real-time Translation</a></li>
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">HD Video Quality</a></li>
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Secure & Private</a></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/meet" className="text-gray-400 hover:text-white transition-colors">Start Meeting</Link></li>
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-lg mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Video Translation Meet. All rights reserved. Made with ❤️ for global communication.</p>
        </div>
      </div>
    </footer>
  )
}
