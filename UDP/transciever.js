import { UDPLinearizer } from "./linearizer.js";
import { BinPayload } from "../packets/binPayload.js";
import { Cmd24 } from "../packets/cmd24.js";
import { LogReceivedMessage, LogSentMessage } from "./logger.js";

export class Transciever
{
        /**
         * Receive multipacket buffer with consistency, completeness and sequence check. 
         * Send acknowledge command for each successfully received incoming packet.
         * @param {*} socket UDP socket to communicate
         * @param {*} host server address
         * @param {*} port server port
         * @returns promise to receive buffer.
         */
        static UDPReceiveMPBuffer(socket, host, port)
        {
                const MP_BUFFER_RECEIVE_TIMEOUT = 2000;

                return new Promise((resolve, reject) => {

                        let promiseResolved = false;
                        const linearizer = new UDPLinearizer();

                        socket.on('message', HandleReceivedBuffer);

                        setTimeout(() => { 
                                socket.off('message', HandleReceivedBuffer);
                                reject('MP buffer receive timeout'); 
                        }, MP_BUFFER_RECEIVE_TIMEOUT);

                        function HandleReceivedBuffer(msg, info)
                        {
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
                                                        Transciever.UDPAcknowledge(socket, host, port, payload);
                                                });
                
                                                socket.off('message', HandleReceivedBuffer);
                                                const combinedBuffer = linearizer.combinedBuffer;
                                                console.log('%d bytes MP buffer reconstructed.', combinedBuffer.length)
                                                resolve(combinedBuffer);
                                        }
                                }
                        }
                });
        }

        /**
         * Acknowledge single payload received.
         * @param {*} socket UDP socket to send acknowledgement.
         * @param {String} host server address.
         * @param {Number} port server port.
         * @param {Object} cmd to acknowledge.
         */
         static UDPAcknowledge(socket, host, port, cmd)
        {
                const clientAck = new Cmd24(Cmd24.Head_DVR, cmd.ConnectionID, cmd.Data2, cmd.Data1, 0, cmd.Data3);
                console.group('Acknowledgement');
                Transciever.UDPSendCommand(socket, host, port, clientAck);
                console.groupEnd();
        }

        /**
         * Receive single-packet buffer and acknowledge.
         * @param {*} socket UDP socket to communicate
         * @param {String} host server address
         * @param {Number} port server port
         * @returns promise to receive command.
         */
         static UDPReceiveSPBuffer(socket, host, port)
        {
                const SP_BUFFER_RECEIVE_TIMEOUT = 2000;

                return new Promise((resolve, reject) => {

                        socket.on('message', HandleReceivedBuffer);

                        setTimeout(() => { 
                                socket.off('message', HandleReceivedBuffer);
                                reject('SP buffer receive timeout'); 
                        }, SP_BUFFER_RECEIVE_TIMEOUT);

                        function HandleReceivedBuffer(msg, info)
                        {
                                console.group('SP buffer received:');
                                LogReceivedMessage(msg, info);
                                console.groupEnd();

                                const cmd = Cmd24.deserialize(msg);
                                Transciever.UDPAcknowledge(socket, host, port, cmd);

                                socket.off('message', HandleReceivedBuffer)
                                resolve(cmd);
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
         static UDPSendCommand(socket, host, port, command)
        {
                const msg = Buffer.from(command.serialize());
                socket.send(msg, port, host);
                LogSentMessage(msg, host, port);
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
         static UDPSendCommandGetResponce(socket, host, port, command, responce_validation_rule)
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
        
                        let socketClosed = false;
                        socket.on('close', () => socketClosed = true);
                        socket.on('message', HandleResponse);
        
                        SendCommandRetry(SEND_REPEATS_BEFORE_GIVEUP);
        
                        function SendCommandRetry(repeatCounter) 
                        {
                                if (!repeatCounter) 
                                {
                                        socket.off('message', HandleResponse);
                                        reject('Responce timeout after: ' + command.serialize().toString("hex"));
                                } else if (!socketClosed) {
                                        Transciever.UDPSendCommand(socket, host, port, command);
                                        setTimeout(() => { SendCommandRetry(--repeatCounter); }, COMMAND_RESPONCE_TIMEOUT);
                                }
                        }
                });
        }
}