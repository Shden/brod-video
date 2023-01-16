// NAT point conversation snapshot analysis: see doc/conversations/NAT conversation 24122022.xlsx
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
import { autoNATURI, autoNATPort } from "./privateData.js";
import { XMLHttpRequest } from "xmlhttprequest";

const NAT_TIMEOUT = 2000;

/**
 * Call autonat.com service to get list of NAT points. Then poll whole NAT points list
 * to obtain:
 *   - addrsses of NAT point having DVR public IP
 *   - the public IP of DVR
 * @returns promise to complete.
 */
export function GetNATAndDVRAddresses()
{
        return new Promise((resolve, reject) => {

                const xhr = new XMLHttpRequest();
                xhr.open('GET', `http://c2.autonat.com:${autoNATPort}${autoNATURI}`);

                xhr.onload = () => {
                
                        if (xhr.status == 200) {
                                
                                // convert XML to JSON
                                xml2js.parseString(xhr.responseText, (err, xmlObj) => {
                                        if (err) throw err
                
                                        // map addresses and ports to a vector of promises
                                        // first NAT point fulfilled (any!) responce wins
                                        Promise.any(xmlObj.NatServerList.Item.map(NATPoint => 
                                                        NATGetDVRIP(NATPoint.Addr[0], parseInt(NATPoint.Port[0])) 
                                        ))
                                        .then((res) => resolve(res))
                                        .catch((err) => reject(err));
                                });
                
                        } else reject(xhr.status);
                }                
                xhr.send();
        });
}


// 1931	8.052920	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100|e1b09405|00000000|00000000|e1b09405|00000000|fefe0001
// 1988	8.054486	47.91.72.135	192.168.116.163	UDP	8989 → 12520 Len=28	02000100|e1b09405|e0b09405|00000000|e1b09405|e1b09405|fefe0001
// 1992	8.054577	192.168.116.163	47.91.72.135	UDP	12520 → 8989 Len=28	02000100|e1b09405|e0b09405|e0b09405|e1b09405|e2b09405|fefe0001
/**
 * Initiate NAT point conversation:
 * @param {Transciever} transciever 
 * @returns 
 */
function NATHandshake(transciever)
{
        return new Promise((resolve, reject) => {

                const handShake1 = new Cmd28(Cmd28.Head_NAT, 
                        transciever.connectionID, 0, 0, transciever.connectionID, 0);
                // see doc/conversations/DVR conversation 24122022.xlsm packet 1992 and 2319
                const handShake2 = new Cmd28(Cmd28.Head_NAT, 
                        transciever.connectionID, transciever.connectionID - 1, transciever.connectionID - 1, 
                        transciever.connectionID, transciever.connectionID + 1);
                transciever.UDPSendCommandGetResponce(handShake1, (msg) => cmd28(msg))
                .then(() => transciever.UDPSendCommand(handShake2))
                .then(() => resolve())
                .catch((err) => reject(`NATHandshake failed. ${err} with ${transciever.host}:${transciever.port}`))
        });
}

/**
 * NAT point conversation to get DVR public IP address.
 * @param {Transciever} transciever 
 * @returns 
 * 
 * Named as 10006 because of Cmd id="10006" in XML!
 */
function NAT10006Request(transciever)
{
        const NAT10006XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10006"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo></Cmd></Nat>`;

        return new Promise((resolve, reject) => {
        
                const NATRequest = new NATReq(transciever.connectionID, transciever.connectionID, 
                        transciever.connectionID, transciever.connectionID + 1, transciever.connectionID + 1, 
                        NAT10006XMLRequest);
                transciever.UDPSendCommandGetResponce(NATRequest, (msg) => headIs(msg, NATReq.NATReqCmd))
                .then((msg) => {
                        const natResponce = NATReq.deserialize(msg);
                        xml2js.parseString(natResponce.XML, (err, result) => {
                                if (err) reject(err);

                                if (result.Nat.Cmd[0].Status == 0) {
                                        const deviceIP = result.Nat.Cmd[0].DevicePeerIp[0];
                                        const devicePort = parseInt(result.Nat.Cmd[0].DevicePeerPort[0]);

                                        resolve({ host: deviceIP, port: devicePort });
                                }
                                else reject('No IP address available.');
                        });
                })
                .catch((err) => reject(`NAT10006Request error ${err} with ${transciever.host}:${transciever.port}`));
        });
}

