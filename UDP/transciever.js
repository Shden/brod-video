import { UDPLinearizer } from "./linearizer.js";
import { DVRCmd } from "../packets/dvrCmd.js";
import { Cmd24 } from "../packets/cmd24.js";
import { LogLevel, Logger } from "./logger.js";
import udp from "dgram";
import { NATCmd } from "../packets/natCmd.js";
import { Cmd28 } from "../packets/cmd28.js";
import { EventEmitter } from "node:events";


const InboundEvents = {
        Command: 'command',
        OutboundQueueDone: 'outbounddone'
}

export class Transciever
{
        /**
         * Create an instance of transciever.
         * @param {Number} connectionID
         */
        constructor(connectionID = 0)
        {
                this.socket = udp.createSocket('udp4');
                this.logger = new Logger();

                this.connectionID = (connectionID) ? connectionID : new Date().valueOf() & 0x7FFFFFFF;
                this.lastSentCommandNumber = this.connectionID - 1;
                this.lastReceivedCommandNumber = this.connectionID - 1;
        }

        /**
         * Connect tranciever to remote address and port.
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

                        this.inboundCommands = new Map();
                        this.outboundCommands = new Map();

                        this.inboundEvents = new EventEmitter();

                        this.socket.on('message', (msg, rinfo) => {
                                if (rinfo.address == this.host && rinfo.port == this.port)
                                {
                                        this.logger.LogReceivedMessage(msg, rinfo);
                                        switch(msg.readUInt32LE(0))
                                        {
                                                case Cmd24.Head_DVR:
                                                case Cmd24.Head_NAT:
                                                        // remove acknowledged command from outbound commands
                                                        const ack = Cmd24.deserialize(msg);
                                                        this.outboundCommands.delete(ack.Data2);
                                                        if (!this.outboundCommands.size)
                                                                this.inboundEvents.emit(InboundEvents.OutboundQueueDone);
                                                        break;

                                                case Cmd28.Head_DVR:
                                                case Cmd28.Head_NAT:
                                                        const cmd28 = Cmd28.deserialize(msg);
                                                        this.inboundCommands.set(cmd28.Data1, cmd28);
                                                        this.inboundEvents.emit(InboundEvents.Command, cmd28);
                                                        break;

                                                case DVRCmd.CmdID:
                                                        const dvrCmd = DVRCmd.deserialize(msg);
                                                        this.inboundCommands.set(dvrCmd.Data1, dvrCmd);
                                                        this.inboundEvents.emit(InboundEvents.Command, dvrCmd);
                                                        this.UDPAcknowledge(dvrCmd);
                                                        break;

                                                case NATCmd.CmdID:
                                                        const natCmd = NATCmd.deserialize(msg);
                                                        this.inboundCommands.set(natCmd.Data1, natCmd);
                                                        this.inboundEvents.emit(InboundEvents.Command, natCmd);
                                                        this.UDPAcknowledge(natCmd);
                                                        break;
                                        }
                                }
                        });
                });
        }

        /**
         * Ensure outbound command queue is clear and close socket connection.
         * @returns 
         */
        close()
        {
                return new Promise((resolve, reject) => {
                        if (this.outboundCommands.size)
                        {
                                this.inboundEvents.once(InboundEvents.OutboundQueueDone, () => {
                                        this.socket.disconnect();
                                        this.socket.close();
                                        resolve();
                                });
                                setTimeout(() => reject('Transciever closing timeout'), 2000);
                        } 
                        else
                        {
                                this.socket.disconnect();
                                this.socket.close();
                                resolve();
                        }
                });
        }

        /**
         * Acknowledge single payload received.
         * @param {Object} cmd to acknowledge.
         */
        UDPAcknowledge(cmd)
        {
                this.lastReceivedCommandNumber = Math.max(this.lastReceivedCommandNumber, cmd.Data1);
                const commandID = cmd.CmdHead === NATCmd.CmdID ? Cmd24.Head_NAT : Cmd24.Head_DVR;
                const clientAck = new Cmd24(commandID, cmd.ConnectionID, 
                        this.lastSentCommandNumber, this.lastReceivedCommandNumber, 0, this.lastReceivedCommandNumber + 1);
                this.UDPSendCommand(clientAck);
        }

        /**
         * Send command, no confirmation required.
         * @param {*} command command to send
         */
        UDPSendCommand(command)
        {
                command.ConnectionID = this.connectionID;
                // DVR and NAT command stamping logic
                if (command.CmdHead == DVRCmd.CmdID || command.CmdHead == NATCmd.CmdID)
                {
                        this.lastSentCommandNumber++;
                        command.Data1 = this.lastSentCommandNumber;             // this command sequential number
                        command.Data2 = this.lastReceivedCommandNumber;         // last recieved command number
                        command.Data3 = this.lastSentCommandNumber + 1;         // next command will go with number
                        command.Data4 = this.lastReceivedCommandNumber + 1;     // expect next command to receive with number

                        // TODO add command timestamp and retrieve logic
                        this.outboundCommands.set(command.Data1, command);      // add to outgoing queue
                }
                const msg = Buffer.from(command.serialize());
                this.socket.send(msg);
                this.logger.LogSentMessage(msg, this.host, this.port);
        }
  
        /**
         * Receive multipacket buffer with consistency, completeness and sequence check. 
         * Send acknowledge command for each successfully received incoming packet.
         * @returns promise to receive buffer.
         */
        UDPReceiveBuffer(responce_validation_rule)
        {
                const MP_BUFFER_RECEIVE_TIMEOUT = 2000;

                return new Promise((resolve, reject) => {

                        const linearizer = new UDPLinearizer();

                        const HandleInboundCommand = (cmd) => {
        
                                if (responce_validation_rule(cmd)) 
                                {
                                        this.inboundCommands.delete(cmd.Data1);
                                        //cmd.decodeSegments();
                                        //binPayload.printSegments();

                                        // linearizer.push(cmd);
                
                                        // if (linearizer.isComplete) 
                                        // {
                                                this.inboundEvents.off(InboundEvents.Command, HandleInboundCommand);
                                                const combinedBuffer = linearizer.combinedBuffer;
                                                this.logger.log('%d bytes MP buffer reconstructed.', combinedBuffer.length)
                                                resolve(cmd/*combinedBuffer*/);
                                        // }
                                }
                        }

                        for (const cmd of this.inboundCommands.values()) 
                                HandleInboundCommand(cmd)                           

                        this.inboundEvents.on(InboundEvents.Command, HandleInboundCommand);

                        setTimeout(() => { 
                                this.inboundEvents.off(InboundEvents.Command, HandleInboundCommand);
                                reject('MP buffer receive timeout'); 
                        }, MP_BUFFER_RECEIVE_TIMEOUT);
                });
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
                this.UDPSendCommand(command);
                return this.UDPReceiveBuffer(responce_validation_rule);
        }
}