// Unstructured binary payloads
import { Cmd24 } from "./cmd24.js";
import { DvrUserName, DvrUserPass } from "../privateData.js";

export class DVRCmd extends Cmd24 {

        static get CmdID() { return 0x00010101; }
        static get DATA_SEGMENT_HEADER() { return 0x31313131; }

        constructor(head, connectionID, data1, data2, data3, data4, payload)
        {
                super(head, connectionID, data1, data2, data3, data4);
                this.payload = payload;
        }

        serialize()
        {
                return Buffer.concat([super.serialize(), this.payload]);
        }

        static deserialize(buffer)
        {
                const CMD24_LEN = 24;

                const cmd24 = Cmd24.deserialize(buffer);
                const payload = Buffer.allocUnsafe(buffer.length - CMD24_LEN);
                buffer.copy(payload, 0, CMD24_LEN, buffer.length);
        
                return new DVRCmd(cmd24.CmdHead, cmd24.ConnectionID, cmd24.Data1, cmd24.Data2,
                        cmd24.Data3, cmd24.Data4, payload);
        }

        printSegments()
        {
                console.log(' Header  Segment length ?????? ??');
                console.log('------------------------------------------------------------------------------------------------------------------------------------------');

                this.segments.forEach(segment => { 
                        let segData = this.payload.subarray(segment.start, segment.end)
                        console.log(//"%i %d %d\t%s",
                                // segData.readUInt32LE(4).toString().padStart(4), 
                                // segData.readUInt16LE(8),
                                // segData.readUInt8(11), 
                                segData.toString('hex', 0, 4),
                                segData.toString('hex', 4, 8), ('(' + segData.readUInt32LE(4).toString() + ')').padStart(5),
                                segData.toString('hex', 8, 11),
                                segData.toString('hex', 11, 12),
                                segData.toString('hex', 12)
                        ) 
                });
                console.log('hasNextBlock:', this.hasNextBlock);
        }

        get hasNextBlock()
        {
                if (this.segments.length)
                {
                        let lastSeg = this.segments[this.segments.length-1];
                        if (lastSeg.end > this.payload.length) 
                                return true;
                        let lastSegData = this.payload.subarray(lastSeg.start, lastSeg.end);
                        let markerByte = lastSegData.readUInt8(11);
                        return markerByte == 1;
                }
                return false;
        }

        decodeSegments()
        {
                this.segments = new Array();
                /**
                 * Each segment includes:
                 * 4 bytes: DATA_SEGMENT_HEADER segment marker
                 * 4 bytes: segment data length
                 */
                let offset = 0;
                while (offset + 4 < this.payload.length && this.payload.readUInt32LE(offset) == DVRCmd.DATA_SEGMENT_HEADER)
                {
                        let segLength = this.payload.readUInt32LE(offset + 4);
                        this.segments.push({ start: offset, end: offset + segLength + 8});
                        offset += segLength + 8;
                }
        }
        
}

//------------
// Packet 2507 in doc/conversations/DVR conversation 24122022.xlsx
export class Cmd88
{
        static get Head() { return 0x00010101; }
}

// DVR authentication request
// Packet 2588 in doc/conversations/DVR conversation 24122022.xlsx
// 0000   01 01 01 00 b1 b2 94 05 b1 b2 94 05 b1 b2 94 05   ................
// 0010   b2 b2 94 05 b2 b2 94 05 31 31 31 31 fc 00 00 00   ........1111....
// 0020   03 00 00 01 01 01 00 00 00 00 00 00 ec 00 00 00   ................
// 0030   03 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0040   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0050   00 00 00 00 XX XX XX XX XX XX XX XX XX XX XX XX   ....XXXXXXXXXXXX // DVR user name
// 0060   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0070   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0080   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0090   00 00 00 00 YY YY YY YY YY YY YY YY YY YY YY YY   ....YYYYYYYYYYYY // DVR user pwd
// 00a0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00b0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00c0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00d0   00 00 00 00 00 00 00 00 0a 79 50 60 00 00 00 00   .........yP`....
// 00e0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00f0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0100   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0110   00 00 00 00 00 00 00 00 00 00 00 00               ............
export class DVRAuth extends DVRCmd
{
        // Raw request without 24 bytes of cmd24 header
        static get Raw() { return `31313131fc000000030000010101000000000000ec000000030000000000000000000000000000000000000000000000000000000000000000000000${DvrUserName}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000${DvrUserPass}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a79506000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`; }

        constructor(connectionID = 0, cmdNo = 0, lastReceivedCmdNo = 0, nextCmdNo = 0, awaitNextCmdNo = 0)
        {
                super(DVRAuth.CmdID, connectionID, cmdNo, lastReceivedCmdNo, nextCmdNo, awaitNextCmdNo);
                this.payload = Buffer.from(DVRAuth.Raw, "hex");
        }

}

