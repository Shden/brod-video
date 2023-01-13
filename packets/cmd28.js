import { Cmd24 } from "./cmd24.js";

/* Initial exchange, goes as 3 28-byte UDP packets:

                                                                                        CmdHead  ConvID   Data1    Data2    Data3    Data4    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

*/


// Cmd28 data structure 
export class Cmd28 extends Cmd24
{
        constructor(head, connectionID, data1 = 0, data2 = 0, data3 = 0, data4 = 0, tail = Cmd28.Tail)
        {
                super(head, connectionID, data1, data2, data3, data4);
                this.CmdTail = tail;
        }

        static get Head_NAT() { return 0x00010002; }
        static get Head_DVR() { return 0x00010001; }
        static get Tail() { return 0x0100fefe; }

        serialize()
        {
                const u32 = new Uint32Array([this.CmdTail]);
                return Buffer.concat([super.serialize(), Buffer.from(u32.buffer)]);
        }

        static deserialize(buffer)
        {
                if (buffer.length < 28)
                        throw 'Wrong buffer length, unable to deserialize Cmd28.';
                        
                const cmd24 = Cmd24.deserialize(buffer);
                return new Cmd28(cmd24.CmdHead, cmd24.ConnectionID, 
                        cmd24.Data1, cmd24.Data2, cmd24.Data3, cmd24.Data4, buffer.readUInt32LE(6 * 4));
        }
}
