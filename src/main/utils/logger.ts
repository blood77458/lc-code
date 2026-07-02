export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage(LogLevel.DEBUG, message, meta))
    }
  },
  info(message: string, meta?: unknown): void {
    console.info(formatMessage(LogLevel.INFO, message, meta))
  },
  warn(message: string, meta?: unknown): void {
    console.warn(formatMessage(LogLevel.WARN, message, meta))
  },
  error(message: string, meta?: unknown): void {
    console.error(formatMessage(LogLevel.ERROR, message, meta))
  }
}