// querySystemCaps request
// Packet 2635 in doc/conversations/DVR conversation 24122022.xlsx
// 0000   01 01 01 00 b1 b2 94 05 b2 b2 94 05 b3 b2 94 05   ................
// 0010   b3 b2 94 05 b4 b2 94 05 31 31 31 31 18 01 00 00   ........1111....
// 0020   03 00 00 01 1b 09 00 00 01 00 00 00 08 01 00 00   ................
// 0030   61 64 6d 69 6e 00 00 00 00 00 00 00 00 00 00 00   admin...........
// 0040   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0050   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0060   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0070   71 75 65 72 79 53 79 73 74 65 6d 43 61 70 73 00   querySystemCaps.
// 0080   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0090   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00a0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00b0   3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 27 31   <?xml version='1
// 00c0   2e 30 27 20 65 6e 63 6f 64 69 6e 67 3d 27 75 74   .0' encoding='ut
// 00d0   66 2d 38 27 3f 3e 3c 72 65 71 75 65 73 74 20 76   f-8'?><request v
// 00e0   65 72 73 69 6f 6e 3d 27 31 2e 30 27 20 73 79 73   ersion='1.0' sys
// 00f0   74 65 6d 54 79 70 65 3d 27 4e 56 4d 53 2d 39 30   temType='NVMS-90
// 0100   30 30 27 20 63 6c 69 65 6e 74 54 79 70 65 3d 27   00' clientType='
// 0110   4d 4f 42 49 4c 45 27 20 75 72 6c 3d 27 71 75 65   MOBILE' url='que
// 0120   72 79 53 79 73 74 65 6d 43 61 70 73 27 3e 3c 2f   rySystemCaps'></
// 0130   72 65 71 75 65 73 74 3e                           request>
// -- Request: -------------------------------------------------------------
// <?xml version='1.0' encoding='utf-8'?>
// <request version='1.0' systemType='NVMS-9000' clientType='MOBILE' url='querySystemCaps'></request>
// 2667
// -- Response -------------------------------------------------------------
// HTTP/1.1 200 OK
// Content-type: text/xml
// Content-Length: 1429
// Connection: close
// Data: YWRtaW46Um9tYW45NDc3ODAz
// 
// <?xml version="1.0" encoding="UTF-8"?>
// <response version="1.0" systemType="NVMS-9000" cmdId="" cmdUrl="querySystemCaps">
// 	<status>success</status>
// 	<content>
// 		<chlMaxCount>12</chlMaxCount>
// 		<analogChlCount>8</analogChlCount>
// 		<switchableIpChlMaxCount>8</switchableIpChlMaxCount>
// 		<switchIpChlRange>
// 			<start>1</start>
// 			<end>8</end>
// 		</switchIpChlRange>
// 		<poeChlMaxCount>0</poeChlMaxCount>
// 		<ipChlMaxCount>4</ipChlMaxCount>
// 		<previewMaxWin>16</previewMaxWin>
// 		<playbackMaxWin>8</playbackMaxWin>
// 		<totalBandwidth unit="Mb">32</totalBandwidth>
// 		<usedTotalBandwidth unit="Kb">5120</usedTotalBandwidth>
// 		<usedAutoBandwidth unit="Kb">5120</usedAutoBandwidth>
// 		<usedManualBandwidth unit="Kb">5120</usedManualBandwidth>
// 		<supportTalk>true</supportTalk>
// 		<audioInNum>1</audioInNum>
// 		<supportPlatform>false</supportPlatform>
// 		<chlSupSignalType>AHD:TVI:CVI:AUTO</chlSupSignalType>
// 		<supportLite>true</supportLite>
// 		<supportSHDB>false</supportSHDB>
// 		<mainStreamLimitFps>1</mainStreamLimitFps>
// 		<supportPIR>false</supportPIR>
// 		<supportRecorder>false</supportRecorder>
// 		<supportImageRotate>false</supportImageRotate>
// 		<supportWaterMark>true</supportWaterMark>
// 		<supportFTP>true</supportFTP>
// 		<supportPOS>false</supportPOS>
// 		<supportFishEye>false</supportFishEye>
// 		<supportSnmp>true</supportSnmp>
// 		<showVideoLossMessage>true</showVideoLossMessage>
// 		<supportChlTalk>true</supportChlTalk>
// 	</content>
// </response>

export class QuerySystemCaps extends DVRCmd
{
        // Raw request without 24 bytes of cmd24 header
        static get Raw() { return '3131313118010000030000011b090000010000000801000061646d696e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000717565727953797374656d43617073000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003c3f786d6c2076657273696f6e3d27312e302720656e636f64696e673d277574662d38273f3e3c726571756573742076657273696f6e3d27312e30272073797374656d547970653d274e564d532d393030302720636c69656e74547970653d274d4f42494c45272075726c3d27717565727953797374656d43617073273e3c2f726571756573743e'; }

        constructor(id, data1, data2, data3, data4)
        {
                super(QuerySystemCaps.CmdID, id, data1, data2, data3, data4);
                this.payload = Buffer.from(QuerySystemCaps.Raw, "hex");
        }
}


// Packet 2673
// 0000   45 00 01 a9 64 d5 00 00 40 11 40 55 c0 a8 74 a3   E...d...@.@U..t.
// 0010   2d 89 71 45 c3 22 e4 54 01 95 87 34 01 01 01 00   -.qE.".T...4....
// 0020   b1 b2 94 05 b3 b2 94 05 b5 b2 94 05 b4 b2 94 05   ................
// 0030   b6 b2 94 05 31 31 31 31 6d 01 00 00 03 00 02 01   ....1111m.......
// 0040   05 05 00 00 02 00 00 00 15 01 00 00 fa ce f5 5b   ...............[
// 0050   d2 eb 47 02 bd dd 5a d5 dc 37 e9 4a 7d 5d 64 aa   ..G...Z..7.J}]d.
// 0060   74 2e 4f 53 b7 64 3e 69 90 8f 57 db 02 00 00 00   t.OS.d>i..W.....
// 0070   00 00 00 00 00 00 00 00 00 00 00 00 02 00 00 00   ................
// 0080   d8 cd 87 61 98 b2 47 72 85 27 39 92 f7 a2 c5 df   ...a..Gr.'9.....
// 0090   01 00 00 00 3c 3f 78 6d 6c 20 76 65 72 73 69 6f   ....<?xml versio
// 00a0   6e 3d 27 31 2e 30 27 20 65 6e 63 6f 64 69 6e 67   n='1.0' encoding
// 00b0   3d 27 75 74 66 2d 38 27 3f 3e 3c 72 65 71 75 65   ='utf-8'?><reque
// 00c0   73 74 20 76 65 72 73 69 6f 6e 3d 27 31 2e 30 27   st version='1.0'
// 00d0   20 73 79 73 74 65 6d 54 79 70 65 3d 27 4e 56 4d    systemType='NVM
// 00e0   53 2d 39 30 30 30 27 20 63 6c 69 65 6e 74 54 79   S-9000' clientTy
// 00f0   70 65 3d 27 53 59 53 27 3e 3c 64 65 73 74 49 64   pe='SYS'><destId
// 0100   3e 7b 30 30 30 30 30 30 30 32 2d 30 30 30 30 2d   >{00000002-0000-
// 0110   30 30 30 30 2d 30 30 30 30 2d 30 30 30 30 30 30   0000-0000-000000
// 0120   30 30 30 30 30 30 7d 3c 2f 64 65 73 74 49 64 3e   000000}</destId>
// 0130   3c 74 61 73 6b 49 64 3e 7b 36 31 38 37 43 44 44   <taskId>{6187CDD
// 0140   38 2d 42 32 39 38 2d 37 32 34 37 2d 38 35 32 37   8-B298-7247-8527
// 0150   2d 33 39 39 32 46 37 41 32 43 35 44 46 7d 3c 2f   -3992F7A2C5DF}</
// 0160   74 61 73 6b 49 64 3e 3c 63 68 4e 6f 3e 30 3c 2f   taskId><chNo>0</
// 0170   63 68 4e 6f 3e 3c 61 75 64 69 6f 3e 30 3c 2f 61   chNo><audio>0</a
// 0180   75 64 69 6f 3e 3c 73 74 72 65 61 6d 54 79 70 65   udio><streamType
// 0190   3e 32 3c 2f 73 74 72 65 61 6d 54 79 70 65 3e 3c   >2</streamType><
// 01a0   2f 72 65 71 75 65 73 74 3e                        /request>
// -------------------------------------------------------------------------
// <?xml version='1.0' encoding='utf-8'?>
// <request version='1.0' systemType='NVMS-9000' clientType='SYS'>
//         <destId>{00000002-0000-0000-0000-000000000000}</destId>
//         <taskId>{6187CDD8-B298-7247-8527-3992F7A2C5DF}</taskId>
//         <chNo>0</chNo>
//         <audio>0</audio>
//         <streamType>2</streamType>
// </request>
export class ChannelRequest extends DVRCmd
{
        constructor(connID, seq, convID, data3, data4, chNo, taskId, destID)
        {
                super(ChannelRequest.CmdID, connID, seq, convID, data3, data4, ChannelRequest.Tail);

                // binary part between cmd24 and xml
                const rawBin = '313131316d01000003000201050500000200000015010000facef55bd2eb4702bddd5ad5dc37e94a7d5d64aa742e4f53b7643e69908f57db0200000000000000000000000000000002000000d8cd876198b2477285273992f7a2c5df01000000';
                // xml template 
                const xml = `<?xml version='1.0' encoding='utf-8'?><request version='1.0' systemType='NVMS-9000' clientType='SYS'><destId>{${destID}}</destId><taskId>{${taskId}}</taskId><chNo>${chNo}</chNo><audio>0</audio><streamType>2</streamType></request>`;

                this.payload = Buffer.concat([Buffer.from(rawBin, "hex"), Buffer.from(xml)]);
        }
}

