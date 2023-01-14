import { BinPayload } from "../packets/binPayload.js";

export class UDPLinearizer extends Array
{
        get isComplete()
        {
                const SEGMENT_HEADER = 0x31313131;

                // make sure packets are in sequence order
                this.sort((a, b) => a.Data1 - b.Data1);

                const buffer = this.combinedBuffer;
                if (buffer.length == 0) return false;

                let offset = 0;
                do {
                        if (buffer.readUInt32LE(offset) !== SEGMENT_HEADER) return false;
                        offset += buffer.readUInt32LE(offset + 4) + 8;
                        if (offset > buffer.length) return false;
                        
                } while (offset + 4 < buffer.length);

                return true;
        }

        // reduce to a single buffer
        get combinedBuffer()
        {
                return this.reduce(
                        (accumulator, currentValue) => accumulator = Buffer.concat([accumulator, currentValue.payload]),
                        Buffer.allocUnsafe(0));
        }
}