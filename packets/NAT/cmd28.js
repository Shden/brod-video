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

// Ack28 data structure 
export function Cmd28(cmd28Head, id)
{
        this.CmdHead = cmd28Head;
        this.UniqID1 = id;
        this.UniqID2 = id;
        this.Resp1 = 0;
        this.Resp2 = 0;
        this.Resp3 = 0;
        this.CmdTail = Cmd28Tail;
}

export function serializeCmd28(cmd28)
{
        const u32 = new Uint32Array([cmd28.CmdHead, cmd28.UniqID1, cmd28.Resp1, cmd28.Resp2, cmd28.UniqID2, cmd28.Resp3, cmd28.CmdTail]);
        return Buffer.from(u32.buffer);
}

export function deserializeCmd28(buffer)
{
        if (buffer.readUInt32LE(0 * 4) != Cmd28Head_10002)
                raise('Not Cmd28 command, unable to deserialize.');

        let cmd28 = new Cmd28();
        cmd28.CmdHead   = buffer.readUInt32LE(0 * 4); 
        cmd28.UniqID1   = buffer.readUInt32LE(1 * 4); 
        cmd28.Resp1     = buffer.readUInt32LE(2 * 4); 
        cmd28.Resp2     = buffer.readUInt32LE(3 * 4); 
        cmd28.UniqID2   = buffer.readUInt32LE(4 * 4);
        cmd28.Resp3     = buffer.readUInt32LE(5 * 4); 
        cmd28.CmdTail   = buffer.readUInt32LE(6 * 4);

        return cmd28;
}