// 2674
// <?xml version='1.0' encoding='utf-8'?>
// <request version='1.0' systemType='NVMS-9000' clientType='SYS'>
//         <destId>{00000005-0000-0000-0000-000000000000}</destId>
//         <taskId>{0334EC4D-56AD-2F4C-82B6-A51E06118735}</taskId>
//         <chNo>1</chNo>
//         <audio>0</audio>
//         <streamType>2</streamType>
// </request>


// 2675
// queryOnlineChlList
// <?xml version='1.0' encoding='utf-8'?>
// <request version='1.0' systemType='NVMS-9000' clientType='MOBILE' url='queryOnlineChlList'></request>


// 2863
// 0000   45 e0 05 14 00 00 40 00 32 11 6e df 2d 89 71 45   E.....@.2.n.-.qE
// 0010   c0 a8 74 a3 e4 54 c3 22 05 00 7f 88 01 01 01 00   ..t..T."........
// 0020   b1 b2 94 05 c4 b2 94 05 c0 b2 94 05 c5 b2 94 05   ................
// 0030   c1 b2 94 05 31 31 31 31 17 06 00 00 06 00 00 01   ....1111........
// 0040   1b 09 00 10 0e 00 00 00 07 06 00 00 48 54 54 50   ............HTTP
// 0050   2f 31 2e 31 20 32 30 30 20 4f 4b 0d 0a 43 6f 6e   /1.1 200 OK..Con
// 0060   74 65 6e 74 2d 74 79 70 65 3a 20 74 65 78 74 2f   tent-type: text/
// 0070   78 6d 6c 0d 0a 43 6f 6e 74 65 6e 74 2d 4c 65 6e   xml..Content-Len
// 0080   67 74 68 3a 20 31 34 32 37 0d 0a 43 6f 6e 6e 65   gth: 1427..Conne
// 0090   63 74 69 6f 6e 3a 20 63 6c 6f 73 65 0d 0a 44 61   ction: close..Da
// 00a0   74 61 3a 20 59 57 52 74 61 57 34 36 55 6d 39 74   ta: YWRtaW46Um9t
// 00b0   59 57 34 35 4e 44 63 33 4f 44 41 7a 0d 0a 0d 0a   YW45NDc3ODAz....
// 00c0   3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31   <?xml version="1
// 00d0   2e 30 22 20 65 6e 63 6f 64 69 6e 67 3d 22 55 54   .0" encoding="UT
// 00e0   46 2d 38 22 3f 3e 0a 3c 72 65 73 70 6f 6e 73 65   F-8"?>.<response
// 00f0   20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 20 63    version="1.0" c
// 0100   6d 64 49 64 3d 22 22 20 63 6d 64 55 72 6c 3d 22   mdId="" cmdUrl="
// 0110   71 75 65 72 79 4e 6f 64 65 45 6e 63 6f 64 65 49   queryNodeEncodeI
// 0120   6e 66 6f 22 3e 0a 09 3c 73 74 61 74 75 73 3e 73   nfo">..<status>s
// 0130   75 63 63 65 73 73 3c 2f 73 74 61 74 75 73 3e 0a   uccess</status>.
// 0140   09 3c 63 6f 6e 74 65 6e 74 20 74 79 70 65 3d 22   .<content type="
// 0150   6c 69 73 74 22 20 74 6f 74 61 6c 3d 22 31 22 3e   list" total="1">
// 0160   0a 09 09 3c 69 74 65 6d 20 69 64 3d 22 7b 30 30   ...<item id="{00
// 0170   30 30 30 30 30 35 2d 30 30 30 30 2d 30 30 30 30   000005-0000-0000
// 0180   2d 30 30 30 30 2d 30 30 30 30 30 30 30 30 30 30   -0000-0000000000
// 0190   30 30 7d 22 3e 0a 09 09 09 3c 6e 61 6d 65 3e d0   00}">....<name>.
// 01a0   9a d0 b0 d0 bc d0 b5 d1 80 d0 b0 35 3c 2f 6e 61   ...........5</na
// 01b0   6d 65 3e 0a 09 09 09 3c 6d 61 69 6e 43 61 70 73   me>....<mainCaps
// 01c0   20 73 75 70 45 6e 63 74 3d 22 68 32 36 34 22 20    supEnct="h264" 
// 01d0   62 69 74 54 79 70 65 3d 22 43 42 52 2c 56 42 52   bitType="CBR,VBR
// 01e0   22 3e 0a 09 09 09 09 3c 72 65 73 20 66 70 73 3d   ">.....<res fps=
// 01f0   22 31 30 22 3e 32 35 36 30 78 31 39 33 36 3c 2f   "10">2560x1936</
// 0200   72 65 73 3e 0a 09 09 09 3c 2f 6d 61 69 6e 43 61   res>....</mainCa
// 0210   70 73 3e 0a 09 09 09 3c 73 75 62 43 61 70 73 20   ps>....<subCaps 
// 0220   73 75 70 45 6e 63 74 3d 22 68 32 36 34 22 20 62   supEnct="h264" b
// 0230   69 74 54 79 70 65 3d 22 43 42 52 2c 56 42 52 22   itType="CBR,VBR"
// 0240   3e 0a 09 09 09 09 3c 72 65 73 20 66 70 73 3d 22   >.....<res fps="
// 0250   31 30 22 3e 31 39 32 30 78 31 30 38 30 3c 2f 72   10">1920x1080</r
// 0260   65 73 3e 0a 09 09 09 09 3c 72 65 73 20 66 70 73   es>.....<res fps
// 0270   3d 22 31 30 22 3e 31 32 38 30 78 37 32 30 3c 2f   ="10">1280x720</
// 0280   72 65 73 3e 0a 09 09 09 09 3c 72 65 73 20 66 70   res>.....<res fp
// 0290   73 3d 22 31 30 22 3e 37 30 34 78 34 38 30 3c 2f   s="10">704x480</
// 02a0   72 65 73 3e 0a 09 09 09 09 3c 72 65 73 20 66 70   res>.....<res fp
// 02b0   73 3d 22 31 30 22 3e 33 35 32 78 32 34 30 3c 2f   s="10">352x240</
// 02c0   72 65 73 3e 0a 09 09 09 3c 2f 73 75 62 43 61 70   res>....</subCap
// 02d0   73 3e 0a 09 09 09 3c 73 75 62 20 72 65 73 3d 22   s>....<sub res="
// 02e0   31 39 32 30 78 31 30 38 30 22 20 66 70 73 3d 22   1920x1080" fps="
// 02f0   31 30 22 20 51 6f 49 3d 22 31 30 32 34 22 20 65   10" QoI="1024" e
// 0300   6e 63 74 3d 22 68 32 36 34 22 20 62 69 74 54 79   nct="h264" bitTy
// 0310   70 65 3d 22 56 42 52 22 20 6c 65 76 65 6c 3d 22   pe="VBR" level="
// 0320   68 69 67 68 65 72 22 20 47 4f 50 3d 22 32 30 22   higher" GOP="20"
// 0330   2f 3e 0a 09 09 09 3c 6d 6e 20 72 65 73 3d 22 32   />....<mn res="2
// 0340   35 36 30 78 31 39 33 36 22 20 66 70 73 3d 22 31   560x1936" fps="1
// 0350   30 22 20 51 6f 49 3d 22 35 31 32 30 22 20 62 69   0" QoI="5120" bi
// 0360   74 54 79 70 65 3d 22 56 42 52 22 20 6c 65 76 65   tType="VBR" leve
// 0370   6c 3d 22 68 69 67 68 65 72 22 20 61 75 64 69 6f   l="higher" audio
// 0380   3d 22 4f 4e 22 20 74 79 70 65 3d 22 6d 61 69 6e   ="ON" type="main
// 0390   22 2f 3e 0a 09 09 09 3c 6d 65 20 72 65 73 3d 22   "/>....<me res="
// 03a0   32 35 36 30 78 31 39 33 36 22 20 66 70 73 3d 22   2560x1936" fps="
// 03b0   31 30 22 20 51 6f 49 3d 22 35 31 32 30 22 20 62   10" QoI="5120" b
// 03c0   69 74 54 79 70 65 3d 22 56 42 52 22 20 6c 65 76   itType="VBR" lev
// 03d0   65 6c 3d 22 68 69 67 68 65 72 22 20 61 75 64 69   el="higher" audi
// 03e0   6f 3d 22 4f 4e 22 20 74 79 70 65 3d 22 6d 61 69   o="ON" type="mai
// 03f0   6e 22 2f 3e 0a 09 09 09 3c 61 6e 20 72 65 73 3d   n"/>....<an res=
// 0400   22 32 35 36 30 78 31 39 33 36 22 20 66 70 73 3d   "2560x1936" fps=
// 0410   22 31 30 22 20 51 6f 49 3d 22 35 31 32 30 22 20   "10" QoI="5120" 
// 0420   62 69 74 54 79 70 65 3d 22 56 42 52 22 20 6c 65   bitType="VBR" le
// 0430   76 65 6c 3d 22 68 69 67 68 65 72 22 20 61 75 64   vel="higher" aud
// 0440   69 6f 3d 22 4f 4e 22 20 74 79 70 65 3d 22 6d 61   io="ON" type="ma
// 0450   69 6e 22 2f 3e 0a 09 09 09 3c 61 65 20 72 65 73   in"/>....<ae res
// 0460   3d 22 32 35 36 30 78 31 39 33 36 22 20 66 70 73   ="2560x1936" fps
// 0470   3d 22 31 30 22 20 51 6f 49 3d 22 35 31 32 30 22   ="10" QoI="5120"
// 0480   20 62 69 74 54 79 70 65 3d 22 56 42 52 22 20 6c    bitType="VBR" l
// 0490   65 76 65 6c 3d 22 68 69 67 68 65 72 22 20 61 75   evel="higher" au
// 04a0   64 69 6f 3d 22 4f 4e 22 20 74 79 70 65 3d 22 6d   dio="ON" type="m
// 04b0   61 69 6e 22 2f 3e 0a 09 09 09 3c 72 65 63 20 70   ain"/>....<rec p
// 04c0   65 72 3d 22 35 22 20 70 6f 73 74 3d 22 31 30 22   er="5" post="10"
// 04d0   2f 3e 0a 09 09 09 3c 66 74 70 52 65 63 20 74 79   />....<ftpRec ty
// 04e0   70 65 3d 22 22 20 61 75 64 69 6f 3d 22 22 2f 3e   pe="" audio=""/>
// 04f0   0a 09 09 09 3c 6d 61 69 6e 53 74 72 65 61 6d 51   ....<mainStreamQ
// 0500   75 61 6c 69 74 79 4e 6f 74 65 3e 33 32 2c 36 34   ualityNote>32,64
// 0510   2c 31 32 38                                       ,128
// 0000   45 e0 05 14 00 00 40 00 32 11 6e df 2d 89 71 45   E.....@.2.n.-.qE
// 0010   c0 a8 74 a3 e4 54 c3 22 05 00 01 76 01 01 01 00   ..t..T."...v....
// 0020   b1 b2 94 05 c5 b2 94 05 c0 b2 94 05 c6 b2 94 05   ................
// 0030   c1 b2 94 05 2c 32 35 36 2c 35 31 32 2c 37 36 38   ....,256,512,768
// 0040   2c 31 30 32 34 2c 31 35 33 36 2c 32 30 34 38 2c   ,1024,1536,2048,
// 0050   33 30 37 32 2c 34 30 39 36 2c 35 31 32 30 2c 36   3072,4096,5120,6
// 0060   31 34 34 2c 38 31 39 32 2c 31 30 32 34 30 3c 2f   144,8192,10240</
// 0070   6d 61 69 6e 53 74 72 65 61 6d 51 75 61 6c 69 74   mainStreamQualit
// 0080   79 4e 6f 74 65 3e 0a 09 09 09 3c 73 75 62 53 74   yNote>....<subSt
// 0090   72 65 61 6d 51 75 61 6c 69 74 79 4e 6f 74 65 3e   reamQualityNote>
// 00a0   33 32 2c 36 34 2c 31 32 38 2c 32 35 36 2c 33 38   32,64,128,256,38
// 00b0   34 2c 35 31 32 2c 37 36 38 2c 31 30 32 34 3c 2f   4,512,768,1024</
// 00c0   73 75 62 53 74 72 65 61 6d 51 75 61 6c 69 74 79   subStreamQuality
// 00d0   4e 6f 74 65 3e 0a 09 09 09 3c 70 72 65 52 65 63   Note>....<preRec
// 00e0   6f 72 64 54 69 6d 65 4e 6f 74 65 3e 30 2c 33 2c   ordTimeNote>0,3,
// 00f0   35 3c 2f 70 72 65 52 65 63 6f 72 64 54 69 6d 65   5</preRecordTime
// 0100   4e 6f 74 65 3e 0a 09 09 09 3c 64 65 6c 61 79 65   Note>....<delaye
// 0110   64 52 65 63 6f 72 64 54 69 6d 65 4e 6f 74 65 3e   dRecordTimeNote>
// 0120   30 2c 35 2c 31 30 2c 33 30 2c 36 30 2c 31 32 30   0,5,10,30,60,120
// 0130   2c 33 30 30 2c 36 30 30 3c 2f 64 65 6c 61 79 65   ,300,600</delaye
// 0140   64 52 65 63 6f 72 64 54 69 6d 65 4e 6f 74 65 3e   dRecordTimeNote>
// 0150   0a 09 09 3c 2f 69 74 65 6d 3e 0a 09 3c 2f 63 6f   ...</item>..</co
// 0160   6e 74 65 6e 74 3e 0a 3c 2f 72 65 73 70 6f 6e 73   ntent>.</respons
// 0170   65 3e 0a 31 31 31 31 4d 06 00 00 06 00 00 00 01   e>.1111M........
// 0180   00 01 00 00 00 00 00 3d 06 00 00 53 48 46 4c 03   .......=...SHFL.
// 0190   01 02 01 06 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 01a0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 71   ...............q
// 01b0   cb b7 1e 00 00 00 00 00 0c 00 00 ed 05 00 00 a4   ................
// 01c0   36 e0 ca fa 0d d9 01 ae 36 e0 ca fa 0d d9 01 00   6.......6.......
// 01d0   00 00 00 48 32 36 34 60 01 f0 00 00 00 00 01 67   ...H264`.......g
// 01e0   64 00 14 ad 84 01 0c 20 08 61 00 43 08 02 18 40   d...... .a.C...@
// 01f0   10 c2 00 84 3b 50 b0 fc 80 00 00 00 01 68 ee 3c   ....;P.......h.<
// 0200   b0 00 00 00 01 06 e5 01 5a 80 00 00 00 01 65 b8   ........Z.....e.
// 0210   00 00 06 b4 c0 18 7f fd 95 87 75 dc f4 2d 7e a2   ..........u..-~.
// 0220   f0 5e b5 73 06 4d 5b 73 eb 3d 9d a3 47 e1 ad 32   .^.s.M[s.=..G..2
// 0230   64 fc b4 2c fb 4e bc 62 ce 51 29 cb ed ee 03 bf   d..,.N.b.Q).....
// 0240   a9 b3 84 3f fc 88 79 f8 b8 0d f4 ec 73 f5 de 3b   ...?..y.....s..;
// 0250   20 73 7b 1e 7d b2 ee 2a e2 eb ec 4e 6f 3c ab d4    s{.}..*...No<..
// 0260   5c dd bf 73 5b 66 45 ff 28 3f 9b 1b 1f e5 27 54   \..s[fE.(?....'T
// 0270   e4 b8 ea 9c 13 c6 f4 36 f3 7f 16 35 27 78 e0 24   .......6...5'x.$
// 0280   b4 2c d4 92 41 4a 29 86 51 d6 1b 47 d5 87 46 ff   .,..AJ).Q..G..F.
// 0290   bc 47 0b 72 7a 4f 63 32 18 48 d0 48 17 6d 6c 19   .G.rzOc2.H.H.ml.
// 02a0   59 28 ac 1d 79 d0 db 8b 6f e7 74 90 f6 5a 3b ca   Y(..y...o.t..Z;.
// 02b0   25 05 bd a9 53 7e b2 17 59 cc 95 cc 32 9d 4b e7   %...S~..Y...2.K.
// 02c0   a8 cb 59 a4 74 0d 6a 57 5b 1a c8 d6 e4 d6 d6 91   ..Y.t.jW[.......
// 02d0   15 91 18 fe 2b df be 8a 0c fe 66 09 ee 71 ba 82   ....+.....f..q..
// 02e0   66 1c 90 cd e2 71 3d 24 98 a4 2d f2 79 da bb 43   f....q=$..-.y..C
// 02f0   58 c1 a6 ab f3 43 a7 8e b0 1b a1 6d af 5b ba c6   X....C.....m.[..
// 0300   b3 0e 49 23 9f 1b f4 de 21 00 3b 32 66 75 a8 ee   ..I#....!.;2fu..
// 0310   53 ce 09 4a 4b 78 4f 2e 75 ea 9b bb a9 1c e7 4c   S..JKxO.u......L
// 0320   80 f5 8e 1f ac e2 d5 15 77 29 24 fa 6a f2 63 92   ........w)$.j.c.
// 0330   56 7d 03 51 97 a8 01 3e ef 2d 03 06 3d 07 48 56   V}.Q...>.-..=.HV
// 0340   68 dd e4 09 a3 90 f4 d3 c4 ce 3a 06 1e f1 ff 1b   h.........:.....
// 0350   5b 1c bd 40 d5 9c f3 5d 3e db d9 f2 2a bd fe 15   [..@...]>...*...
// 0360   1a a7 8a 29 a6 b5 00 e3 0a e0 78 ad 35 dc 66 5a   ...)......x.5.fZ
// 0370   4e b1 fa 2b 7b 64 66 25 a4 87 8a 24 8f fd 0f 5c   N..+{df%...$...\
// 0380   74 a5 95 fa d5 03 5b a1 a0 7a b5 b8 4e 7a a2 79   t.....[..z..Nz.y
// 0390   fc e2 8f ce 9e 69 9d 99 be d8 d1 d4 d5 f4 70 a2   .....i........p.
// 03a0   d0 91 16 f1 1c d7 97 d6 c2 6f 1c a8 f1 79 20 66   .........o...y f
// 03b0   2e 7d 11 96 54 0c 47 f5 73 8b dc a1 33 b9 cc 2b   .}..T.G.s...3..+
// 03c0   1b 2a e0 dc 44 e3 ca 97 87 f2 ae 15 ac 1c 84 8d   .*..D...........
// 03d0   71 d7 df a1 ea 58 3a ac fe e3 e3 f6 5e 3e b2 50   q....X:.....^>.P
// 03e0   17 c7 bd eb 1f ec 2f d4 29 4d c9 a1 3c b0 f9 c6   ....../.)M..<...
// 03f0   1d 73 21 f4 15 14 5f 61 b6 73 5b b0 bd 4e ac 4b   .s!..._a.s[..N.K
// 0400   ff ec 00 18 1b 16 c3 06 fb 41 d1 36 24 07 f9 aa   .........A.6$...
// 0410   42 74 07 5d 3c 85 1a 3a 0e fe 6b 37 4f 3a 02 3c   Bt.]<..:..k7O:.<
// 0420   5e a3 13 a8 47 b4 f9 ba 80 a7 49 90 39 53 df de   ^...G.....I.9S..
// 0430   02 9f c8 cb 1b 48 c9 45 16 ef 13 68 3d 2a 74 87   .....H.E...h=*t.
// 0440   78 db fa a0 fe 9f cf 05 ab 3e 48 5f cc 89 cc 4e   x........>H_...N
// 0450   62 f9 3b 38 72 8e cf 55 8d 79 54 8f 84 02 88 c5   b.;8r..U.yT.....
// 0460   6a 63 6e db ce 17 63 58 2e 66 d0 67 41 4a 45 4a   jcn...cX.f.gAJEJ
// 0470   ee 1c 3e ba f5 84 8c 97 e6 ea 33 a1 fe 72 7e 6c   ..>.......3..r~l
// 0480   60 b6 62 2a 9e 90 c5 ce 3e 26 e7 97 f8 40 44 82   `.b*....>&...@D.
// 0490   b0 60 8d e9 90 d0 7d bc d8 61 60 79 4c 2c 64 c2   .`....}..a`yL,d.
// 04a0   ff 0a c6 0b cd 65 e2 b2 b4 f3 70 fa 0c 3c 00 c4   .....e....p..<..
// 04b0   04 ea 21 92 80 60 58 a8 24 13 65 d2 d3 e7 25 c3   ..!..`X.$.e...%.
// 04c0   d2 a5 3d dd 1b f5 f7 7d f4 1a e9 5e 34 9f c6 17   ..=....}...^4...
// 04d0   ee 2f 95 f4 b3 52 f8 ba d7 39 53 5e 11 17 39 bf   ./...R...9S^..9.
// 04e0   8d bd 68 ff b7 5d 70 3f 2d 3b 74 55 a0 80 bf fc   ..h..]p?-;tU....
// 04f0   ab 17 2d 99 19 eb e5 b5 52 62 2b 74 ce b6 77 e6   ..-.....Rb+t..w.
// 0500   79 8c b3 e9 87 12 16 cd 73 fa 8d d4 72 b9 a0 c4   y.......s...r...
// 0510   f6 58 c0 a7                                       .X..

