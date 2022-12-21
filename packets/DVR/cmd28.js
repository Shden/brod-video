/* First command in DVR exchange, goes as 28-byte UDP packet:

                                                                                        CmdHead  UniqID1  Resp1    Resp2    UniqID2  Resp3    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
18	30.249689	192.168.2.11	185.211.159.123	UDP	57911 → 17534 Len=28	01000100 8416ae35 8316ae35 00000000 8416ae35 8416ae35 fefe0001
19	30.250600	185.211.159.123	192.168.2.11	UDP	17534 → 57911 Len=28	01000100 8416ae35 8316ae35 8316ae35 8416ae35 8516ae35 fefe0001
*/

export const Cmd28Head = 0x00010001;
export const Cmd28Tail = 0x0100fefe;

// Cmd28 data structure 
export function Cmd28(id)
{
        this.CmdHead = Cmd28Head;
        this.UniqID1 = id;
        this.UniqID2 = id;
        this.Resp1 = 0;
        this.Resp2 = 0;
        this.Resp3 = 0;
        this.CmdTail = Cmd28Tail;
}

export function serializeCmd28(ack28)
{
        const u32 = new Uint32Array([ack28.CmdHead, ack28.UniqID1, ack28.Resp1, ack28.Resp2, ack28.UniqID2, ack28.Resp3, ack28.CmdTail]);
        return Buffer.from(u32.buffer);
}

export function deserializeCmd28(buffer)
{
        if (buffer.readUInt32LE(0 * 4) != Cmd28Head)
                raise('Not Ack28 command, unable to deserialize.');

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

