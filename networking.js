// NAT point conversation snapshot analysis: see doc/conversations/NAT conversation 24122022.xlsx
import udp from "dgram";
import { Cmd28 } from './packets/cmd28.js';
import { NATReq } from './packets/NAT/natReq.js';
import { Cmd24 } from './packets/cmd24.js';
import { BinPayload, ChannelRequest, Cmd88, DVRAuth } from "./packets/binPayload.js";
import { serialNumber } from './privateData.js';
import { VideoFeedRequest } from "./packets/binPayload.js";
import { QueryNodeEncodeInfo } from "./packets/binPayload.js";
import xml2js from "xml2js";
import { v4 as uuidv4 } from 'uuid';
import { UDPReceiveMPBuffer, UDPReceiveSPBuffer } from "./UDP/receiver.js";
import { LogSentMessage, LogReceivedMessage } from "./UDP/logger.js";


const NAT_TIMEOUT = 2000;

// Initiate NAT point conversation:
// 1931	8.052920	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100e1b094050000000000000000e1b0940500000000fefe0001
// 1988	8.054486	47.91.72.135	192.168.116.163	UDP	8989 → 12520 Len=28	02000100e1b09405e0b0940500000000e1b09405e1b09405fefe0001
// 1992	8.054577	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100e1b09405e0b09405e0b09405e1b09405e2b09405fefe0001
function startNATConversation(socket, host, port, connectionID)
{
        return new Promise((resolve, reject) => {

                socket.on('message', socketMessageHandler);

                const helloRequest = new Cmd28(Cmd28.Head_NAT, connectionID, 0, 0, connectionID, 0);
                UDPSendCommand(socket, host, port, helloRequest);

                setTimeout(() => { 
                        socket.off('message', socketMessageHandler);
                        reject('startNATConversation connection timeout'); 
                }, NAT_TIMEOUT);

                function socketMessageHandler(msg, info) {
                        if (info.address === host && info.port == port) {
                                LogReceivedMessage(msg, info);
                                // // got Ack responce from NAT point
                                if (msg.readUint32LE(0) == Cmd28.Head_NAT) {
                                        // console.log('Responce 1 received, keep conversation');
                                        let helloResponse = Cmd28.deserialize(msg);
                                        // console.log('Received ACK responce from %s:%d\t%j', info.address, info.port, ackResponse);
                                        // mimicing UDP chat - no clue what Data{x} fields mean
                                        helloResponse.Data2 = helloResponse.Data1;
                                        helloResponse.Data4 += 1;
        
                                        // send 2nd hello request
                                        UDPSendCommand(socket, host, port, helloResponse);
        
                                        socket.off('message', socketMessageHandler);
                                        resolve(helloResponse);
                                }
                        }
                }
        });
}

function NAT10006Request(socket, host, port, conversationID)
{
        // TODO: reuse UDPSendCommandGetResponce here? Not sure...
        const NAT10006XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10006"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo></Cmd></Nat>`;

        return new Promise((resolve, reject) => {

                const socketMessageHandler = function (msg, info) {

                        // got NAT responce
                        if (msg.readUint32LE(0) == NATReq.NATReqCmd) {

                                const natResponce = NATReq.deserialize(msg);

                                // console.log(natResponce.XML);
                                // convert XML to JSON
                                xml2js.parseString(natResponce.XML, (err, result) => {
                                        if (err)
                                                throw err;

                                        // console.log("%j", result);
                                        if (result.Nat.Cmd[0].Status == 0) {
                                                const deviceIP = result.Nat.Cmd[0].DevicePeerIp[0];
                                                const devicePort = parseInt(result.Nat.Cmd[0].DevicePeerPort[0]);

                                                // console.log('Device IP:', deviceIP);
                                                // console.log('Device port:', devicePort);
                                                socket.off('message', socketMessageHandler);
                                                resolve({ host: deviceIP, port: devicePort });
                                        }
                                });
                        }
                };

                socket.on('message', socketMessageHandler);

                // send NAT request. Again, the meaninig of 5 ids and 2 datas is unclear
                const NATRequest = new NATReq(conversationID, conversationID, conversationID, 
                        conversationID+1, conversationID+1, NAT10006XMLRequest);
                UDPSendCommand(socket, host, port, NATRequest);

                setTimeout(() => {
                        socket.off('message', socketMessageHandler);
                        reject('NAT10006Request connection timeout')
                }, NAT_TIMEOUT);
        });
}