// HTTP/1.1 200 OK
// Content-type: text/xml
// Content-Length: 1427
// Connection: close
// Data: YWRtaW46Um9tYW45NDc3ODAz

// <?xml version="1.0" encoding="UTF-8"?>
// <response version="1.0" cmdId="" cmdUrl="queryNodeEncodeInfo">
// 	<status>success</status>
// 	<content type="list" total="1">
// 		<item id="{00000005-0000-0000-0000-000000000000}">
// 			<name>ÐÐ°Ð¼ÐµÑÐ°5</name>
// 			<mainCaps supEnct="h264" bitType="CBR,VBR">
// 				<res fps="10">2560x1936</res>
// 			</mainCaps>
// 			<subCaps supEnct="h264" bitType="CBR,VBR">
// 				<res fps="10">1920x1080</res>
// 				<res fps="10">1280x720</res>
// 				<res fps="10">704x480</res>
// 				<res fps="10">352x240</res>
// 			</subCaps>
// 			<sub res="1920x1080" fps="10" QoI="1024" enct="h264" bitType="VBR" level="higher" GOP="20"/>
// 			<mn res="2560x1936" fps="10" QoI="5120" bitType="VBR" level="higher" audio="ON" type="main"/>
// 			<me res="2560x1936" fps="10" QoI="5120" bitType="VBR" level="higher" audio="ON" type="main"/>
// 			<an res="2560x1936" fps="10" QoI="5120" bitType="VBR" level="higher" audio="ON" type="main"/>
// 			<ae res="2560x1936" fps="10" QoI="5120" bitType="VBR" level="higher" audio="ON" type="main"/>
// 			<rec per="5" post="10"/>
// 			<ftpRec type="" audio=""/>
// 			<mainStreamQualityNote>32,64,128,256,512,768,1024,1536,2048,3072,4096,5120,6144,8192,10240</mainStreamQualityNote>
// 			<subStreamQualityNote>32,64,128,256,384,512,768,1024</subStreamQualityNote>
// 			<preRecordTimeNote>0,3,5</preRecordTimeNote>
// 			<delayedRecordTimeNote>0,5,10,30,60,120,300,600</delayedRecordTimeNote>
// 		</item>
// 	</content>
// </response>

