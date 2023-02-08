import { DVRCmd } from "../packets/dvrCmd.js";

export class UDPLinearizer extends Array
{
        get isComplete()
        {
                // make sure packets are in sequence order
                this.sort((a, b) => a.Data1 - b.Data1);

                const buffer = this.combinedBuffer;
                const cmd = new DVRCmd(DVRCmd.CmdID_DVR, 0, 0, 0, 0, 0, buffer);
                cmd.decodeSegments();

                return !cmd.hasNextBlock;
                // if (buffer.length == 0) return false;

                // let offset = 0;
                // do {
                //         if (buffer.readUInt32LE(offset) !== DVRCmd.DATA_SEGMENT_HEADER) return false;
                //         // console.log(buffer.toString('hex', offset, offset + buffer.readUInt32LE(offset + 4) + 8));
                //         offset += buffer.readUInt32LE(offset + 4) + 8;
                //         if (offset > buffer.length) return false;
                        
                // } while (offset + 4 < buffer.length);

                // return true;
        }

        // reduce to a single buffer
        get combinedBuffer()
        {
                return this.reduce(
                        (accumulator, currentValue) => accumulator = Buffer.concat([accumulator, currentValue.payload]),
                        Buffer.allocUnsafe(0));
        }
}