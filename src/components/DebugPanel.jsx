import { useState, useEffect } from 'react'

export default function DebugPanel() {
  const [logs, setLogs] = useState([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Capture console.log, console.error, console.warn
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    console.log = (...args) => {
      originalLog(...args)
      addLog('log', args.join(' '))
    }

    console.error = (...args) => {
      originalError(...args)
      addLog('error', args.join(' '))
    }

    console.warn = (...args) => {
      originalWarn(...args)
      addLog('warn', args.join(' '))
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { type, message, timestamp }].slice(-50)) // Keep last 50 logs
  }

  const clearLogs = () => {
    setLogs([])
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg z-[9999] flex items-center justify-center text-2xl hover:bg-blue-600"
        title="Show Debug Console"
      >
        🐛
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
          <h3 className="font-bold text-lg">🐛 Debug Console</h3>
          <div className="flex gap-2">
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-yellow-500 text-black rounded hover:bg-yellow-600 text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900 text-white font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No logs yet. Logs will appear here as you use the app.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded ${
                  log.type === 'error'
                    ? 'bg-red-900/50 border-l-4 border-red-500'
                    : log.type === 'warn'
                    ? 'bg-yellow-900/50 border-l-4 border-yellow-500'
                    : 'bg-gray-800 border-l-4 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-xs font-bold ${
                      log.type === 'error'
                        ? 'text-red-400'
                        : log.type === 'warn'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {log.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">{log.timestamp}</span>
                </div>
                <div className="text-white whitespace-pre-wrap break-words">
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-100 px-4 py-3 rounded-b-lg text-sm text-gray-700">
          <p className="font-semibold mb-1">📱 Mobile Debugging:</p>
          <p>• Click 🐛 button to open/close this console</p>
          <p>• All console.log, console.error, console.warn will appear here</p>
          <p>• Share screenshot of errors with developer</p>
        </div>
      </div>
    </div>
  )
}