// 2809, 2873
// video feed request?
// 0000   01 01 01 00 b1 b2 94 05 c1 b2 94 05 c6 b2 94 05   ................
// 0010   c2 b2 94 05 c7 b2 94 05 31 31 31 31 cc 01 00 00   ........1111....
// 0020   03 00 01 01 06 05 00 00 0f 00 00 00 88 01 00 00   ................
// 0030   ee 82 20 c4 1d c9 45 56 8e e9 bd 3f 65 7e f9 92   .. ...EV...?e~..
// 0040   7d 5d 64 aa 74 2e 4f 53 b7 64 3e 69 90 8f 57 db   }]d.t.OS.d>i..W.
// 0050   05 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0060   02 00 00 00 3c 3f 78 6d 6c 20 76 65 72 73 69 6f   ....<?xml versio
// 0070   6e 3d 27 31 2e 30 27 20 65 6e 63 6f 64 69 6e 67   n='1.0' encoding
// 0080   3d 27 75 74 66 2d 38 27 3f 3e 3c 72 65 71 75 65   ='utf-8'?><reque
// 0090   73 74 20 76 65 72 73 69 6f 6e 3d 27 31 2e 30 27   st version='1.0'
// 00a0   20 73 79 73 74 65 6d 54 79 70 65 3d 27 4e 56 4d    systemType='NVM
// 00b0   53 2d 39 30 30 30 27 20 63 6c 69 65 6e 74 54 79   S-9000' clientTy
// 00c0   70 65 3d 27 53 59 53 27 3e 3c 64 65 73 74 49 64   pe='SYS'><destId
// 00d0   3e 7b 30 30 30 30 30 30 30 35 2d 30 30 30 30 2d   >{00000005-0000-
// 00e0   30 30 30 30 2d 30 30 30 30 2d 30 30 30 30 30 30   0000-0000-000000
// 00f0   30 30 30 30 30 30 7d 3c 2f 64 65 73 74 49 64 3e   000000}</destId>
// 0100   3c 74 61 73 6b 49 64 3e 7b 30 33 33 34 45 43 34   <taskId>{0334EC4
// 0110   44 2d 35 36 41 44 2d 32 46 34 43 2d 38 32 42 36   D-56AD-2F4C-82B6
// 0120   2d 41 35 31 45 30 36 31 31 38 37 33 35 7d 3c 2f   -A51E06118735}</
// 0130   74 61 73 6b 49 64 3e 3c 74 72 61 6e 73 70 6f 72   taskId><transpor
// 0140   74 43 6f 6e 74 65 6e 74 3e 3c 69 74 65 6d 20 69   tContent><item i
// 0150   64 3d 22 7b 30 30 30 30 30 30 30 35 2d 30 30 30   d="{00000005-000
// 0160   30 2d 30 30 30 30 2d 30 30 30 30 2d 30 30 30 30   0-0000-0000-0000
// 0170   30 30 30 30 30 30 30 30 7d 22 20 69 6e 64 65 78   00000000}" index
// 0180   3d 22 30 22 3e 3c 73 75 62 3e 3c 72 65 73 3e 33   ="0"><sub><res>3
// 0190   35 32 78 32 34 30 3c 2f 72 65 73 3e 3c 66 70 73   52x240</res><fps
// 01a0   3e 32 3c 2f 66 70 73 3e 3c 51 6f 49 20 75 69 6e   >2</fps><QoI uin
// 01b0   74 3d 22 4b 62 70 73 22 3e 31 32 38 3c 2f 51 6f   t="Kbps">128</Qo
// 01c0   49 3e 3c 2f 73 75 62 3e 3c 2f 69 74 65 6d 3e 3c   I></sub></item><
// 01d0   2f 74 72 61 6e 73 70 6f 72 74 43 6f 6e 74 65 6e   /transportConten
// 01e0   74 3e 3c 2f 72 65 71 75 65 73 74 3e               t></request>

