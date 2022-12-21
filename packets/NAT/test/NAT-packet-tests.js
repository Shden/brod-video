import { Ack28, Ack28Cmd, Ack28Tail, serializeAck28, deserializeAck28 } from '../ack28.js';
import { Bye24, Bye24Cmd, serializeBye24, deserializeBye24 } from '../bye24.js';
import { NATReq, NATReqCmd, serializeNATReq, deserializeNATReq } from '../natReq.js';
import * as should from 'should';

const TEST_ID = 0x1F2E3D4C;

describe('Ack28 packet tests:', function() {

        it('Serialization', function() {

                const packet = new Ack28(TEST_ID);
                const buffer = serializeAck28(packet);

                buffer.readUInt32LE(0 * 4).should.be.equal(Ack28Cmd);
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(4 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(6 * 4).should.be.equal(Ack28Tail);
        });

        it('Deserialization', function() {

                const packetToSerialize = new Ack28(TEST_ID);
                const deserializedPacket = deserializeAck28(serializeAck28(packetToSerialize));

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.UniqID1.should.be.equal(packetToSerialize.UniqID1);
                deserializedPacket.UniqID2.should.be.equal(packetToSerialize.UniqID2);
                deserializedPacket.CmdTail.should.be.equal(packetToSerialize.CmdTail);

        });

});

describe('BYE24 packet tests:', () => {

        it('Serialization', () => {

                const packet = new Bye24(TEST_ID, TEST_ID+1);
                const buffer = serializeBye24(packet);

                buffer.readUInt32LE(0 * 4).should.be.equal(Bye24Cmd);  
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(3 * 4).should.be.equal(TEST_ID+1);
        });

        it('Deserialization', () => {

                const bye24ToSerialize = new Bye24(TEST_ID, TEST_ID+1);
                const deserializedBye24 = deserializeBye24(serializeBye24(bye24ToSerialize));

                deserializedBye24.CmdHead.should.be.equal(bye24ToSerialize.CmdHead);
                deserializedBye24.UniqID1.should.be.equal(bye24ToSerialize.UniqID1);
                deserializedBye24.UniqID2.should.be.equal(bye24ToSerialize.UniqID2);
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