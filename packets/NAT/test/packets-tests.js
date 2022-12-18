import { Ack28, Ack28Cmd, Ack28Tail, serializeAck28, deserializeAck28 } from '../ack28.js';
import { Bye24, Bye24Cmd, serializeBye24, deserializeBye24 } from '../bye24.js';
import * as should from 'should';

const TEST_ID = 0x1F2E3D4C;

describe('ACK28 packet tests:', function() {

        it('Serialization', function() {

                const packet = new Ack28(TEST_ID);
                const buffer = serializeAck28(packet);
                const packetAsInt32Array = new Int32Array(buffer);

                packetAsInt32Array[0].should.be.equal(Ack28Cmd);
                packetAsInt32Array[1].should.be.equal(TEST_ID);
                packetAsInt32Array[4].should.be.equal(TEST_ID);
                packetAsInt32Array[6].should.be.equal(Ack28Tail);
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

                const packet = new Bye24(TEST_ID);
                const buffer = serializeBye24(packet);
                const packetAsInt32Array = new Int32Array(buffer);

                packetAsInt32Array[0].should.be.equal(Bye24Cmd);  
                packetAsInt32Array[1].should.be.equal(TEST_ID);
                packetAsInt32Array[2].should.be.equal(TEST_ID);
        });

        it('Deserialization', () => {

                const bye24ToSerialize = new Bye24(TEST_ID, TEST_ID+1);
                const deserializedBye24 = deserializeBye24(serializeBye24(bye24ToSerialize));

                deserializedBye24.CmdHead.should.be.equal(bye24ToSerialize.CmdHead);
                deserializedBye24.UniqID1.should.be.equal(bye24ToSerialize.UniqID1);
                deserializedBye24.UniqID2.should.be.equal(bye24ToSerialize.UniqID2);
        });
});