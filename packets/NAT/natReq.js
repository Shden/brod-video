/* NAT addres request:

                                                                                        CmdHead  UniqID1  Resp1    Resp2    UniqID2  Resp3    CmdTail                  
------------------------------------------------------------------------------------------------------------------------------------------------------
352     5.167631	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 00000000 00000000 6dd38221 00000000 fefe0001
472     5.174198	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=28	02000100 6dd38221 6cd38221 00000000 6dd38221 6dd38221 fefe0001
476	5.174339	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=28	02000100 6dd38221 6cd38221 6cd38221 6dd38221 6ed38221 fefe0001

                                                                                        CmdHead  UniqID1  UniqID1  UniqID2  Data1    Data2                  
---------------------------------------------------------------------------------------------------------------------------------------------
544	5.176953	192.168.2.6	152.32.245.172	UDP	34952 → 8989 Len=24	02030100 6dd38221 6dd38221 6cd38221 00000000 00000000

>>>>>>
                                                                                        CmdHead  UniqID1  UniqID2  UniqID3  UniqID4  UniqID5  Data1    Data2    XML
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
656	5.180685	152.32.245.172	192.168.2.6	UDP	8989 → 34952 Len=128	02010100 6dd38221 6dd38221 6dd38221 6ed38221 6ed38221 00010000 60000000 3c4e6174…
<<<<<<
*/

export const NATReqCmd = 0x00010102;

// NATReq data structure 
export function NATReq(id1, id2, id3, id4, id5, data1, data2, xml)
{
        this.CmdHead = NATReqCmd;
        this.UniqID1 = id1;
        this.UniqID2 = id2;
        this.UniqID3 = id3;
        this.UniqID4 = id4;
        this.UniqID5 = id5;
        this.Data1 = data1;
        this.Data2 = data2;
        this.XML = xml;
}

export function serializeNATReq(NATReq)
{
        const u32 = new Uint32Array([NATReq.CmdHead, NATReq.UniqID1, NATReq.UniqID2, NATReq.UniqID3, NATReq.UniqID4, NATReq.UniqID5, NATReq.Data1, NATReq.Data2]);
        const b32 = Buffer.from(u32.buffer);
        const btxt = new Buffer.from(NATReq.XML + '\0');
        return Buffer.concat([b32, btxt]);
}