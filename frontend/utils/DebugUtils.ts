let messageCount = 0

export function debugLog(message: string) {
  const msg = `[${++messageCount}] ${message}`
  console.log(msg)
  try {
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]')
    logs.push({
      timestamp: new Date().toISOString(),
      count: messageCount,
      message,
    })
    if (logs.length > 50) logs.shift()
    localStorage.setItem('debugLogs', JSON.stringify(logs))
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function getDebugLogs(): any[] {
  try {
    return JSON.parse(localStorage.getItem('debugLogs') || '[]')
  } catch (e) {
    return []
  }
}
