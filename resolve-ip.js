import udp from "dgram";
import { Ack28, Ack28Cmd, serializeAck28, deserializeAck28 } from './packets/NAT/ack28.js';
import { NATReq, serializeNATReq } from './packets/NAT/natReq.js';
import { serialNumber } from './privateData.js';


const IP_RESOLUTION_TIMEOUT = 2000;

// Exchange snapshots:
/* 1 */ const clientRequest1_28   = "02000100e1b094050000000000000000e1b0940500000000fefe0001";
/* 2 */ const serverResponce1_28  = "02000100e1b09405e0b0940500000000e1b09405e1b09405fefe0001";
/* 3 */ const clientRequest2_28   = "02000100e1b09405e0b09405e0b09405e1b09405e2b09405fefe0001";
/* 4 */ const clientRequest3_143  = "02010100e1b09405e1b09405e0b09405e2b09405e1b09405000100006f0000003c4e61742076657273696f6e3d22302e342e302e31223e3c436d642069643d223130303036223e3c526571756573745365713e313c2f526571756573745365713e3c4465766963654e6f3e4e31323446303341523335423c2f4465766963654e6f3e3c2f436d643e3c2f4e61743e00";
/* 5 */ const clientRequest4_24   = "02030100e1b09405e1b09405e0b094050000000000000000";

const NATXMLRequest = `<Nat version="0.4.0.1"><Cmd id="10006"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo></Cmd></Nat>`;

export async function tryObtainPublicIP(host, port, requestID)
{
        return new Promise((resolve, reject) => {
                var client = udp.createSocket('udp4');

                client.on('message', function (msg, info) {
                        // var received = msg.toString('hex');
                        console.log('Received %d bytes from %s:%d', 
                                msg.length, info.address, info.port, '\t', msg.toString('hex'));
        
                        if (msg.readUint32LE(0) == Ack28Cmd) {
                                // console.log('Responce 1 received, keep conversation');
                                const ackResponse = deserializeAck28(msg);
                                // console.log('Received ACK responce from %s:%d\t%j', info.address, info.port, ackResponse);

                                // mimicing UDP chat - no clue what Resp1 and 2 mean
                                ackResponse.Resp2 = ackResponse.Resp1;
                                ackResponse.Resp3 = requestID + 1;

                                // send 2nd ack request
                                client.send(Buffer.from(serializeAck28(ackResponse)), port, host);

                                // send NAT request
                                let NATRequest = new NATReq(requestID, requestID, requestID, requestID+1, requestID+1, 0x0100, 0x60, NATXMLRequest)
                                client.send(Buffer.from(serializeNATReq(NATRequest)), port, host);
                                
                                // client.send(Buffer.from(clientRequest2_28, "hex"), port, host);
                                // client.send(Buffer.from(clientRequest3_143, "hex"), port, host);
                                // client.send(Buffer.from(clientRequest4_24, "hex"), port, host);

                                // client.send(Buffer.from(clientRequest2_28, "hex"), port, host, function(error) {
                                //         if (error) {
                                //                 console.log(error);
                                //                 client.close();
                                //         } else {
                                //                 // console.log('clientRequest2_28 done');
        
                                //                 client.send(Buffer.from(clientRequest3_143, "hex"), port, host, function(error) {
                                //                         if (error) {
                                //                                 console.log(error);
                                //                                 client.close();
                                //                         } else {
                                //                                 // console.log('clientRequest3_143 done');
        
                                //                                 client.send(Buffer.from(clientRequest4_24, "hex"), port, host, function(error) {
                                //                                         if (error) {
                                //                                                 console.log(error);
                                //                                                 client.close();
                                //                                         } else {
                                //                                                 // console.log('clientRequest4_24 done')
                                //                                         }
                                //                                 });
                                //                         }
                                //                 });
                                //         }
                                // });
        
                        }
                });

                const ackRequest1 = new Ack28(requestID);
                client.send(Buffer.from(serializeAck28(ackRequest1)), port, host, function (error) {
                        if (error) {
                                console.log(error);
                                client.close();
                        }// } else {
                        //         console.log('clientRequest1_28 is sent !');
                        // }
                });

                setTimeout(() => { client.close(); resolve(); }, IP_RESOLUTION_TIMEOUT);
        });
}

