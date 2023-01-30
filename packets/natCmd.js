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

import { Cmd28 } from "./cmd28.js";

// NATReq data structure 
export class NATCmd extends Cmd28 
{
        static get CmdID() { return 0x00010102; }
        static get Tail() { return 0x0100; }

        constructor(xml)
        {
                super(NATCmd.CmdID, 0, 0, 0, 0, 0, NATCmd.Tail);
                this.XMLLength = xml.length + 1;
                this.XML = xml;
        }

        serialize()
        {
                const u32 = new Uint32Array([this.XMLLength]);
                const b32 = Buffer.from(u32.buffer);
                const btxt = new Buffer.from(this.XML + '\0');
                return Buffer.concat([super.serialize(), b32, btxt]);
        }

        static deserialize(buffer)
        {
                if (buffer.readUInt32LE(0 * 4) != NATCmd.CmdID && buffer.readUInt32LE(0 * 4) != NATCmd.NATRespCmd)
                        raise('Not NATReq command, unable to deserialize.');
        
                // TODO: Refactor to return instance of NATReq instead of Cmd28 (see BinPayload)
                const cmd = Cmd28.deserialize(buffer);
                cmd.XMLLength   = buffer.readUInt32LE(7 * 4);
                cmd.XML         = buffer.toString('ascii', 8 * 4, buffer.length-1);
        
                return cmd;
        }
}

// 2320
// 0000   45 00 01 0e ba a2 00 00 40 11 12 0f c0 a8 74 a3   E.......@.....t.
// 0010   2f 5b 48 87 c3 22 23 1d 00 fa b4 c4 02 01 01 00   /[H.."#.........
// 0020   b1 b2 94 05 b1 b2 94 05 b0 b2 94 05 b2 b2 94 05   ................
// 0030   b1 b2 94 05 00 01 00 00 d2 00 00 00 3c 4e 61 74   ............<Nat
// 0040   20 76 65 72 73 69 6f 6e 3d 22 30 2e 34 2e 30 2e    version="0.4.0.
// 0050   31 22 3e 3c 43 6d 64 20 69 64 3d 22 31 30 30 30   1"><Cmd id="1000
// 0060   32 22 3e 3c 52 65 71 75 65 73 74 53 65 71 3e 31   2"><RequestSeq>1
// 0070   3c 2f 52 65 71 75 65 73 74 53 65 71 3e 3c 44 65   </RequestSeq><De
// 0080   76 69 63 65 4e 6f 3e 4e 31 32 34 46 30 33 41 52   viceNo>N124F03AR
// 0090   33 35 42 3c 2f 44 65 76 69 63 65 4e 6f 3e 3c 52   35B</DeviceNo><R
// 00a0   65 71 75 65 73 74 50 65 65 72 4e 61 74 3e 30 3c   equestPeerNat>0<
// 00b0   2f 52 65 71 75 65 73 74 50 65 65 72 4e 61 74 3e   /RequestPeerNat>
// 00c0   3c 50 32 50 56 65 72 73 69 6f 6e 3e 31 2e 30 3c   <P2PVersion>1.0<
// 00d0   2f 50 32 50 56 65 72 73 69 6f 6e 3e 3c 43 6f 6e   /P2PVersion><Con
// 00e0   6e 65 63 74 69 6f 6e 49 64 3e 39 33 36 33 31 31   nectionId>936311
// 00f0   35 33 3c 2f 43 6f 6e 6e 65 63 74 69 6f 6e 49 64   53</ConnectionId
// 0100   3e 3c 2f 43 6d 64 3e 3c 2f 4e 61 74 3e 00         ></Cmd></Nat>.

// 2433
// 0000   45 00 01 0e 72 d0 00 00 40 11 59 e1 c0 a8 74 a3   E...r...@.Y...t.
// 0010   2f 5b 48 87 c3 22 23 1d 00 fa b3 c4 02 01 01 00   /[H.."#.........
// 0020   b1 b2 94 05 b2 b2 94 05 b0 b2 94 05 b2 b2 94 05   ................
// 0030   b1 b2 94 05 00 01 00 00 d2 00 00 00 3c 4e 61 74   ............<Nat
// 0040   20 76 65 72 73 69 6f 6e 3d 22 30 2e 34 2e 30 2e    version="0.4.0.
// 0050   31 22 3e 3c 43 6d 64 20 69 64 3d 22 31 30 30 30   1"><Cmd id="1000
// 0060   32 22 3e 3c 52 65 71 75 65 73 74 53 65 71 3e 31   2"><RequestSeq>1
// 0070   3c 2f 52 65 71 75 65 73 74 53 65 71 3e 3c 44 65   </RequestSeq><De
// 0080   76 69 63 65 4e 6f 3e 4e 31 32 34 46 30 33 41 52   viceNo>N124F03AR
// 0090   33 35 42 3c 2f 44 65 76 69 63 65 4e 6f 3e 3c 52   35B</DeviceNo><R
// 00a0   65 71 75 65 73 74 50 65 65 72 4e 61 74 3e 30 3c   equestPeerNat>0<
// 00b0   2f 52 65 71 75 65 73 74 50 65 65 72 4e 61 74 3e   /RequestPeerNat>
// 00c0   3c 50 32 50 56 65 72 73 69 6f 6e 3e 31 2e 30 3c   <P2PVersion>1.0<
// 00d0   2f 50 32 50 56 65 72 73 69 6f 6e 3e 3c 43 6f 6e   /P2PVersion><Con
// 00e0   6e 65 63 74 69 6f 6e 49 64 3e 39 33 36 33 31 31   nectionId>936311
// 00f0   35 33 3c 2f 43 6f 6e 6e 65 63 74 69 6f 6e 49 64   53</ConnectionId
// 0100   3e 3c 2f 43 6d 64 3e 3c 2f 4e 61 74 3e 00         ></Cmd></Nat>.

