// Unstructured binary payloads
import { Cmd28, deserializeCmd28 } from "./cmd28.js";

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