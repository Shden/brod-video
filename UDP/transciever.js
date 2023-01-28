import { UDPLinearizer } from "./linearizer.js";
import { BinPayload } from "../packets/binPayload.js";
import { Cmd24 } from "../packets/cmd24.js";
import { Cmd28 } from "../packets/cmd28.js";
import { LogReceivedMessage, LogSentMessage } from "./logger.js";
import udp from "dgram";

export class Transciever
{
        /**
         * Create instance of transciever to communicate to provided host/port.
         * @param {String} host server address
         * @param {Number} port server port
         * @param {Number} connectionID
         */
        constructor(host, port, connectionID = 0)
        {
                this.host = host;
                this.port = port;
                this.socket = udp.createSocket('udp4');
                this.socket.on('error', (err) => console.log(err));
                this.socket.connect(port, host);
                this.connectionID = (connectionID) ? connectionID : new Date().valueOf() & 0x7FFFFFFF;
        }

        close()
        {
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
                
                                        const binPayload = BinPayload.deserialize(msg);
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

        /**
         * Acknowledge single payload received.
         * @param {Object} cmd to acknowledge.
         */
        UDPAcknowledge(cmd)
        {
                const clientAck = new Cmd24(Cmd24.Head_DVR, cmd.ConnectionID, cmd.Data2, cmd.Data1, 0, cmd.Data3);
                console.group('Acknowledgement');
                this.UDPSendCommand(clientAck);
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

                                const cmd = BinPayload.deserialize(msg); // Cmd24
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
         * Send command and forget.
         * @param {*} command command to send
         */
        UDPSendCommand(command)
        {
                const msg = Buffer.from(command.serialize());
                this.socket.send(msg, this.port, this.host);
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