function NAT10102Request(socket, host, port, prevCmd)
{
        // TODO: reuse UDPSendCommandGetResponce here?
        const NAT10002XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10002"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo><RequestPeerNat>0</RequestPeerNat><P2PVersion>1.0</P2PVersion><ConnectionId>${prevCmd.ConnectionID}</ConnectionId></Cmd></Nat>`

        return new Promise((resolve, reject) => {

                function socketMessageHandler(msg, info) 
                {
                        // got NAT responce
                        if (msg.readUint32LE(0) == NATReq.NATReqCmd) 
                        {
                                LogReceivedMessage(msg, info);
                                socket.off('message', socketMessageHandler);
                                resolve(prevCmd.ConnectionID);
                        }
                };

                socket.on('message', socketMessageHandler);

                // send NAT request. Again, the meaninig of 5 ids and 2 datas is unclear
                const NATRequest = new NATReq(prevCmd.ConnectionID, prevCmd.Data1 + 1, prevCmd.Data2, 
                        prevCmd.Data4, prevCmd.Data3, 
                        NAT10002XMLRequest);
                UDPSendCommand(socket, host, port, NATRequest);

                setTimeout(() => {
                        socket.off('message', socketMessageHandler);
                        reject('NAT10102Request connection timeout');
                }, NAT_TIMEOUT);
        });
}

// send Acknowledge command
function ack(socket, host, port, conversationID, byeCommand)
{
        const byeRequest = new Cmd24(byeCommand, conversationID, conversationID-1);
        UDPSendCommand(socket, host, port, byeRequest);
}

/**
 * Send command, await for the responce, validate responce. Repeat several times 
 * before give up. 
 * @param {*} socket UDP socket to communicate
 * @param {*} host server address
 * @param {*} port server port
 * @param {*} command command to send
 * @param {*} responce_validation_rule function to validate responce
 * @returns Promise resolved if valid response obtained, promise rejected otherwise.
 */
