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
import { Transciever } from "./UDP/transciever.js";


const NAT_TIMEOUT = 2000;

// Initiate NAT point conversation:
// 1931	8.052920	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100|e1b09405|00000000|00000000|e1b09405|00000000|fefe0001
// 1988	8.054486	47.91.72.135	192.168.116.163	UDP	8989 → 12520 Len=28	02000100|e1b09405|e0b09405|00000000|e1b09405|e1b09405|fefe0001
// 1992	8.054577	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100|e1b09405|e0b09405|e0b09405|e1b09405|e2b09405|fefe0001
function NATHandshake(socket, host, port, connectionID)
{
        return new Promise((resolve, reject) => {

                const handShake1 = new Cmd28(Cmd28.Head_NAT, connectionID, 0, 0, connectionID, 0);
                // see doc/conversations/DVR conversation 24122022.xlsm packet 1992 and 2319
                const handShake2 = new Cmd28(Cmd28.Head_NAT, connectionID, connectionID-1, connectionID-1, connectionID, connectionID+1);
                Transciever.UDPSendCommandGetResponce(socket, host, port, handShake1, (msg) => cmd28(msg))
                .then(() => Transciever.UDPSendCommand(socket, host, port, handShake2))
                .then(() => resolve())
                .catch(() => reject(`NATHandshake failed with ${host}:${port}`))
        });
}

// Named as 10006 because of Cmd id="10006" in XML!
function NAT10006Request(socket, host, port, connectionID)
{
        const NAT10006XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10006"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo></Cmd></Nat>`;

        return new Promise((resolve, reject) => {
        
                const NATRequest = new NATReq(connectionID, connectionID, connectionID, 
                        connectionID+1, connectionID+1, NAT10006XMLRequest);
                Transciever.UDPSendCommand(socket, host, port, NATRequest);
                Transciever.UDPReceiveSPBuffer(socket, host, port)
                .then((cmd) => {
                        if (cmd.CmdHead == NATReq.NATReqCmd) {
	                        const natResponce = NATReq.deserialize(cmd.serialize());
	                        xml2js.parseString(natResponce.XML, (err, result) => {
	                                if (err) reject(err);

	                                if (result.Nat.Cmd[0].Status == 0) {
	                                        const deviceIP = result.Nat.Cmd[0].DevicePeerIp[0];
	                                        const devicePort = parseInt(result.Nat.Cmd[0].DevicePeerPort[0]);
	
	                                        resolve({ host: deviceIP, port: devicePort });
	                                }
                                        else
                                        {
                                                reject();
                                        }
	                        });
                        }
                        else
                        {
                                reject();
                        }
                })
                .catch(() => reject(`NAT10006Request failed with ${host}:${port}`))
        });
}

// Named as 10006 because of Cmd id="10002" in XML!
function NAT10002Request(socket, host, port, connectionID)
{
        const NAT10002XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10002"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo><RequestPeerNat>0</RequestPeerNat><P2PVersion>1.0</P2PVersion><ConnectionId>${connectionID}</ConnectionId></Cmd></Nat>`

        // send NAT request. See doc/conversations/NAT conversation 24122022.xlsm packet ref 1993
        const NATRequest = new NATReq(connectionID, connectionID, connectionID-1, 
                connectionID+1, connectionID, 
                NAT10002XMLRequest);
        return Transciever.UDPSendCommandGetResponce(socket, host, port, NATRequest, (msg) => headIs(msg, NATReq.NATReqCmd))
}

// send Acknowledge command
function ack(socket, host, port, conversationID, byeCommand)
{
        const byeRequest = new Cmd24(byeCommand, conversationID, conversationID-1);
        Transciever.UDPSendCommand(socket, host, port, byeRequest);
}

// Conversation with NAT point to get DVR IP
export function NATDiscover(NATHost, NATPort)
{
        const NATConversationID = new Date().valueOf() & 0x7FFFFFFF;

        const NATSocket = udp.createSocket('udp4');

        return new Promise((resolve, reject) => {
                NATHandshake(NATSocket, NATHost, NATPort, NATConversationID)
                // ref: #1993 see doc/conversations/NAT conversation 24122022.xlsm
                .then(() => NAT10006Request(NATSocket, NATHost, NATPort, NATConversationID))
                .then((res) => resolve({ 
                                NAT: { host: NATHost, port: NATPort}, 
                                DVR: { host: res.host, port: res.port }}) 
                )
                // .then(() => ack(NATSocket, NATHost, NATPort, NATConversationID, Cmd24.Head_DVR))
                // .then(() => ack(NATSocket, NATHost, NATPort, NATConversationID, Cmd24.Head_NAT))
                .catch((reason) => reject(reason) )
                .finally(() => {
                        ack(NATSocket, NATHost, NATPort, NATConversationID, Cmd24.Head_NAT);
                        NATSocket.close();
                })
        });
}

function* commandNo(startCommandNo)
{
        let cno = startCommandNo;
        while(true) yield cno++;
}

export function DVRConnect(NATHost, NATPort, DVRHost, DVRPort)
{
        const connID = new Date().valueOf() & 0x7FFFFFFF;

        const clientCmdNo = commandNo(connID-1);

        const DVRSocket = udp.createSocket('udp4');

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

        return new Promise((resolve, reject) => {
                // should be another socket that will stay open to continue DVR conversation (???? review comment)
                console.group('NAT conversation');
                NATHandshake(DVRSocket, NATHost, NATPort, connID)
                .then(() => NAT10002Request(DVRSocket, NATHost, NATPort, connID))
                .then(() => ack(DVRSocket, NATHost, NATPort, connID, Cmd24.Head_NAT))
                .then(() => console.groupEnd())

                .then(() => console.group('DVR conversation'))
                 
                // --> 1. DVR handshake see doc/conversations/DVR conversation 24122022.xlsm 2453-2508
                .then(() => { return new Promise((resolve, reject) => {
                        console.group('Handshake');

                        const cmdNo = clientCmdNo.next().value;
                        const cmd28_1 = new Cmd28(Cmd28.Head_DVR, connID, 0, 0, connID, 0);
                        const cmd28_2 = new Cmd28(Cmd28.Head_DVR, connID, cmdNo, 0, connID, connID);
                        const cmd28_3 = new Cmd28(Cmd28.Head_DVR, connID, cmdNo, connID - 1, connID, connID + 1);

                        Transciever.UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_1, (msg) => cmd28(msg))
                        .then(() => Transciever.UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_2, (msg) => cmd28(msg)))
                        .then(() => Transciever.UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, cmd28_3, (msg) => cmd28(msg)))
                        // -- Receive Cmd88
                        .then(() => Transciever.UDPReceiveSPBuffer(DVRSocket, DVRHost, DVRPort))
                        .then(() => resolve())
                        .finally(() => console.groupEnd())
                })})

                // --> 2. DRAuth
                .then(() => { return new Promise((resolve, reject) => {
                        console.group('DRAuth');
                        const auth_2 = new DVRAuth(connID, clientCmdNo.next().value, connID, connID + 1, connID + 1);

                        Transciever.UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, auth_2, (msg) => cmd24(msg))
                        .then(() => Transciever.UDPReceiveMPBuffer(DVRSocket, DVRHost, DVRPort) )
                        .then(() => resolve())
                        .finally(() => console.groupEnd())
                })})

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
const cmd24 = (msg) => headIs(msg, Cmd24.Head_DVR) || headIs(msg, Cmd24.Head_NAT);
const seqAbove = (msg, seq) => msg.readUint32LE(8) > seq;

