// NAT point conversation snapshot analysis: see doc/conversations/NAT conversation 24122022.xlsx
import udp from "dgram";
import { Cmd28, deserializeCmd28 } from './packets/cmd28.js';
import { NATReq, NATRespCmd, serializeNATReq, deserializeNATReq } from './packets/NAT/natReq.js';
import { Cmd24 } from './packets/cmd24.js';
import { Cmd88, DVRAuth } from "./packets/binPayload.js";
import { serialNumber } from './privateData.js';
import xml2js from "xml2js";
import { resolve } from "path";

const NAT_TIMEOUT = 2000;

// Initiate NAT point conversation:
// 1931	8.052920	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100e1b094050000000000000000e1b0940500000000fefe0001
// 1988	8.054486	47.91.72.135	192.168.116.163	UDP	8989 → 12520 Len=28	02000100e1b09405e0b0940500000000e1b09405e1b09405fefe0001
// 1992	8.054577	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100e1b09405e0b09405e0b09405e1b09405e2b09405fefe0001
function startNATConversation(socket, host, port, conversationID)
{
        return new Promise((resolve, reject) => {

                const ackRequest = new Cmd28(Cmd28.Head_NAT, conversationID, 0, 0, conversationID);
                
                socket.on('message', function (msg, info) {

                        // console.log('Received %d bytes from %s:%d', 
                        //         msg.length, info.address, info.port, '\t', msg.toString('hex'));

                        // got Ack responce from NAT point
                        if (msg.readUint32LE(0) == Cmd28.Head_NAT) {
                                // console.log('Responce 1 received, keep conversation');
                                let ackResponse = new deserializeCmd28(msg);
                                // console.log('Received ACK responce from %s:%d\t%j', info.address, info.port, ackResponse);

                                // mimicing UDP chat - no clue what Resp1 and 2 mean
                                ackResponse.Resp2 = ackResponse.Resp1;
                                ackResponse.Resp3 = conversationID + 1;

                                // send 2nd ack request
                                socket.send(Buffer.from(ackResponse.serialize()), port, host);

                                resolve();
                        }
                });
                
                socket.send(Buffer.from(ackRequest.serialize()), port, host, function (error) {
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
                                                const devicePort = parseInt(result.Nat.Cmd[0].DevicePeerPort[0]);

                                                // console.log('Device IP:', deviceIP);
                                                // console.log('Device port:', devicePort);

                                                resolve({ host: deviceIP, port: devicePort });
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
        const connectionID = conversationID;
        const NAT10002XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10002"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo><RequestPeerNat>0</RequestPeerNat><P2PVersion>1.0</P2PVersion><ConnectionId>${connectionID}</ConnectionId></Cmd></Nat>`

        return new Promise((resolve, reject) => {

                socket.on('message', function (msg, info) {

                        // got NAT responce
                        if (msg.readUint32LE(0) == NATRespCmd) {

                                // const natResponce = deserializeNATReq(msg);
                                // console.log(natResponce.XML);

                                resolve(connectionID);
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
function byeNow(socket, host, port, conversationID, byeCommand)
{
        return new Promise((resolve, reject) => {
                const byeRequest = new Cmd24(byeCommand, conversationID, conversationID-1);
                socket.send(Buffer.from(byeRequest.serialize()), port, host);
                resolve();

                setTimeout(() => reject('ByeNow connection timeout'), NAT_TIMEOUT);
        });
}

// Conversation with NAT point to get DVR IP
export function NATDiscover(NATHost, NATPort)
{
        const NATConversationID = new Date().valueOf() & 0x7FFFFFFF;

        const NATSocket = udp.createSocket('udp4');

        return new Promise((resolve, reject) => {
                startNATConversation(NATSocket, NATHost, NATPort, NATConversationID)
                .then(() => NAT10006Request(NATSocket, NATHost, NATPort, NATConversationID))
                .then((res) => { 
                        resolve({ 
                                NAT: { host: NATHost, port: NATPort}, 
                                DVR: { host: res.host, port: res.port }}); 
                        })
                .then(() => byeNow(NATSocket, NATHost, NATPort, NATConversationID, Cmd24_020201))
                .then(() => byeNow(NATSocket, NATHost, NATPort, NATConversationID, Cmd24_020301))


                .catch((reason) => { /*console.log("Exception:", reason);*/ reject(reason);})
                .finally(() => { NATSocket.close(); } )
        });
}

export function DVRConnect(NATHost, NATPort, DVRHost, DVRPort)
{
        const connID = new Date().valueOf() & 0x7FFFFFFF;

        const DVRSocket = udp.createSocket('udp4');

        // -- chunk 1 => to get 'Cmd88'
        const cmd28_1 = new Cmd28(Cmd28.Head_DVR, connID, 0, 0, connID, 0);
        const cmd28_2 = new Cmd28(Cmd28.Head_DVR, connID, connID - 1, 0, connID, connID);
        const cmd28_3 = new Cmd28(Cmd28.Head_DVR, connID, connID - 1, connID - 1, connID, connID + 1);

        // -- chunk 2 => to get DVRAuth responce
        const cmd24_2_1 = new Cmd24(Cmd24.Head_DVR, connID, connID - 1, connID, 0, connID + 1);
        const auth_2_2 = new DVRAuth(connID, connID, connID, connID + 1, connID + 1);

        return new Promise((resolve, reject) => {
                /// should be another socket that will stay open to continue DVR conversation
                startNATConversation(DVRSocket, NATHost, NATPort, connID)
                .then(() => NAT10002Request(DVRSocket, NATHost, NATPort, connID))
                .then(() => byeNow(DVRSocket, NATHost, NATPort, connID, Cmd24.Head_NAT))
                 
                // --> chunk 1
                .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_1, (msg) => cmd28(msg)))
                .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_2, (msg) => cmd28(msg)))
                .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_3, (msg) => headIs(msg, Cmd88.Head)))

                // --> chunk 2, getting DRAuth responce
                .then(() => {
                        UDPSendCommand(DVRSocket, DVRHost, DVRPort, cmd24_2_1);
                        return UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, auth_2_2, (msg) => headIs(msg, auth_2_2.CmdHead))
                })

                .then(() => resolve() )
                .finally(() => DVRSocket.close() )
        });
}

const headIs = (msg, x) => msg.readUint32LE(0) == x;
const cmd28 = (msg) => headIs(msg, Cmd28.Head_DVR) || headIs(msg, Cmd28.Head_NAT);

/**
 * Send command, await for the responce, validate responce. Repeat several times 
 * before give up. 
 * @param {*} socket UDP socket to communicate
 * @param {*} host server address
 * @param {*} port server port
 * @param {*} command command to send
 * @param {*} responce_validation_rule function to validate responce
 * @returns Promise resolved if valid resonce obtained, rejected otherwise.
 */
function UDPSendCommandGetResponce(socket, host, port, command, responce_validation_rule)
{
        const COMMAND_RESPONCE_TIMEOUT = 1000;
        const COMMAND_REPEATS_BEFORE_GIVEUP = 3;

        return new Promise((resolve, reject) => {

                let promiseResolved = false;
                socket.on('message', (msg, info) => {

                        if (!promiseResolved)
                        {
                                console.log('[1] Received %d bytes from %s:%d\t%s', 
                                        msg.length, info.address, info.port, msg.toString('hex'));

                                if (responce_validation_rule(msg))
                                {
                                        promiseResolved = true;
                                        resolve(msg);
                                }
                        }
                });

                let socketClosed = false;
                socket.on('close', () => {
                        socketClosed = true;
                });

                action(COMMAND_REPEATS_BEFORE_GIVEUP);

                function action(counter) 
                {

                        if (!counter) reject('Responce timeout after: ' + command.serialize().toString("hex"));

                        if (!socketClosed && !promiseResolved) 
                        {
                                UDPSendCommand(socket, host, port, command);
                                // socket.send(Buffer.from(command.serialize()), port, host);

                                setTimeout(() => { action(--counter); }, COMMAND_RESPONCE_TIMEOUT);
                        }
                }
        });
}

/**
 * Send command and forget.
 * @param {*} socket UDP socket to communicate
 * @param {*} host server address
 * @param {*} port server port
 * @param {*} command command to send
 */
function UDPSendCommand(socket, host, port, command)
{
        socket.send(Buffer.from(command.serialize()), port, host);
}

