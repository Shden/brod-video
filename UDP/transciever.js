import { UDPLinearizer } from "./linearizer.js";
import { DVRCmd } from "../packets/dvrCmd.js";
import { Cmd24 } from "../packets/cmd24.js";
import { LogReceivedMessage, LogSentMessage } from "./logger.js";
import udp from "dgram";
import { NATCmd } from "../packets/natCmd.js";

export class Transciever
{
        /**
         * Create instance of transciever to communicate to provided host/port.
         * @param {Number} connectionID
         */
        constructor(connectionID = 0)
        {
                this.socket = udp.createSocket('udp4');
                this.connectionID = (connectionID) ? connectionID : new Date().valueOf() & 0x7FFFFFFF;
                this.lastSentCommandNumber = this.connectionID;
                this.lastReceivedCommandNumber = this.connectionID - 1;
        }

        /**
         * Connects tranciever to remote address and port.
         * @param {String} host server address
         * @param {Number} port server port
         * @returns 
         */
        connect(host, port)
        {
                this.host = host;
                this.port = port;
                return new Promise((resolve, reject) => {
                        this.socket.once('error', (err) => reject(err));
                        this.socket.once('connect', () => resolve());
                        this.socket.connect(port, host);
                });
        }

        close()
        {
                this.socket.disconnect();
                this.socket.close();
        }

        /**
         * Receive multipacket buffer with consistency, completeness and sequence check. 
         * Send acknowledge command for each successfully received incoming packet.
         * @returns promise to receive buffer.
         */
        UDPReceiveMPBuffer()
        {
                const MP_BUFFER_RECEIVE_TIMEOUT = 2000;

                return new Promise((resolve, reject) => {

                        let promiseResolved = false;
                        const linearizer = new UDPLinearizer();

                        const HandleReceivedBuffer = (msg, info) => {
                                if (!promiseResolved && msg.length > 28) 
                                {
                                        console.group('MP buffer received:');
                                        LogReceivedMessage(msg, info);
                                        console.groupEnd();
                
                                        const binPayload = DVRCmd.deserialize(msg);

                                        binPayload.decodeSegments();
                                        binPayload.printSegments();
                                        
                                        linearizer.push(binPayload);
                
                                        if (linearizer.isComplete) 
                                        {
                                                promiseResolved = true;
                
                                                // acknowledge each received packet
                                                linearizer.forEach((payload) => {
                                                        this.UDPAcknowledge(payload);
                                                });
                
                                                this.socket.off('message', HandleReceivedBuffer);
                                                const combinedBuffer = linearizer.combinedBuffer;
                                                console.log('%d bytes MP buffer reconstructed.', combinedBuffer.length)
                                                resolve(combinedBuffer);
                                        }
                                }
                        }

                        this.socket.on('message', HandleReceivedBuffer);

                        setTimeout(() => { 
                                this.socket.off('message', HandleReceivedBuffer);
                                reject('MP buffer receive timeout'); 
                        }, MP_BUFFER_RECEIVE_TIMEOUT);
                });
        }

        // 13	3.249351	45.137.113.118	192.168.2.11	UDP	51892 → 49149 Len=1272	01010100 5898d27e 5998d27e 5898d27e 5a98d27e 5998d27e 313131316c00000006000000…
        // 14	3.349264	45.137.113.118	192.168.2.11	UDP	51892 → 49149 Len=740	01010100 5898d27e 5a98d27e 5898d27e 5b98d27e 5998d27e d02c968c2c56c802108e7a00…
        // 15	3.351717	192.168.2.11	45.137.113.118	UDP	49149 → 51892 Len=24	01020100 5898d27e 5898d27e 5998d27e 00000000 5a98d27e
        // 16	3.352109	192.168.2.11	45.137.113.118	UDP	49149 → 51892 Len=24	01020100 5898d27e 5898d27e 5a98d27e 00000000 5b98d27e        
        /**
         * Acknowledge single payload received.
         * @param {Object} cmd to acknowledge.
         */
        UDPAcknowledge(cmd)
        {
                const clientAck = new Cmd24(Cmd24.Head_DVR, cmd.ConnectionID, cmd.Data2, cmd.Data1, 0, cmd.Data3);
                console.group('Acknowledgement');
                this.UDPSendCommand(clientAck);
                this.lastReceivedCommandNumber = cmd.Data1;
                console.groupEnd();
        }

