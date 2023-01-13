import { Cmd28 } from '../cmd28.js';
import { Cmd24 } from '../cmd24.js';
import { NATReq } from '../NAT/natReq.js';
import { BinPayload } from '../binPayload.js';
import { DVRAuth } from '../binPayload.js';
import { QuerySystemCaps } from '../binPayload.js';
import { ChannelRequest } from '../binPayload.js';
import { VideoFeedRequest } from '../binPayload.js';
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
                const deserializedPacket = Cmd28.deserialize(packetToSerialize.serialize());

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.ConnectionID.should.be.equal(packetToSerialize.ConnectionID);
                deserializedPacket.Data1.should.be.equal(packetToSerialize.Data1);
                deserializedPacket.Data2.should.be.equal(packetToSerialize.Data2);
                deserializedPacket.Data3.should.be.equal(packetToSerialize.Data3);
                deserializedPacket.Data4.should.be.equal(packetToSerialize.Data4);
                deserializedPacket.CmdTail.should.be.equal(packetToSerialize.CmdTail);

        });

});

describe('Cmd24 packet tests:', () => {

        it('Serialization', () => {

                const packet = new Cmd24(Cmd24.Head_DVR, TEST_ID, TEST_ID+1, TEST_ID+2);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd24.Head_DVR);  
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(2 * 4).should.be.equal(TEST_ID+1);
                buffer.readUInt32LE(3 * 4).should.be.equal(TEST_ID+2)
        });

        it('Deserialization', () => {

                const cmd24ToSerialize = new Cmd24(Cmd24.Head_DVR, TEST_ID, TEST_ID+1);
                const deserializedCmd24 = Cmd24.deserialize(cmd24ToSerialize.serialize());

                deserializedCmd24.CmdHead.should.be.equal(cmd24ToSerialize.CmdHead);
                deserializedCmd24.ConnectionID.should.be.equal(cmd24ToSerialize.ConnectionID);
                deserializedCmd24.Data1.should.be.equal(cmd24ToSerialize.Data1);
        });
});

describe('NATReq packet tests:', () => {

        const TEST_XML = '<tag>test</tag>';

        it('Serialization', () => {

                const packet = new NATReq(TEST_ID, TEST_ID+1, TEST_ID+2, TEST_ID+3, TEST_ID+4, TEST_XML);
                const buffer = packet.serialize(packet);
                const packetHeadAsInt32Array = new Int32Array(buffer.buffer, buffer.byteOffset, 8);
                const packetTailAsString = buffer.toString("ascii", 32, buffer.length-1);

                packetHeadAsInt32Array[0].should.be.equal(NATReq.NATReqCmd);  
                packetHeadAsInt32Array[1].should.be.equal(TEST_ID);
                packetHeadAsInt32Array[2].should.be.equal(TEST_ID+1);
                packetHeadAsInt32Array[3].should.be.equal(TEST_ID+2);
                packetHeadAsInt32Array[4].should.be.equal(TEST_ID+3);
                packetHeadAsInt32Array[5].should.be.equal(TEST_ID+4);
                packetHeadAsInt32Array[6].should.be.equal(NATReq.Tail);
                packetHeadAsInt32Array[7].should.be.equal(TEST_XML.length + 1);
                packetTailAsString.should.be.String().and.is.equal(TEST_XML);
        });

        it('Deserialization', () => {

                const natToSerialize = new NATReq(TEST_ID, TEST_ID+1, TEST_ID+2, TEST_ID+3, TEST_ID+4, TEST_XML);
                const deserializedNat = NATReq.deserialize(natToSerialize.serialize());

                deserializedNat.ConnectionID.should.be.equal(natToSerialize.ConnectionID);
                deserializedNat.Data1.should.be.equal(natToSerialize.Data1);
                deserializedNat.Data2.should.be.equal(natToSerialize.Data2);
                deserializedNat.Data3.should.be.equal(natToSerialize.Data3);
                deserializedNat.Data4.should.be.equal(natToSerialize.Data4);

                deserializedNat.CmdTail.should.be.equal(natToSerialize.CmdTail);
                deserializedNat.XMLLength.should.be.equal(natToSerialize.XMLLength);

                deserializedNat.XML.should.be.equal(natToSerialize.XML);
        });
});

const randomInt = (max) => Math.floor(Math.random() * max);
const randomInt32 = () => randomInt(0x7FFFFFFF);

describe('BinPayload packet tests:', () => {

        const BUFFER_SIZE = 0xFF;

        it('Serialization', function() {

                const paramsBase = randomInt32();
                const params = Array.from({ length: 6 }, (value, index) => paramsBase + index);
                const range0_FF = Uint8Array.from({ length: BUFFER_SIZE }, (value, index) => index);
                const packet = new BinPayload(...params, new Buffer.from(range0_FF));
                const buffer = packet.serialize();

                for (let i = 0; i < 6; i++)                
                        buffer.readUInt32LE(i * 4).should.be.equal(params[i]);

                for (let j = 0; j < BUFFER_SIZE; j++)
                        buffer.readUInt8(24 + j).should.be.equal(range0_FF[j]);

        });

        it('Deserialization', function() {

                const paramsBase = randomInt32();
                const params = Array.from({ length: 6 }, (value, index) => paramsBase + index);
                const range0_FF = Uint8Array.from({ length: BUFFER_SIZE }, (value, index) => index);
                const packetToSerialize = new BinPayload(...params, new Buffer.from(range0_FF));
                const deserializedPacket = BinPayload.deserialize(packetToSerialize.serialize());

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.ConnectionID.should.be.equal(packetToSerialize.ConnectionID);
                deserializedPacket.Data1.should.be.equal(packetToSerialize.Data1);
                deserializedPacket.Data2.should.be.equal(packetToSerialize.Data2);
                deserializedPacket.Data3.should.be.equal(packetToSerialize.Data3);
                deserializedPacket.Data4.should.be.equal(packetToSerialize.Data4);

                for (let j = 0; j < BUFFER_SIZE; j++)
                        deserializedPacket.payload.readUInt8(j).should.be.equal(packetToSerialize.payload.readUInt8(j));

        });
});

