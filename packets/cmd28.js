/* Initial exchange, goes as 3 28-byte UDP packets:

                                                                                        CmdHead  ConvID   Data1    Data2    Data3    Data4    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

*/

// Cmd28 data structure 
export class Cmd28
{
        constructor(head, connectionID, data1 = 0, data2 = 0, data3 = 0, data4 = 0, tail = Cmd28.Tail)
        {
                this.CmdHead = head;
                this.ConnectionID = connectionID;
                this.Data1 = data1;
                this.Data2 = data2;
                this.Data3 = data3;
                this.Data4 = data4;
                this.CmdTail = tail;
        }

        static get Head_NAT() { return 0x00010002; }
        static get Head_DVR() { return 0x00010001; }
        static get Tail() { return 0x0100fefe; }

        serialize()
        {
                const u32 = new Uint32Array([this.CmdHead, this.ConnectionID, this.Data1, this.Data2, this.Data3, this.Data4, this.CmdTail]);
                return Buffer.from(u32.buffer);
        }

        static deserialize(buffer)
        {
                if (buffer.length < 28)
                        throw 'Wrong buffer length, unable to deserialize Cmd28.';
                        
                let cmd28 = new Cmd28();
        
                cmd28.CmdHead           = buffer.readUInt32LE(0 * 4); 
                cmd28.ConnectionID      = buffer.readUInt32LE(1 * 4); 
                cmd28.Data1             = buffer.readUInt32LE(2 * 4); 
                cmd28.Data2             = buffer.readUInt32LE(3 * 4); 
                cmd28.Data3             = buffer.readUInt32LE(4 * 4);
                cmd28.Data4             = buffer.readUInt32LE(5 * 4); 
                cmd28.CmdTail           = buffer.readUInt32LE(6 * 4);
        
                return cmd28;
        }
}
