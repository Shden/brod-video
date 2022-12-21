import { Cmd28, Cmd28Head, Cmd28Tail, serializeCmd28, deserializeCmd28 } from '../cmd28.js';
import * as should from 'should';

const TEST_ID = 0xF9E8D7C6;

describe('Cmd28 packet tests:', function() {

        it('Serialization', function() {

                const packet = new Cmd28(TEST_ID);
                const buffer = serializeCmd28(packet);

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd28Head);
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(4 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(6 * 4).should.be.equal(Cmd28Tail);
        });

        it('Deserialization', function() {

                const packetToSerialize = new Cmd28(TEST_ID);
                const deserializedPacket = deserializeCmd28(serializeCmd28(packetToSerialize));

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.UniqID1.should.be.equal(packetToSerialize.UniqID1);
                deserializedPacket.UniqID2.should.be.equal(packetToSerialize.UniqID2);
                deserializedPacket.CmdTail.should.be.equal(packetToSerialize.CmdTail);

        });

});
