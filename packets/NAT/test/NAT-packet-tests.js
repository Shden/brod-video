import { Cmd28, deserializeCmd28 } from '../cmd28.js';
import { Cmd24, deserializeCmd24 } from '../cmd24.js';
import { NATReq, NATReqCmd, serializeNATReq, deserializeNATReq } from '../natReq.js';
import { BinPayload, deserializeBinPayload } from '../binPayload.js';
import * as should from 'should';

const TEST_ID = 0x1F2E3D4C;

describe('Cmd28 packet tests:', function() {

        it('Serialization', function() {

                const packet = new Cmd28(Cmd28.Head_NAT, TEST_ID, 0, 0, TEST_ID+1);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd28.Head_NAT);
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(4 * 4).should.be.equal(TEST_ID+1);
                buffer.readUInt32LE(6 * 4).should.be.equal(Cmd28.Tail);
        });

        it('Deserialization', function() {

                const packetToSerialize = new Cmd28(Cmd28.Head_NAT, TEST_ID);
                const deserializedPacket = deserializeCmd28(packetToSerialize.serialize());

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.ConversationID.should.be.equal(packetToSerialize.ConversationID);
                deserializedPacket.Data1.should.be.equal(packetToSerialize.Data1);
                deserializedPacket.Data2.should.be.equal(packetToSerialize.Data2);
                deserializedPacket.Data3.should.be.equal(packetToSerialize.Data3);
                deserializedPacket.Data4.should.be.equal(packetToSerialize.Data4);
                deserializedPacket.CmdTail.should.be.equal(packetToSerialize.CmdTail);

        });

});

describe('Cmd24 packet tests:', () => {

        it('Serialization', () => {

                const packet = new Cmd24(Cmd24.Head_020201, TEST_ID, TEST_ID+1, TEST_ID+2);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd24.Head_020201);  
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(2 * 4).should.be.equal(TEST_ID+1);
                buffer.readUInt32LE(3 * 4).should.be.equal(TEST_ID+2)
        });

        it('Deserialization', () => {

                const cmd24ToSerialize = new Cmd24(Cmd24.Head_020201, TEST_ID, TEST_ID+1);
                const deserializedCmd24 = deserializeCmd24(cmd24ToSerialize.serialize());

                deserializedCmd24.CmdHead.should.be.equal(cmd24ToSerialize.CmdHead);
                deserializedCmd24.ConversationID.should.be.equal(cmd24ToSerialize.ConversationID);
                deserializedCmd24.Data1.should.be.equal(cmd24ToSerialize.Data1);
        });
});

describe('NATReq packet tests:', () => {

        it('Serialization', () => {

                const packet = new NATReq(TEST_ID, TEST_ID+1, TEST_ID+2, TEST_ID+3, TEST_ID+4, TEST_ID+100, TEST_ID+101, 'test');
                const buffer = serializeNATReq(packet);
                const packetHeadAsInt32Array = new Int32Array(buffer.buffer, buffer.byteOffset, 8);
                const packetTailAsString = buffer.toString("ascii", 32, buffer.length-1);

                packetHeadAsInt32Array[0].should.be.equal(NATReqCmd);  
                packetHeadAsInt32Array[1].should.be.equal(TEST_ID);
                packetHeadAsInt32Array[2].should.be.equal(TEST_ID+1);
                packetHeadAsInt32Array[3].should.be.equal(TEST_ID+2);
                packetHeadAsInt32Array[4].should.be.equal(TEST_ID+3);
                packetHeadAsInt32Array[5].should.be.equal(TEST_ID+4);
                packetHeadAsInt32Array[6].should.be.equal(TEST_ID+100);
                packetHeadAsInt32Array[7].should.be.equal(TEST_ID+101);
                packetTailAsString.should.be.String().and.is.equal('test');
        });

        it('Deserialization', () => {

                const natToSerialize = new NATReq(TEST_ID, TEST_ID+1, TEST_ID+2, TEST_ID+3, TEST_ID+4, TEST_ID+100, TEST_ID+101, 'test');
                const deserializedNat = deserializeNATReq(serializeNATReq(natToSerialize));

                deserializedNat.UniqID1.should.be.equal(natToSerialize.UniqID1);
                deserializedNat.UniqID2.should.be.equal(natToSerialize.UniqID2);
                deserializedNat.UniqID3.should.be.equal(natToSerialize.UniqID3);
                deserializedNat.UniqID4.should.be.equal(natToSerialize.UniqID4);
                deserializedNat.UniqID5.should.be.equal(natToSerialize.UniqID5);

                deserializedNat.Data1.should.be.equal(natToSerialize.Data1);
                deserializedNat.Data2.should.be.equal(natToSerialize.Data2);

                deserializedNat.XML.should.be.equal(natToSerialize.XML);
        });
});

describe('BinPayload packet tests:', () => {

        const BUFFER_SIZE = 0xFF;

        it('Serialization', function() {

                const args = Array.from({ length: 7 }, (value, index) => 0x45DF7916 + index);
                const range0_FF = Uint8Array.from({ length: BUFFER_SIZE }, (value, index) => index);
                const packet = new BinPayload(...args, new Buffer.from(range0_FF));
                const buffer = packet.serialize();

                for (let i = 0; i < 7; i++)                
                        buffer.readUInt32LE(i * 4).should.be.equal(args[i]);

                for (let j = 0; j < BUFFER_SIZE; j++)
                        buffer.readUInt8(28 + j).should.be.equal(range0_FF[j]);

        });

        it('Deserialization', function() {

                const args = Array.from({ length: 7 }, (value, index) => 0x45DF7916 + index);
                const range0_FF = Uint8Array.from({ length: BUFFER_SIZE }, (value, index) => index);
                const packetToSerialize = new BinPayload(...args, new Buffer.from(range0_FF));
                const deserializedPacket = deserializeBinPayload(packetToSerialize.serialize());

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.ConversationID.should.be.equal(packetToSerialize.ConversationID);
                deserializedPacket.Data1.should.be.equal(packetToSerialize.Data1);
                deserializedPacket.Data2.should.be.equal(packetToSerialize.Data2);
                deserializedPacket.Data3.should.be.equal(packetToSerialize.Data3);
                deserializedPacket.Data4.should.be.equal(packetToSerialize.Data4);
                deserializedPacket.CmdTail.should.be.equal(packetToSerialize.CmdTail);

                for (let j = 0; j < BUFFER_SIZE; j++)
                        deserializedPacket.payload.readUInt8(j).should.be.equal(packetToSerialize.payload.readUInt8(j));

        });
});