describe('DVRAuth packet tests:', () => {

        it('Serialization', () => {
                
                const paramsBase = randomInt32();
                const params = Array.from({ length: 5 }, (value, index) => paramsBase + index);
                const attachedBuffer = new Buffer.from(DVRAuth.Raw, "hex");
                const packet = new DVRAuth(...params, attachedBuffer);
                const serializedBuffer = packet.serialize();

                serializedBuffer.readUInt32LE(0 * 4).should.be.equal(DVRAuth.Head);
                for (let i = 1; i < 6; i++)                
                        serializedBuffer.readUInt32LE(i * 4).should.be.equal(params[i-1]);

                attachedBuffer.length.should.be.equal(packet.payload.length);
                for (let j = 0; j < attachedBuffer.length; j++)
                        serializedBuffer.readUInt8(24 + j).should.be.equal(attachedBuffer[j]);

        });
});

describe('QuerySystemCaps packet tests:', () => {

        it('Serialization', () => {

                const paramsBase = randomInt32();
                const params = Array.from({ length: 5 }, (value, index) => paramsBase + index);
                const attachedBuffer = new Buffer.from(QuerySystemCaps.Raw, "hex");
                const packet = new QuerySystemCaps(...params, attachedBuffer);
                const serializedBuffer = packet.serialize();

                serializedBuffer.readUInt32LE(0 * 4).should.be.equal(QuerySystemCaps.Head);
                for (let i = 1; i < 6; i++)                
                        serializedBuffer.readUInt32LE(i * 4).should.be.equal(params[i-1]);

                attachedBuffer.length.should.be.equal(packet.payload.length);
                for (let j = 0; j < attachedBuffer.length; j++)
                        serializedBuffer.readUInt8(24 + j).should.be.equal(attachedBuffer[j]);

        });
});

describe('ChannelRequest packet tests:', () => {

        it('Serialization', () => {

                const referenceRawPacket2673 = Buffer.from('01010100b1b29405b3b29405b5b29405b4b29405b6b29405313131316d01000003000201050500000200000015010000facef55bd2eb4702bddd5ad5dc37e94a7d5d64aa742e4f53b7643e69908f57db0200000000000000000000000000000002000000d8cd876198b2477285273992f7a2c5df010000003c3f786d6c2076657273696f6e3d27312e302720656e636f64696e673d277574662d38273f3e3c726571756573742076657273696f6e3d27312e30272073797374656d547970653d274e564d532d393030302720636c69656e74547970653d27535953273e3c6465737449643e7b30303030303030322d303030302d303030302d303030302d3030303030303030303030307d3c2f6465737449643e3c7461736b49643e7b36313837434444382d423239382d373234372d383532372d3339393246374132433544467d3c2f7461736b49643e3c63684e6f3e303c2f63684e6f3e3c617564696f3e303c2f617564696f3e3c73747265616d547970653e323c2f73747265616d547970653e3c2f726571756573743e', 'hex');
                const serializedChannelRequestPacket = new ChannelRequest(
                        0x0594b2b1, 0x0594b2b3, 0x0594b2b5, 0x0594b2b4, 0x0594b2b6, 
                        0, '6187CDD8-B298-7247-8527-3992F7A2C5DF', '00000002-0000-0000-0000-000000000000').serialize();

                referenceRawPacket2673.equals(serializedChannelRequestPacket).should.be.true();
        });
});

describe('VideoFeedRequest packet tests:', () => {

        it('Serialization', () => {

                const referenceRawPacket2873 = Buffer.from('01010100b1b29405c1b29405c6b29405c2b29405c7b2940531313131cc01000003000101060500000f00000088010000ee8220c41dc945568ee9bd3f657ef9927d5d64aa742e4f53b7643e69908f57db05000000000000000000000000000000020000003c3f786d6c2076657273696f6e3d27312e302720656e636f64696e673d277574662d38273f3e3c726571756573742076657273696f6e3d27312e30272073797374656d547970653d274e564d532d393030302720636c69656e74547970653d27535953273e3c6465737449643e7b30303030303030352d303030302d303030302d303030302d3030303030303030303030307d3c2f6465737449643e3c7461736b49643e7b30333334454334442d353641442d324634432d383242362d4135314530363131383733357d3c2f7461736b49643e3c7472616e73706f7274436f6e74656e743e3c6974656d2069643d227b30303030303030352d303030302d303030302d303030302d3030303030303030303030307d2220696e6465783d2230223e3c7375623e3c7265733e333532783234303c2f7265733e3c6670733e323c2f6670733e3c516f492075696e743d224b627073223e3132383c2f516f493e3c2f7375623e3c2f6974656d3e3c2f7472616e73706f7274436f6e74656e743e3c2f726571756573743e', 'hex');
                const serializedVideoFeedRequest = new VideoFeedRequest(
                        0x0594b2b1, 0x0594b2c1, 0x0594b2c6, 0x0594b2c2, 0x0594b2c7,
                        '0334EC4D-56AD-2F4C-82B6-A51E06118735', '00000005-0000-0000-0000-000000000000').serialize();

                referenceRawPacket2873.equals(serializedVideoFeedRequest).should.be.true();
        });
});

// describe('UUID tests:', () => {

//         it('fasdf', () => {

//                 let x = uuidv4();
//                 console.log(uuidv4.NIL);
//                 console.log(x);

//         });
// });
