export const LogLevel = 
{
        None: 0,
        All: 20
}

export class Logger
{
        constructor(logLevel = LogLevel.None)
        {
                this.logLevel = logLevel;
        }

        get LogLevel() { return this.logLevel; }
        set LogLevel(level) { this.logLevel = level; }

        LogSentMessage(buffer, host, port) 
        {
                if (this.LogLevel > LogLevel.None) 
                {
                	console.log('%d bytes --> %s:%d || %s', 
	                        buffer.length, host.padStart(16), port, this.FormatBufferForLog(buffer));
                }
        }

        LogReceivedMessage(buffer, info) 
        {
                if (this.LogLevel > LogLevel.None) 
                {
                        console.log('%s:%d --> %d bytes || %s',
                                info.address.padStart(16), info.port, buffer.length, this.FormatBufferForLog(buffer));
                }
        }

        FormatBufferForLog(buffer) 
        {
                const HEADER_LEN = 32;

                let fmtRes = '';
                for (let index = 0; index < Math.min(buffer.length, HEADER_LEN); index += 4)
                        if (index >= 8 && index <= 20) { // Data1..Data4
                                if (buffer.readUInt32LE(index))
                                        fmtRes += (buffer.readUInt32LE(index)-buffer.readUInt32LE(4)).toString().padStart(3, ' ') + '|';
                                else
                                        fmtRes += ''.padStart(3, ' ') + '|'
                        } else
                                fmtRes += buffer.readUInt32LE(index).toString(16).padStart(8, '0').toUpperCase() + '|';
                if (buffer.length > HEADER_LEN)
                        fmtRes += buffer.toString('hex', HEADER_LEN);
                return fmtRes;
        }

        group(name)
        {
                if (this.logLevel == LogLevel.None) return;
                console.group(name);
        }

        groupEnd()
        {
                if (this.logLevel == LogLevel.None) return;
                console.groupEnd();
        }

        log(...args)
        {
                if (this.logLevel == LogLevel.None) return;
                console.log(...args);
        }
}