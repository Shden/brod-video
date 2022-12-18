/* Initial exchange, goes as 3 28-byte UDP packets:

                                                                                        CmdHead  UniqID1  Resp1    Resp2    UniqID2  Resp3    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

*/

// Ack28 data structure 
export function Ack28()
{
        this.CmdHead = 0x00010002;
        this.UniqID1 = 0;
        this.UniqID2 = 0;
        this.Resp1 = 0;
        this.Resp2 = 0;
        this.Resp3 = 0;
        this.CmdTail = 0x0100fefe;
}

export function serializeAck28(ack28)
{
        const u32 = new Uint32Array()
}

