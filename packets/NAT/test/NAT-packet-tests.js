import { Cmd28, deserializeCmd28, Cmd28Head_10002, Cmd28Tail } from '../cmd28.js';
import { Cmd24, deserializeCmd24 } from '../cmd24.js';
import { NATReq, NATReqCmd, serializeNATReq, deserializeNATReq } from '../natReq.js';
import * as should from 'should';

const TEST_ID = 0x1F2E3D4C;

describe('Cmd28 packet tests:', function() {

        it('Serialization', function() {

                const packet = new Cmd28(Cmd28Head_10002, TEST_ID);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd28Head_10002);
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(4 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(6 * 4).should.be.equal(Cmd28Tail);
        });

        it('Deserialization', function() {

                const packetToSerialize = new Cmd28(Cmd28Head_10002, TEST_ID);
                const deserializedPacket = deserializeCmd28(packetToSerialize.serialize());

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.ConversationID.should.be.equal(packetToSerialize.ConversationID);
                deserializedPacket.ConversationID2.should.be.equal(packetToSerialize.ConversationID2);
                deserializedPacket.CmdTail.should.be.equal(packetToSerialize.CmdTail);

        });

});

describe('Cmd24 packet tests:', () => {

        it('Serialization', () => {

                const packet = new Cmd24(Cmd24.Head_020201, TEST_ID, TEST_ID+1);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd24.Head_020201);  
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(3 * 4).should.be.equal(TEST_ID+1);
        });

        it('Deserialization', () => {

                const cmd24ToSerialize = new Cmd24(Cmd24.Head_020201, TEST_ID, TEST_ID+1);
                const deserializedCmd24 = deserializeCmd24(cmd24ToSerialize.serialize());

                deserializedCmd24.CmdHead.should.be.equal(cmd24ToSerialize.CmdHead);
                deserializedCmd24.UniqID1.should.be.equal(cmd24ToSerialize.UniqID1);
                deserializedCmd24.UniqID2.should.be.equal(cmd24ToSerialize.UniqID2);
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