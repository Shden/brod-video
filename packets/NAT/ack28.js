/* Initial exchange, goes as 3 28-byte UDP packets:

                                                                                        CmdHead  UniqID1  Resp1    Resp2    UniqID2  Resp3    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

*/

export const Ack28Cmd = 0x00010002;
export const Ack28Tail = 0x0100fefe;

// Ack28 data structure 
export function Ack28(id)
{
        this.CmdHead = Ack28Cmd;
        this.UniqID1 = id;
        this.UniqID2 = id;
        this.Resp1 = 0;
        this.Resp2 = 0;
        this.Resp3 = 0;
        this.CmdTail = Ack28Tail;
}

export function serializeAck28(ack28)
{
        const u32 = new Uint32Array([ack28.CmdHead, ack28.UniqID1, ack28.Resp1, ack28.Resp2, ack28.UniqID2, ack28.Resp3, ack28.CmdTail]);
        return u32.buffer;
}

export function deserializeAck28(buffer)
{
        const packetAsInt32Array = new Int32Array(buffer);
        let ack28 = new Ack28();
        ack28.CmdHead = packetAsInt32Array[0];
        ack28.UniqID1 = packetAsInt32Array[1];
        ack28.Resp1 = packetAsInt32Array[2];
        ack28.Resp2 = packetAsInt32Array[3];
        ack28.UniqID2 = packetAsInt32Array[4];
        ack28.Resp3 = packetAsInt32Array[5];
        ack28.CmdTail = packetAsInt32Array[6];

        return ack28;
}