        /**
         * Receive single-packet buffer and acknowledge.
         * @returns promise to receive command.
         */
        UDPReceiveSPBuffer()
        {
                const SP_BUFFER_RECEIVE_TIMEOUT = 2000;

                return new Promise((resolve, reject) => {

                        const HandleReceivedBuffer = (msg, info) => {
                                console.group('SP buffer received:');
                                LogReceivedMessage(msg, info);
                                console.groupEnd();

                                const cmd = DVRCmd.deserialize(msg); // Cmd24
                                this.UDPAcknowledge(cmd);

                                this.socket.off('message', HandleReceivedBuffer)
                                resolve(cmd);
                        }

                        this.socket.on('message', HandleReceivedBuffer);

                        setTimeout(() => { 
                                this.socket.off('message', HandleReceivedBuffer);
                                reject('SP buffer receive timeout'); 
                        }, SP_BUFFER_RECEIVE_TIMEOUT);
                });
        }
 
        /**
         * Send command, no confirmation required.
         * @param {*} command command to send
         */
        UDPSendCommand(command)
        {
                // DVR and NAT command stamping logic
                if (command.CmdHead == DVRCmd.CmdID || command.CmdHead == NATCmd.CmdID)
                {
                        command.Data1 = this.lastSentCommandNumber;             // this command sequential number
                        command.Data2 = this.lastReceivedCommandNumber;         // last recieved command number
                        command.Data3 = this.lastSentCommandNumber + 1;         // next command will go with number
                        command.Data4 = this.lastReceivedCommandNumber + 1;     // expect next command to receive with number
                        this.lastSentCommandNumber++;
                }
                command.ConnectionID = this.connectionID;
                const msg = Buffer.from(command.serialize());
                this.socket.send(msg);
                LogSentMessage(msg, this.host, this.port);
        }
  
        /**
         * Send command, await for the responce, validate responce. Repeat several times 
         * before give up. 
         * @param {*} command command to send
         * @param {*} responce_validation_rule function to validate responce
         * @returns Promise resolved if valid response obtained, promise rejected otherwise.
         */
        UDPSendCommandGetResponce(command, responce_validation_rule)
        {
                const COMMAND_RESPONCE_TIMEOUT = 1000;
                const SEND_REPEATS_BEFORE_GIVEUP = 3; 
        
                return new Promise((resolve, reject) => {

                        let gotResponse = false;
                        let socketClosed = false;
        
                        const MessageHandler = (msg, info) => 
                        {
                                LogReceivedMessage(msg, info);
        
                                if (responce_validation_rule(msg)) 
                                {
                                        this.socket.off('message', MessageHandler);
                                        this.socket.off('close', CloseHandler);
                                        gotResponse = true;
                                        resolve(msg);
                                }
                        }

                        const CloseHandler = () => {
                                socketClosed = true;
                        }
        
                        const SendCommandRetry = (repeatCounter) => 
                        {
                                if (repeatCounter) 
                                {
	                                if (!gotResponse && !socketClosed) 
                                        {
                                                this.UDPSendCommand(command);
                                                setTimeout(() => SendCommandRetry(--repeatCounter), COMMAND_RESPONCE_TIMEOUT);
                                        }
                                }
                                else
                                {
                                        this.socket.off('message', MessageHandler);
                                        this.socket.off('close', CloseHandler);
                                        reject('Responce timeout after: ' + command.serialize().toString("hex"));
                                }                             
                        }
                        this.socket.on('close', CloseHandler);
                        this.socket.on('message', MessageHandler);
        
                        SendCommandRetry(SEND_REPEATS_BEFORE_GIVEUP);
                });
        }
}