// <?xml version='1.0' encoding='utf-8'?>
// <request version='1.0' systemType='NVMS-9000' clientType='SYS'>
//         <destId>{00000005-0000-0000-0000-000000000000}</destId>
//         <taskId>{0334EC4D-56AD-2F4C-82B6-A51E06118735}</taskId>
//         <transportContent>
//                 <item id="{00000005-0000-0000-0000-000000000000}" index="0">
//                         <sub>
//                                 <res>352x240</res>
//                                 <fps>2</fps>
//                                 <QoI uint="Kbps">128</QoI>
//                         </sub>
//                 </item>
//         </transportContent>
// </request>
export class VideoFeedRequest extends DVRCmd
{
        constructor(connID, seq, convID, respConvID, data4, taskId, destID)
        {
                super(VideoFeedRequest.CmdID, connID, seq, convID, respConvID, data4);

                // binary part between cmd28 and xml
                const rawBin = '31313131cc01000003000101060500000f00000088010000ee8220c41dc945568ee9bd3f657ef9927d5d64aa742e4f53b7643e69908f57db0500000000000000000000000000000002000000';
                // xml template 
                const xml = `<?xml version='1.0' encoding='utf-8'?><request version='1.0' systemType='NVMS-9000' clientType='SYS'><destId>{${destID}}</destId><taskId>{${taskId}}</taskId><transportContent><item id="{${destID}}" index="0"><sub><res>352x240</res><fps>2</fps><QoI uint="Kbps">128</QoI></sub></item></transportContent></request>`;

                this.payload = Buffer.concat([Buffer.from(rawBin, "hex"), Buffer.from(xml)]);
        }
}


