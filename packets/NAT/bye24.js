/* Exchange finalisation, goes as 3 24-byte UDP packets:

                                                                                        CmdHead  UniqID1  Resp1    Resp2    UniqID2  Resp3    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

>>>>>>
                                                                                        CmdHead  UniqID1  UniqID1  UniqID2  Data1    Data2                  
---------------------------------------------------------------------------------------------------------------------------------------------
544	5.176953	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=24	02030100 6dd38221 6dd38221 6cd38221 00000000 00000000
<<<<<<
*/

export const Bye24Cmd = 0x00010302;

// Bye24 data structure 
export function Bye24(id1, id2)
{
        this.CmdHead = Bye24Cmd;
        this.UniqID1 = id1;
        this.UniqID2 = id2;
        this.Data1 = 0;
        this.Data2 = 0;
}

export function serializeBye24(bye24)
{
        const u32 = new Uint32Array([bye24.CmdHead, bye24.UniqID1, bye24.UniqID1, bye24.UniqID2, bye24.Data1, bye24.Data2]);
        return u32.buffer;
}

export function deserializeBye24(buffer)
{
        const packetAsInt32Array = new Int32Array(buffer);
        let bye24 = new Bye24();
        bye24.CmdHead = packetAsInt32Array[0];
        bye24.UniqID1 = packetAsInt32Array[1];
        bye24.UniqID2 = packetAsInt32Array[3];
        bye24.Data1 = packetAsInt32Array[4];
        bye24.Data2 = packetAsInt32Array[5];

        return bye24;
}

