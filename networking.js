// NAT point conversation snapshot analysis: see doc/conversations/NAT conversation 24122022.xlsx
import { Cmd28 } from './packets/cmd28.js';
import { NATCmd } from './packets/natCmd.js';
import { Cmd24 } from './packets/cmd24.js';
import { DVRCmd, ChannelRequest, Cmd88, DVRAuth, QuerySystemCaps, QueryOnlineChlList } from "./packets/dvrCmd.js";
import { serialNumber } from './privateData.js';
import { VideoFeedRequest } from "./packets/dvrCmd.js";
import { QueryNodeEncodeInfo } from "./packets/dvrCmd.js";
import xml2js from "xml2js";
import { Transciever } from "./UDP/transciever.js";
import { autoNATURI, autoNATPort } from "./privateData.js";
import { XMLHttpRequest } from "xmlhttprequest";
import { LogLevel } from './UDP/logger.js';
import { UUID } from './uuid.js';

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


// 1931	8.052920	192.168.116.163	47.91.72.135	UDP	12520 ??? 8989 Len=28	02000100|e1b09405|00000000|00000000|e1b09405|00000000|fefe0001
// 1988	8.054486	47.91.72.135	192.168.116.163	UDP	8989 ??? 12520 Len=28	02000100|e1b09405|e0b09405|00000000|e1b09405|e1b09405|fefe0001
// 1992	8.054577	192.168.116.163	47.91.72.135	UDP	12520 ??? 8989 Len=28	02000100|e1b09405|e0b09405|e0b09405|e1b09405|e2b09405|fefe0001
/**
 * Initiate NAT point conversation:
 * @param {Transciever} transciever 
 * @returns 
 */