// 2874
// queryNodeEncodeInfo
// 0000   01 01 01 00 b1 b2 94 05 c2 b2 94 05 c6 b2 94 05   ................
// 0010   c3 b2 94 05 c7 b2 94 05 31 31 31 31 1e 02 00 00   ........1111....
// 0020   03 00 00 01 1b 09 00 00 10 00 00 00 0e 02 00 00   ................
// 0030   XX XX XX XX XX XX XX XX XX 00 00 00 00 00 00 00   XXXXXXXX........ // DVR User Name
// 0040   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0050   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0060   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 0070   71 75 65 72 79 4e 6f 64 65 45 6e 63 6f 64 65 49   queryNodeEncodeI
// 0080   6e 66 6f 00 00 00 00 00 00 00 00 00 00 00 00 00   nfo.............
// 0090   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00a0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................
// 00b0   3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 27 31   <?xml version='1
// 00c0   2e 30 27 20 65 6e 63 6f 64 69 6e 67 3d 27 75 74   .0' encoding='ut
// 00d0   66 2d 38 27 3f 3e 3c 72 65 71 75 65 73 74 20 76   f-8'?><request v
// 00e0   65 72 73 69 6f 6e 3d 27 31 2e 30 27 20 73 79 73   ersion='1.0' sys
// 00f0   74 65 6d 54 79 70 65 3d 27 4e 56 4d 53 2d 39 30   temType='NVMS-90
// 0100   30 30 27 20 63 6c 69 65 6e 74 54 79 70 65 3d 27   00' clientType='
// 0110   4d 4f 42 49 4c 45 27 20 75 72 6c 3d 27 71 75 65   MOBILE' url='que
// 0120   72 79 4e 6f 64 65 45 6e 63 6f 64 65 49 6e 66 6f   ryNodeEncodeInfo
// 0130   27 3e 3c 63 6f 6e 64 69 74 69 6f 6e 3e 3c 63 68   '><condition><ch
// 0140   6c 49 64 3e 7b 30 30 30 30 30 30 30 33 2d 30 30   lId>{00000003-00
// 0150   30 30 2d 30 30 30 30 2d 30 30 30 30 2d 30 30 30   00-0000-0000-000
// 0160   30 30 30 30 30 30 30 30 30 7d 3c 2f 63 68 6c 49   000000000}</chlI
// 0170   64 3e 3c 2f 63 6f 6e 64 69 74 69 6f 6e 3e 3c 72   d></condition><r
// 0180   65 71 75 69 72 65 46 69 65 6c 64 3e 3c 6d 61 69   equireField><mai
// 0190   6e 43 61 70 73 2f 3e 3c 73 75 62 43 61 70 73 2f   nCaps/><subCaps/
// 01a0   3e 3c 73 75 62 2f 3e 3c 6d 6e 2f 3e 3c 6d 65 2f   ><sub/><mn/><me/
// 01b0   3e 3c 61 6e 2f 3e 3c 61 65 2f 3e 3c 72 65 63 2f   ><an/><ae/><rec/
// 01c0   3e 3c 66 74 70 52 65 63 2f 3e 3c 6d 61 69 6e 53   ><ftpRec/><mainS
// 01d0   74 72 65 61 6d 51 75 61 6c 69 74 79 4e 6f 74 65   treamQualityNote
// 01e0   2f 3e 3c 73 75 62 53 74 72 65 61 6d 51 75 61 6c   /><subStreamQual
// 01f0   69 74 79 4e 6f 74 65 2f 3e 3c 70 72 65 52 65 63   ityNote/><preRec
// 0200   6f 72 64 54 69 6d 65 4e 6f 74 65 2f 3e 3c 64 65   ordTimeNote/><de
// 0210   6c 61 79 65 64 52 65 63 6f 72 64 54 69 6d 65 4e   layedRecordTimeN
// 0220   6f 74 65 2f 3e 3c 2f 72 65 71 75 69 72 65 46 69   ote/></requireFi
// 0230   65 6c 64 3e 3c 2f 72 65 71 75 65 73 74 3e         eld></request>
//
// <?xml version='1.0' encoding='utf-8'?>
// 
// <request version='1.0' systemType='NVMS-9000' clientType='MOBILE' url='queryNodeEncodeInfo'>
//         <condition>
//                 <chlId>{00000003-0000-0000-0000-000000000000}</chlId>
//         </condition>
//         <requireField>
//                 <mainCaps/>
//                 <subCaps/>
//                 <sub/>
//                 <mn/>
//                 <me/>
//                 <an/>
//                 <ae/>
//                 <rec/>
//                 <ftpRec/>
//                 <mainStreamQualityNote/>
//                 <subStreamQualityNote/>
//                 <preRecordTimeNote/>
//                 <delayedRecordTimeNote/>
//         </requireField>
// </request>
export class QueryNodeEncodeInfo extends DVRCmd
{
        // Raw request without 28 bytes of cmd28 header
        static get Raw() { return `1e020000030000011b090000100000000e020000${DvrUserName}000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000071756572794e6f6465456e636f6465496e666f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003c3f786d6c2076657273696f6e3d27312e302720656e636f64696e673d277574662d38273f3e3c726571756573742076657273696f6e3d27312e30272073797374656d547970653d274e564d532d393030302720636c69656e74547970653d274d4f42494c45272075726c3d2771756572794e6f6465456e636f6465496e666f273e3c636f6e646974696f6e3e3c63686c49643e7b30303030303030332d303030302d303030302d303030302d3030303030303030303030307d3c2f63686c49643e3c2f636f6e646974696f6e3e3c726571756972654669656c643e3c6d61696e436170732f3e3c737562436170732f3e3c7375622f3e3c6d6e2f3e3c6d652f3e3c616e2f3e3c61652f3e3c7265632f3e3c6674705265632f3e3c6d61696e53747265616d5175616c6974794e6f74652f3e3c73756253747265616d5175616c6974794e6f74652f3e3c7072655265636f726454696d654e6f74652f3e3c64656c617965645265636f726454696d654e6f74652f3e3c2f726571756972654669656c643e3c2f726571756573743e`; }
        static get Tail() { return 0x31313131; }

        constructor(connID, seq, convID, data3, data4)
        {
                super(QueryNodeEncodeInfo.CmdID, connID, seq, convID, data3, data4, QueryNodeEncodeInfo.Tail);
                this.payload = Buffer.from(QueryNodeEncodeInfo.Raw, "hex");
        }

}
