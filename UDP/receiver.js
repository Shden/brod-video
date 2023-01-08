import { UDPLinearizer } from "./linearizer.js";
import { BinPayload } from "../packets/binPayload.js";
import { Cmd24 } from "../packets/cmd24.js";
import { UDPSendCommand } from "../networking.js";
import { LogReceivedMessage } from "./logger.js";

/**
 * Receive multipacket buffer with consistency, completeness and sequence check. 
 * Send acknowledge command for each successfully received incoming packet.
 * @param {*} socket UDP socket to communicate
 * @param {*} host server address
 * @param {*} port server port
 * @returns promise to receive buffer.
 */
export function UDPReceiveMPBuffer(socket, host, port)
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
                        if (!promiseResolved) 
                        {
                                console.group('MP buffer received:');
                                LogReceivedMessage(msg, info);
                                console.groupEnd();
                                // console.log('<-- Received MP unit, %d bytes from %s:%d\t%s', 
                                //         msg.length, info.address, info.port, msg.toString('hex'));
        
                                const binPayload = BinPayload.deserialize(msg);
                                linearizer.push(binPayload);
        
                                if (linearizer.isComplete) 
                                {
                                        promiseResolved = true;
        
                                        // acknowledge each received packet
                                        linearizer.forEach((payload) => {
                                                UDPAcknowledge(socket, host, port, payload);
                                        });
        
                                        socket.off('message', HandleReceivedBuffer);
                                        resolve(linearizer.combinedBuffer);
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
function UDPAcknowledge(socket, host, port, cmd)
{
        const clientAck = new Cmd24(Cmd24.Head_DVR, cmd.ConnectionID, cmd.Data2, cmd.Data1, 0, cmd.Data3);
        console.group('Acknowledgement');
        UDPSendCommand(socket, host, port, clientAck);
        console.groupEnd();
}

/**
 * Receive single-packet buffer and acknowledge.
 * @param {*} socket UDP socket to communicate
 * @param {String} host server address
 * @param {Number} port server port
 * @returns promise to receive command.
 */
export function UDPReceiveSPBuffer(socket, host, port)
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
                        UDPAcknowledge(socket, host, port, cmd);

                        socket.off('message', HandleReceivedBuffer)
                        resolve(cmd);
                }
        });
}