/**
 * DVR conversation to register DVR connection ID.
 * @param {Transciever} transciever - NAT transciever
 * @param {Number} DVRconnectionID - connection ID to register for DVR conversation
 * @returns 
 * 
 * Named as 10006 because of Cmd id="10002" in XML!
 */
function NAT10002Request(transciever, DVRconnectionID)
{
        const NAT10002XMLRequest = `<Nat version="0.4.0.1"><Cmd id="10002"><RequestSeq>1</RequestSeq><DeviceNo>${serialNumber}</DeviceNo><RequestPeerNat>0</RequestPeerNat><P2PVersion>1.0</P2PVersion><ConnectionId>${DVRconnectionID}</ConnectionId></Cmd></Nat>`

        return new Promise((resolve, reject) => {
                // send NAT request. See doc/conversations/NAT conversation 24122022.xlsm packet ref 1993
                const NATRequest = new NATReq(transciever.connectionID, transciever.connectionID, 
                        transciever.connectionID - 1, transciever.connectionID + 1, transciever.connectionID, 
                        NAT10002XMLRequest);
                transciever.UDPSendCommandGetResponce(NATRequest, (msg) => headIs(msg, NATReq.NATReqCmd))
                .then((msg) => {
                        const natResponce = NATReq.deserialize(msg);
                        xml2js.parseString(natResponce.XML, (err, result) => {
                                if (err) reject(err);

                                if (result.Nat.Cmd[0].Status == 0) {
                                        resolve(DVRconnectionID);
                                }
                                else reject('Connection ID registration failed.');
                        });
                })
                .catch((err) => reject(`NAT10002Request error ${err} with ${transciever.host}:${transciever.port}`));
        });
}

// send Acknowledge command
// TODO: reuse UDPAcknowledge from Transciever
function ack(transciever, ackCommand)
{
        const ack = new Cmd24(ackCommand, transciever.connectionID, transciever.connectionID-1);
        transciever.UDPSendCommand(ack);
}

/**
 * Conversation with NAT point to get DVR IP.
 * Ref packets ## 1931-2317, see doc/conversations/NAT conversation 24122022.xlsm
 * @param {String} NATHost 
 * @param {Number} NATPort 
 * @returns 
 */
export function NATGetDVRIP(NATHost, NATPort)
{
        const transciever = new Transciever(NATHost, NATPort);

        return new Promise((resolve, reject) => {
                NATHandshake(transciever)
                // ref: #1993 see doc/conversations/NAT conversation 24122022.xlsm
                .then(() => NAT10006Request(transciever))
                .then((res) => resolve({ 
                        NAT: { host: NATHost, port: NATPort}, 
                        DVR: { host: res.host, port: res.port }}))
                .catch((reason) => reject(reason) )
                .finally(() => {
                        ack(transciever, Cmd24.Head_NAT);
                        transciever.close();
                })
        });
}

// SHOULD I COMBINE BOTH? ^V

/**
 * Conversation with NAT point to register DVR connection.
 * Ref packets ## 2193-2511, see doc/conversations/NAT conversation 24122022.xlsm
 * @param {String} NATHost 
 * @param {Number} NATPort 
 * @param {Number} connectionID 
 * @returns 
 */
export function NATRegisterConnection(NATHost, NATPort, connectionID)
{
        const transciever = new Transciever(NATHost, NATPort);

        return new Promise((resolve, reject) => {
                console.group('NATRegisterConnection');
                NATHandshake(transciever)
                .then(() => NAT10002Request(transciever, connectionID))
                .then((res) => resolve(res))
                .catch((reason) => reject(reason) )
                .finally(() => {
                        ack(transciever, Cmd24.Head_NAT);
                        transciever.close();
                        console.groupEnd();
                })
        });
}

// TODO: encapsulate into Transciever
function* commandNo(startCommandNo)
{
        let cno = startCommandNo;
        while(true) yield cno++;
}

