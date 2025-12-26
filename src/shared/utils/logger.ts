export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
}

class Logger {
    private readonly isProduction: boolean;

    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    private formatContext(context?: LogContext): string {
        if (!context || Object.keys(context).length === 0) return '';
        const parts = Object.entries(context).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
        return ` ${parts.join(' ')}`;
    }

    private formatLog(entry: LogEntry): string {
        if (!this.isProduction) {
            const levelUpper = entry.level.toUpperCase().padEnd(5);
            const contextStr = this.formatContext(entry.context);
            return `[${entry.timestamp}] ${levelUpper} ${entry.message}${contextStr}`;
        }
        return JSON.stringify(entry);
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...(context && Object.keys(context).length > 0 ? { context } : {}),
        };

        const output = this.formatLog(entry);

        switch (level) {
            case 'error':
                console.error(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }
}

export const logger = new Logger();