function NATHandshake(transciever)
{
        return new Promise((resolve, reject) => {

                const handShake1 = new Cmd28(Cmd28.CmdID_NAT, 
                        transciever.connectionID, 0, 0, transciever.connectionID, 0);
                // see doc/conversations/DVR conversation 24122022.xlsm packet 1992 and 2319
                const handShake2 = new Cmd28(Cmd28.CmdID_NAT, 
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
        
                const NATRequest = new NATCmd(NAT10006XMLRequest);
                transciever.UDPSendCommandGetResponce(NATRequest, (cmd) => cmd.CmdHead === NATCmd.CmdID)
                .then((natResponce) => {
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
                const NATRequest = new NATCmd(NAT10002XMLRequest);

                transciever.UDPSendCommandGetResponce(NATRequest, (cmd) => cmd.CmdHead === NATCmd.CmdID)
                .then((natResponce) => {
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

/**
 * Conversation with NAT point to get DVR IP.
 * Ref packets ## 1931-2317, see doc/conversations/NAT conversation 24122022.xlsm
 * @param {String} NATHost 
 * @param {Number} NATPort 
 * @returns 
 */
export function NATGetDVRIP(NATHost, NATPort)
{
        const transciever = new Transciever();
        //transciever.logger.logLevel = LogLevel.All;

        return new Promise((resolve, reject) => {
                transciever.connect(NATHost, NATPort)
                .then(() => NATHandshake(transciever))
                // ref: #1993 see doc/conversations/NAT conversation 24122022.xlsm
                .then(() => NAT10006Request(transciever))
                .then((res) => {
                        resolve({ 
                                NAT: { host: NATHost, port: NATPort}, 
                                DVR: { host: res.host, port: res.port }})
                })
                .catch((reason) => reject(reason) )
                .finally(() => transciever.close())
        });
}

const DVR_UDP_PORT = 49149;
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
        const transciever = new Transciever();
        // Should be the same port number in NATRegisterConnection and DVRConnect
        transciever.socket.bind(DVR_UDP_PORT);

        return new Promise((resolve, reject) => {
                transciever.connect(NATHost, NATPort)
                .then(() => NATHandshake(transciever))
                .then(() => NAT10002Request(transciever, connectionID))
                .then((result) => transciever.close().then(() => resolve(result)))
                .catch((reason) => transciever.close().then(() => reject(reason)))
        });
}

export function DVRConnect(DVRHost, DVRPort, connectionID)
{
        const transciever = new Transciever(connectionID);
        transciever.logger.logLevel = LogLevel.All;
        // Should be the same port number in NATRegisterConnection and DVRConnect
        transciever.socket.bind(DVR_UDP_PORT);

        const taskId = new UUID();
        const destId = '00000002-0000-0000-0000-000000000000';
        const channelNo = 2;
        var videoSessionID;

        return new Promise((resolve, reject) => {
                transciever.logger.group('DVR conversation');

                // --> 1. DVR handshake see doc/conversations/DVR conversation 24122022.xlsm 2453-2508
                new Promise((resolve, reject) => {
                        transciever.logger.group('Handshake');

                        const cmd28_1 = new Cmd28(Cmd28.CmdID_DVR, 
                                transciever.connectionID, 0, 0, transciever.connectionID, 0);
                        const cmd28_2 = new Cmd28(Cmd28.CmdID_DVR, 
                                transciever.connectionID, transciever.connectionID - 1, 0, transciever.connectionID, 
                                transciever.connectionID);
                        const cmd28_3 = new Cmd28(Cmd28.CmdID_DVR, 
                                transciever.connectionID, transciever.connectionID - 1, transciever.connectionID - 1, 
                                transciever.connectionID, transciever.connectionID + 1);
 
                        transciever.connect(DVRHost, DVRPort)
                        .then(() => transciever.UDPSendCommandGetResponce(cmd28_1, cmd => cmd.CmdHead === Cmd28.CmdID_DVR))
                        .then(() => transciever.UDPSendCommandGetResponce(cmd28_2, cmd => cmd.CmdHead === Cmd28.CmdID_DVR))
                        .then(() => transciever.UDPSendCommandGetResponce(cmd28_3, cmd => cmd.CmdHead === DVRCmd.CmdID))
                        // -- Receive Cmd88
                        //.then(() => transciever.UDPReceiveBuffer(cmd => cmd.CmdHead === DVRCmd.CmdID))
                        .then(() => transciever.logger.groupEnd())
                        .then(() => resolve())
                })

                // --> 2. DRAuth
                .then(() => { return new Promise((resolve, reject) => {
                        transciever.logger.group('DRAuth');
                        const authRequest = new DVRAuth();
                        transciever.UDPSendCommandGetResponce(authRequest, cmd => cmd.Data2 === authRequest.Data1)
                        .then(authResp => {
                                //authResp.printSegments();
                                videoSessionID = UUID.from(authResp.getSegments(0x0101, 108, 16)[0]);
                                console.log('videoSessionID:', videoSessionID);
                        })
                        .then(() => transciever.logger.groupEnd())
                        .then(() => resolve())
                        // .then(() => setTimeout(() => resolve(), 7000)) // Tmp
                })})

                // --> 3. QuerySystemCaps
                .then(() => { return new Promise((resolve, reject) => {
                        transciever.logger.group('QuerySystemCaps');
                        const querySystemCaps = new QuerySystemCaps();
                        transciever.UDPSendCommandGetResponce(querySystemCaps, cmd => cmd.CmdHead === DVRCmd.CmdID)
                        .then(() => transciever.logger.groupEnd())
                        .then(() => resolve())
                })})

                // --> 4. ChannelRequest
                .then(() => { return new Promise((resolve, reject) => {
                        transciever.logger.group('ChannelRequest');
                        const channelRequest = new ChannelRequest(channelNo, taskId, destId, videoSessionID);
                        const QOCL = new QueryOnlineChlList();
                        // const videoFeedRequest = new VideoFeedRequest(taskId, destId); /* 2873 */
                        const qnei = new QueryNodeEncodeInfo(); /* 2874 */


                        transciever.UDPSendCommand(channelRequest);
                        transciever.UDPSendCommand(QOCL);
                        const p32 = new DVRCmd(DVRCmd.CmdID,0,0,0,0,0,Buffer.from('3131313100000000', 'hex'));
                        transciever.UDPSendCommand(p32);
                        // transciever.UDPSendCommand(qnei);

                        // setTimeout(() => {
                        //         transciever.UDPSendCommand(videoFeedRequest);
                        //         // transciever.UDPSendCommand(qo);
                        // }, 5000);
                        setTimeout(() => resolve(), 10000);
                        //.then(() => transciever.logger.groupEnd())

                        // return UDPSendCommandGetResponce(channelRequest, (msg) => headIs(msg, 0x00010201))
                })})
                // .then(() => { return new Promise((resolve, reject) => {
                //         transciever.logger.group('VideoFeedRequest');
                //         
                //         .then(() => setTimeout(() => resolve(), 5000)) // Tmp
                //         .then(() => transciever.logger.groupEnd())
                //         // return UDPSendCommandGetResponce(DVRSocket, DVRHost, DVRPort, qnei, (msg) => seqAbove(msg, connID + 32));
                // })})

                .then(() => resolve())
                .catch((err) => console.log(err))
                .finally(() => transciever.close())
        });
}

const headIs = (msg, x) => msg.readUint32LE(0) == x;
//const cmd28 = (msg) => headIs(msg, Cmd28.Head_DVR) || headIs(msg, Cmd28.Head_NAT);
const cmd28 = (cmd) => cmd.constructor.name === "Cmd28"
const cmd24 = (msg) => headIs(msg, Cmd24.CmdID_DVR) || headIs(msg, Cmd24.CmdID_NAT);
// const seqAbove = (msg, seq) => msg.readUint32LE(8) > seq;


//---
// 30 <?xml version='1.0' encoding='utf-8'?><request version='1.0' systemType='NVMS-9000' clientType='SYS'><destId>{00000002-0000-0000-0000-000000000000}</destId><taskId>{EC33A4E8-EBD0-2240-908C-62DD02762ED8}</taskId><chNo>0</chNo><audio>0</audio><streamType>2</streamType></request>
// 31 <?xml version='1.0' encoding='utf-8'?><request version='1.0' systemType='NVMS-9000' clientType='MOBILE' url='queryOnlineChlList'></request>
// 37 <?xml version='1.0' encoding='utf-8'?><request version='1.0' systemType='NVMS-9000' clientType='SYS'><destId>{00000002-0000-0000-0000-000000000000}</destId><taskId>{EC33A4E8-EBD0-2240-908C-62DD02762ED8}</taskId><chNo>0</chNo><audio>0</audio><streamType>2</streamType></request>
// 38 <?xml version='1.0' encoding='utf-8'?><request version='1.0' systemType='NVMS-9000' clientType='MOBILE' url='queryOnlineChlList'></request>