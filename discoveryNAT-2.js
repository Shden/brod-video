// Conversation snapshot analysis: see doc/conversations/NAT conversation 24122022.xlsx
import udp from "dgram";
import { Ack28, Ack28Cmd, serializeAck28, deserializeAck28 } from './packets/NAT/ack28.js';
import { NATReq, NATRespCmd, serializeNATReq, deserializeNATReq } from './packets/NAT/natReq.js';
import { Cmd24, Cmd24_020301, Cmd24_020201, serializeCmd24 } from './packets/NAT/cmd24.js';
import { serialNumber } from './privateData.js';
import xml2js from "xml2js";

const NAT_TIMEOUT = 2000;

// Initiate NAT point conversation:
// 1931	8.052920	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100e1b094050000000000000000e1b0940500000000fefe0001
// 1988	8.054486	47.91.72.135	192.168.116.163	UDP	8989 → 12520 Len=28	02000100e1b09405e0b0940500000000e1b09405e1b09405fefe0001
// 1992	8.054577	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100e1b09405e0b09405e0b09405e1b09405e2b09405fefe0001
function StartConversation(socket, host, port, conversationID)
{
        return new Promise((resolve, reject) => {

                const ackRequest = new Ack28(conversationID);
                
                socket.on('message', function (msg, info) {

                        // console.log('Received %d bytes from %s:%d', 
                        //         msg.length, info.address, info.port, '\t', msg.toString('hex'));

                        // got Ack responce from NAT point
                        if (msg.readUint32LE(0) == Ack28Cmd) {
                                // console.log('Responce 1 received, keep conversation');
                                let ackResponse = deserializeAck28(msg);
                                // console.log('Received ACK responce from %s:%d\t%j', info.address, info.port, ackResponse);

                                // mimicing UDP chat - no clue what Resp1 and 2 mean
                                ackResponse.Resp2 = ackResponse.Resp1;
                                ackResponse.Resp3 = conversationID + 1;

                                // send 2nd ack request
                                socket.send(Buffer.from(serializeAck28(ackResponse)), port, host);

                                resolve();
                        }
                });
                
                socket.send(Buffer.from(serializeAck28(ackRequest)), port, host, function (error) {
                        if (error) {
                                console.log(error);
                                socket.close();
                                reject();
                        }
                });

                setTimeout(() => { reject('StartConversation connection timeout'); }, NAT_TIMEOUT);
        });
}

function NAT10006Request(socket, host, port, conversationID)
{
        const NAT10006XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10006"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo></Cmd></Nat>`;

        return new Promise((resolve, reject) => {

                socket.on('message', function (msg, info) {

                        // got NAT responce
                        if (msg.readUint32LE(0) == NATRespCmd) {

                                const natResponce = deserializeNATReq(msg);

                                // console.log(natResponce.XML);

                                // convert XML to JSON
                                xml2js.parseString(natResponce.XML, (err, result) => {
                                        if (err) throw err;

                                        // console.log("%j", result);

                                        if (result.Nat.Cmd[0].Status == 0)
                                        {
                                                const deviceIP = result.Nat.Cmd[0].DevicePeerIp[0];
                                                const devicePort = result.Nat.Cmd[0].DevicePeerPort[0];

                                                // console.log('Device IP:', deviceIP);
                                                // console.log('Device port:', devicePort);

                                                resolve({ host: deviceIP, port: devicePort});
                                        }
                                });
                        }
                });

                // send NAT request. Again, the meaninig of 5 ids and 2 datas is unclear
                const NATRequest = new NATReq(conversationID, conversationID, conversationID, 
                        conversationID+1, conversationID+1, 0x0100, 0x6f, NAT10006XMLRequest)
                socket.send(Buffer.from(serializeNATReq(NATRequest)), port, host);

                setTimeout(() => reject('NAT10006Request connection timeout'), NAT_TIMEOUT);
        });
}

function NAT10002Request(socket, host, port, conversationID)
{
        const NAT10002XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10002"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo><RequestPeerNat>0</RequestPeerNat><P2PVersion>1.0</P2PVersion><ConnectionId>${conversationID}</ConnectionId></Cmd></Nat>`

        return new Promise((resolve, reject) => {

                socket.on('message', function (msg, info) {

                        // got NAT responce
                        if (msg.readUint32LE(0) == NATRespCmd) {

                                const natResponce = deserializeNATReq(msg);

                                console.log(natResponce.XML);

                                // convert XML to JSON
                                xml2js.parseString(natResponce.XML, (err, result) => {
                                        if (err) throw err;

                                        // console.log("%j", result);

                                        // if (result.Nat.Cmd[0].Status == 0)
                                        // {
                                        //         const deviceIP = result.Nat.Cmd[0].DevicePeerIp[0];
                                        //         const devicePort = result.Nat.Cmd[0].DevicePeerPort[0];

                                        //         // console.log('Device IP:', deviceIP);
                                        //         // console.log('Device port:', devicePort);

                                        //         resolve({ host: deviceIP, port: devicePort});
                                        // }
                                        resolve();
                                });
                        }
                });

                // send NAT request. Again, the meaninig of 5 ids and 2 datas is unclear
                const NATRequest = new NATReq(conversationID, conversationID, conversationID, 
                        conversationID+1, conversationID+1, 0x0100, 0xd2, NAT10002XMLRequest);
                socket.send(Buffer.from(serializeNATReq(NATRequest)), port, host);

                setTimeout(() => reject('NAT10002Request connection timeout'), NAT_TIMEOUT);
        });
}

// wrap up - send Bye command
function ByeNow(socket, host, port, conversationID)
{
        return new Promise((resolve, reject) => {
                const byeRequest = new Cmd24(Cmd24_020301, conversationID, conversationID-1);
                socket.send(Buffer.from(serializeCmd24(byeRequest)), port, host);
                resolve();

                setTimeout(() => reject('ByeNow connection timeout'), NAT_TIMEOUT);
        });
}

function runNATDiscovery(host, port)
{
        const socket = udp.createSocket('udp4');
        const NAT10006ConversationID = Math.floor(Math.random() * 0xFFFFFFFF);
        const NAT10002ConversationID = NAT10006ConversationID + 0x101;

        return new Promise((resolve, reject) => {
                StartConversation(socket, host, port, NAT10006ConversationID)
                .then(() => NAT10006Request(socket, host, port, NAT10006ConversationID))
                .then((res) => console.log(res))
                .then(() => ByeNow(socket, host, port, NAT10006ConversationID))

                .then(() => StartConversation(socket, host, port, NAT10002ConversationID))
                .then(() => NAT10002Request(socket, host, port, NAT10002ConversationID))
                .then(() => ByeNow(socket, host, port, NAT10002ConversationID))

                .catch((reaason) => { /*console.log("Exception:", reaason)*/})
                .finally(() => { socket.close()});
        });
}

export async function NATDiscovery2(host, port)
{
        return await runNATDiscovery(host, port);
}