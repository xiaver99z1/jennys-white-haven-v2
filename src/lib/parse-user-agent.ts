export function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown Device'

  let browser = 'Unknown Browser'
  let os = 'Unknown OS'

  // Detect Operating System
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS'))
    os = 'macOS'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad'))
    os = 'iOS'
  else if (userAgent.includes('Linux')) os = 'Linux'

  // Detect Browser
  if (userAgent.includes('Edg/')) {
    browser = 'Microsoft Edge'
  } else if (userAgent.includes('Brave')) {
    browser = 'Brave'
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome'
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari'
  }

  return `${browser} on ${os}`
}
