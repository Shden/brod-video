export function LogSentMessage(buffer, host, port) 
{
        console.log('%d bytes --> %s:%d\t%s', 
                buffer.length, host, port, FormatBufferForLog(buffer));
}

export function LogReceivedMessage(buffer, info) 
{
        console.log('%s:%d --> %d bytes\t%s',
                info.address, info.port, buffer.length, FormatBufferForLog(buffer));
}

function FormatBufferForLog(buffer) 
{
        const HEADER_LEN = 32;

        let fmtRes = '';
        for (let index = 0; index < Math.min(buffer.length, HEADER_LEN); index += 4)
                fmtRes += buffer.readUInt32LE(index).toString(16).padStart(8, '0').toUpperCase() + '|';
        if (buffer.length > HEADER_LEN)
                fmtRes += buffer.toString('hex', HEADER_LEN);
        return fmtRes;
}