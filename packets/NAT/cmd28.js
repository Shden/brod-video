/* Initial exchange, goes as 3 28-byte UDP packets:

                                                                                        CmdHead  UniqID1  Resp1    Resp2    UniqID2  Resp3    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

*/

export const Cmd28Head_10002 = 0x00010002;
export const Cmd28Head_10001 = 0x00010001;
export const Cmd28Tail = 0x0100fefe;

// Cmd28 data structure 
export class Cmd28
{
        constructor(cmd28Head, id)
        {
                this.CmdHead = cmd28Head;
                this.ConversationID = id;
                this.ConversationID2 = id;
                this.Data1 = 0;
                this.Data2 = 0;
                this.Data3 = 0;
                this.CmdTail = Cmd28Tail;
        }

        serialize()
        {
                const u32 = new Uint32Array([this.CmdHead, this.ConversationID, this.Data1, this.Data2, this.ConversationID2, this.Data3, this.CmdTail]);
                return Buffer.from(u32.buffer);
        }
}

export function deserializeCmd28(buffer)
{
        if (buffer.length !== 28)
                throw 'Wrong buffer length, unable to deserialize Cmd28.';
                
        const head = buffer.readUInt32LE(0 * 4);
        if (!head in [Cmd28Head_10002, Cmd28Head_10001])
                throw 'Unknown header, unable to deserialize Cmd28.';

        const tail = buffer.readUInt32LE(6 * 4);
        if (tail !== Cmd28Tail)
                throw 'Unknownn tail, unable to deserialize Cmd28.';

        let cmd28 = new Cmd28();

        cmd28.CmdHead   = head; 
        cmd28.ConversationID   = buffer.readUInt32LE(1 * 4); 
        cmd28.Data1     = buffer.readUInt32LE(2 * 4); 
        cmd28.Data2     = buffer.readUInt32LE(3 * 4); 
        cmd28.ConversationID2   = buffer.readUInt32LE(4 * 4);
        cmd28.Data3     = buffer.readUInt32LE(5 * 4); 
        cmd28.CmdTail   = tail;

        return cmd28;
}