export function DVRConnect(NATHost, NATPort, DVRHost, DVRPort)
{
        const NATTransciever = new Transciever(NATHost, NATPort);
        const DVRTransciever = new Transciever(DVRHost, DVRPort);

        const clientCmdNo = commandNo(DVRTransciever.connectionID-1);

        // -- step 3 => Channel request [to refactor]
        const channelRequestConvID = DVRTransciever.connectionID + 4;
        let channelRequestSeq = DVRTransciever.connectionID + 4;
        const taskId = uuidv4();
        const destId = '00000001-0000-0000-0000-000000000000';
        /* 2670 */
        const willRequest_3_1 = new Cmd24(
                Cmd24.Head_DVR, DVRTransciever.connectionID, ++channelRequestSeq, channelRequestConvID, 0, channelRequestConvID + 1);
        /* 2673 */
        const channelRequest_3_2 = new ChannelRequest(
                DVRTransciever.connectionID, ++channelRequestSeq, channelRequestConvID, channelRequestSeq + 1, channelRequestSeq + 2,
                0, taskId, destId);

        // -- chunk 4 => try to request video feed
        const videoFeedConvID = DVRTransciever.connectionID + 16;
        let videoFeedRequestSeq = DVRTransciever.connectionID + 1;
        const videoFeedResponseConvID = DVRTransciever.connectionID + 32;
        /* 2868 */ 
        const willRequest_4_1 = new Cmd24(Cmd24.Head_DVR, DVRTransciever.connectionID, ++videoFeedRequestSeq, videoFeedConvID, 0, videoFeedConvID);
        /* 2873 */
        const videoFeedRequest_4_2 = new VideoFeedRequest(
                DVRTransciever.connectionID, ++videoFeedRequestSeq, videoFeedConvID, videoFeedResponseConvID, videoFeedConvID,
                taskId, destId);
        /* 2874 */
        const qnei_4_3 = new QueryNodeEncodeInfo(DVRTransciever.connectionID, ++videoFeedRequestSeq, videoFeedConvID, videoFeedResponseConvID + 1, videoFeedConvID);

        return new Promise((resolve, reject) => {
                // should be another socket that will stay open to continue DVR conversation (???? review comment)
                console.group('NAT conversation');
                NATHandshake(NATTransciever)
                .then(() => NAT10002Request(NATTransciever))
                .then(() => ack(NATTransciever, Cmd24.Head_NAT))
                .then(() => console.groupEnd())

                .then(() => console.group('DVR conversation'))
                 
                // --> 1. DVR handshake see doc/conversations/DVR conversation 24122022.xlsm 2453-2508
                .then(() => { return new Promise((resolve, reject) => {
                        console.group('Handshake');

                        const cmdNo = clientCmdNo.next().value;
                        const cmd28_1 = new Cmd28(Cmd28.Head_DVR, 
                                DVRTransciever.connectionID, 0, 0, DVRTransciever.connectionID, 0);
                        const cmd28_2 = new Cmd28(Cmd28.Head_DVR, 
                                DVRTransciever.connectionID, cmdNo, 0, DVRTransciever.connectionID, 
                                DVRTransciever.connectionID);
                        const cmd28_3 = new Cmd28(Cmd28.Head_DVR, 
                                DVRTransciever.connectionID, cmdNo, DVRTransciever.connectionID - 1, 
                                DVRTransciever.connectionID, DVRTransciever.connectionID + 1);

                        DVRTransciever.UDPSendCommandGetResponce(cmd28_1, (msg) => cmd28(msg))
                        .then(() => DVRTransciever.UDPSendCommandGetResponce(cmd28_2, (msg) => cmd28(msg)))
                        .then(() => DVRTransciever.UDPSendCommandGetResponce(cmd28_3, (msg) => cmd28(msg)))
                        // -- Receive Cmd88
                        .then(() => DVRTransciever.UDPReceiveSPBuffer())
                        .then(() => resolve())
                        .finally(() => console.groupEnd())
                })})

                // --> 2. DRAuth
                .then(() => { return new Promise((resolve, reject) => {
                        console.group('DRAuth');
                        const auth_2 = new DVRAuth(DVRTransciever.connectionID, clientCmdNo.next().value, 
                                DVRTransciever.connectionID, DVRTransciever.connectionID + 1, DVRTransciever.connectionID + 1);

                        DVRTransciever.UDPSendCommandGetResponce(auth_2, (msg) => cmd24(msg))
                        .then(() => DVRTransciever.UDPReceiveMPBuffer() )
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
                .finally(() => DVRTransciever.close() )
        });
}

const headIs = (msg, x) => msg.readUint32LE(0) == x;
const cmd28 = (msg) => headIs(msg, Cmd28.Head_DVR) || headIs(msg, Cmd28.Head_NAT);
const cmd24 = (msg) => headIs(msg, Cmd24.Head_DVR) || headIs(msg, Cmd24.Head_NAT);
const seqAbove = (msg, seq) => msg.readUint32LE(8) > seq;
