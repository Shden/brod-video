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

// Bye24 data structure 
export class Cmd24
{
        constructor(cmd24Head, id1, id2)
        {
                this.CmdHead = cmd24Head;
                this.UniqID1 = id1;
                this.UniqID2 = id2;
                this.Data1 = 0;
                this.Data2 = 0;
        }

        static get Head_020201() { return 0x00010202; }
        static get Head_020301() { return 0x00010302; }
        
        serialize(cmd24)
        {
                const u32 = new Uint32Array([this.CmdHead, this.UniqID1, this.UniqID1, this.UniqID2, this.Data1, this.Data2]);
                return Buffer.from(u32.buffer);
        }
}

export function deserializeCmd24(buffer)
{
        if (buffer.length !== 24)
                throw 'Wrong buffer length, unable to deserialize Cmd24.';

        const head = buffer.readUInt32LE(0 * 4);
        if (head != Cmd24.Head_020201 && head != Cmd24.Head_020301)
                raise('Not Cmd24 command, unable to deserialize.');

        let cmd24 = new Cmd24();
        cmd24.CmdHead   = head;
        cmd24.UniqID1   = buffer.readUInt32LE(1 * 4);
        cmd24.UniqID2   = buffer.readUInt32LE(3 * 4);
        cmd24.Data1     = buffer.readUInt32LE(4 * 4);
        cmd24.Data2     = buffer.readUInt32LE(5 * 4);

        return cmd24;
}