function UDPSendCommandGetResponce(socket, host, port, command, responce_validation_rule)
{
        const COMMAND_RESPONCE_TIMEOUT = 1000;
        const SEND_REPEATS_BEFORE_GIVEUP = 3; 

        return new Promise((resolve, reject) => {

                function HandleResponse(msg, info) 
                {
                        LogReceivedMessage(msg, info);

                        if (responce_validation_rule(msg)) 
                        {
                                socket.off('message', HandleResponse);
                                resolve(msg);
                        }
                }

                socket.on('message', HandleResponse);

                SendCommand(SEND_REPEATS_BEFORE_GIVEUP);

                function SendCommand(repeatCounter) 
                {
                        if (!repeatCounter) 
                        {
                                socket.off('message', HandleResponse);
                                reject('Responce timeout after: ' + command.serialize().toString("hex"));
                        } else {
                                UDPSendCommand(socket, host, port, command);
                                setTimeout(() => { SendCommand(--repeatCounter); }, COMMAND_RESPONCE_TIMEOUT);
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
export function UDPSendCommand(socket, host, port, command)
{
        const msg = Buffer.from(command.serialize());
        socket.send(msg, port, host);
        LogSentMessage(msg, host, port);
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
                .then(() => ack(NATSocket, NATHost, NATPort, NATConversationID, Cmd24_020201))
                .then(() => ack(NATSocket, NATHost, NATPort, NATConversationID, Cmd24_020301))


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
        const auth_2 = new DVRAuth(connID, connID, connID, connID + 1, connID + 1);

        // -- step 3 => Channel request
        const channelRequestConvID = connID + 4;
        let channelRequestSeq = connID + 4;
        const taskId = uuidv4();
        const destId = '00000001-0000-0000-0000-000000000000';
        /* 2670 */
        const willRequest_3_1 = new Cmd24(
                Cmd24.Head_DVR, connID, ++channelRequestSeq, channelRequestConvID, 0, channelRequestConvID + 1);
        /* 2673 */
        const channelRequest_3_2 = new ChannelRequest(
                connID, ++channelRequestSeq, channelRequestConvID, channelRequestSeq + 1, channelRequestSeq + 2,
                0, taskId, destId);

        // -- chunk 4 => try to request video feed
        const videoFeedConvID = connID + 16;
        let videoFeedRequestSeq = connID + 1;
        const videoFeedResponseConvID = connID + 32;
        /* 2868 */ 
        const willRequest_4_1 = new Cmd24(Cmd24.Head_DVR, connID, ++videoFeedRequestSeq, videoFeedConvID, 0, videoFeedConvID);
        /* 2873 */
        const videoFeedRequest_4_2 = new VideoFeedRequest(
                connID, ++videoFeedRequestSeq, videoFeedConvID, videoFeedResponseConvID, videoFeedConvID,
                taskId, destId);
        /* 2874 */
        const qnei_4_3 = new QueryNodeEncodeInfo(connID, ++videoFeedRequestSeq, videoFeedConvID, videoFeedResponseConvID + 1, videoFeedConvID);

        console.group('NAT conversation');

        return new Promise((resolve, reject) => {
                /// should be another socket that will stay open to continue DVR conversation
                startNATConversation(DVRSocket, NATHost, NATPort, connID)
                .then((prevCmd) => NAT10102Request(DVRSocket, NATHost, NATPort, prevCmd))
                .then(() => ack(DVRSocket, NATHost, NATPort, connID, Cmd24.Head_NAT))
                .then(() => console.groupEnd())
                .then(() => console.group('DVR conversation'))
                 
                // --> chunk 1
                .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_1, (msg) => cmd28(msg)))
                .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_2, (msg) => cmd28(msg)))
                .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_3, (msg) => cmd28(msg)))

                // -- Should receive Cmd88
                .then(() => UDPReceiveSPBuffer(DVRSocket, DVRHost, DVRPort))

                // --> chunk 2, send DRAuth and get ack from DVR
                // .then(() => UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, auth_2, (msg) => headIs(msg, BinPayload.Head)))
                // --> receive DRAuth responce and send ack to DVR
                // .then((res) => UDPReceiveMPBuffer(DVRSocket, DVRHost, DVRPort) )

                // // --> step 3, ChannelRequest
                // .then(() => {
                //         UDPSendCommand(DVRSocket, DVRHost, DVRPort, willRequest_3_1);
                //         return UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, channelRequest_3_2, (msg) => headIs(msg, 0x00010201))
                // })
                // // --> step 4, try to request video feed
                // .then(() => {
                //         UDPSendCommand(DVRSocket, DVRHost, DVRPort, willRequest_4_1);
                //         UDPSendCommand(DVRSocket, DVRHost, DVRPort, videoFeedRequest_4_2);
                //         return UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, qnei_4_3, (msg) => seqAbove(msg, connID + 32));
                // })

                .then(() => resolve() )
                .finally(() => DVRSocket.close() )
        });
}

const headIs = (msg, x) => msg.readUint32LE(0) == x;
const cmd28 = (msg) => headIs(msg, Cmd28.Head_DVR) || headIs(msg, Cmd28.Head_NAT);
const seqAbove = (msg, seq) => msg.readUint32LE(8) > seq;

