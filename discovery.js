import udp from "dgram";
import { Ack28, Ack28Cmd, serializeAck28, deserializeAck28 } from './packets/NAT/ack28.js';
import { NATReq, NATRespCmd, serializeNATReq, deserializeNATReq } from './packets/NAT/natReq.js';
import { Bye24, serializeBye24 } from './packets/NAT/bye24.js';
import { serialNumber } from './privateData.js';
import xml2js from "xml2js";

const IP_RESOLUTION_TIMEOUT = 2000;

// // Exchange snapshots:
// /* 1 */ const clientRequest1_28   = "02000100e1b094050000000000000000e1b0940500000000fefe0001";
// /* 2 */ const serverResponce1_28  = "02000100e1b09405e0b0940500000000e1b09405e1b09405fefe0001";
// /* 3 */ const clientRequest2_28   = "02000100e1b09405e0b09405e0b09405e1b09405e2b09405fefe0001";
// /* 4 */ const clientRequest3_143  = "02010100e1b09405e1b09405e0b09405e2b09405e1b09405000100006f0000003c4e61742076657273696f6e3d22302e342e302e31223e3c436d642069643d223130303036223e3c526571756573745365713e313c2f526571756573745365713e3c4465766963654e6f3e4e31323446303341523335423c2f4465766963654e6f3e3c2f436d643e3c2f4e61743e00";
// /* 5 */ const clientRequest4_24   = "02030100e1b09405e1b09405e0b094050000000000000000";

const NATXMLRequest = `<Nat version="0.4.0.1"><Cmd id="10006"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo></Cmd></Nat>`;

export async function discoveryDVR(NATPointHost, NATPointPort, requestID)
{
        return new Promise((resolve, reject) => {
                var client = udp.createSocket('udp4');

                client.on('message', function (msg, info) {

                        // console.log('Received %d bytes from %s:%d', 
                        //         msg.length, info.address, info.port, '\t', msg.toString('hex'));
        
                        if (msg.readUint32LE(0) == Ack28Cmd) {
                                // console.log('Responce 1 received, keep conversation');
                                const ackResponse = deserializeAck28(msg);
                                // console.log('Received ACK responce from %s:%d\t%j', info.address, info.port, ackResponse);

                                // mimicing UDP chat - no clue what Resp1 and 2 mean
                                ackResponse.Resp2 = ackResponse.Resp1;
                                ackResponse.Resp3 = requestID + 1;

                                // send 2nd ack request
                                client.send(Buffer.from(serializeAck28(ackResponse)), NATPointPort, NATPointHost);

                                // send NAT request. Again, the meaninig of 5 ids and 2 datas is unclear
                                let NATRequest = new NATReq(requestID, requestID, requestID, requestID+1, requestID+1, 0x0100, 0x60, NATXMLRequest)
                                client.send(Buffer.from(serializeNATReq(NATRequest)), NATPointPort, NATPointHost);
                        }

                        if (msg.readUint32LE(0) == NATRespCmd) {

                                const natResponce = deserializeNATReq(msg);

                                // console.log(natResponce.XML);

                                // convert XML to JSON
                                xml2js.parseString(natResponce.XML, (err, result) => {
                                        if (err) throw err;

                                        if (result.Nat.Cmd[0].Status == 0)
                                        {
                                                const deviceIP = result.Nat.Cmd[0].DevicePeerIp[0];
                                                const devicePort = result.Nat.Cmd[0].DevicePeerPort[0];

                                                // console.log("%j", result);
                                                console.log('Device IP:', deviceIP);
                                                console.log('Device port:', devicePort);

                                                resolve(deviceIP, devicePort);
                                        }
                                        // // console.log('Retrieved NAT hosts:')
                                        // for (const NATServer of result.NatServerList.Item) {
                                        //         // console.log(' *', NATServer.Addr[0], ':', NATServer.Port[0]);
                                        //         tryObtainPublicIP(NATServer.Addr[0], NATServer.Port[0], requestID);
                                        // }
                                });

                                // send Bye
                                let byeRequest = new Bye24(requestID, requestID-1);
                                client.send(Buffer.from(serializeBye24(byeRequest)), NATPointPort, NATPointHost);

                        }
                });

                // Initiate exchange by Ack
                const ackRequest = new Ack28(requestID);
                client.send(Buffer.from(serializeAck28(ackRequest)), NATPointPort, NATPointHost, function (error) {
                        if (error) {
                                console.log(error);
                                client.close();
                        }
                });

                setTimeout(() => { client.close(); resolve(); }, IP_RESOLUTION_TIMEOUT);
        });
}

