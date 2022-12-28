// Unstructured binary payloads
import { Cmd28, deserializeCmd28 } from "./cmd28.js";
import { DvrUserName, DvrUserPass } from "../privateData.js"

export class BinPayload extends Cmd28 {

        constructor(head, id, data1, data2, data3, data4, tail, payload)
        {
                super(head, id, data1, data2, data3, data4, tail);
                this.payload = payload;
        }

        serialize()
        {
                return Buffer.concat([super.serialize(), this.payload]);
        }

}

export function deserializeBinPayload(buffer)
{
        const binPayload = deserializeCmd28(buffer);
        binPayload.payload = Buffer.allocUnsafe(buffer.length-28);
        buffer.copy(binPayload.payload, 0, 28, buffer.length);
        // binPayload.payload = Buffer.from(buffer, 28, buffer.length-1);

        return binPayload;
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
export class DVRAuth extends BinPayload
{
        // Raw request without 28 bytes of cmd28 header
        static get Raw() { return `fc000000030000010101000000000000ec000000030000000000000000000000000000000000000000000000000000000000000000000000${DvrUserName}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000${DvrUserPass}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a79506000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`; }
        static get Head() { return 0x00010101; }
        static get Tail() { return 0x31313131; }

        constructor(id, data1, data2, data3, data4)
        {
                super(DVRAuth.Head, id, data1, data2, data3, data4, DVRAuth.Tail);
                this.payload = Buffer.from(DVRAuth.Raw, "hex");
        }

}