import { Cmd28 } from '../cmd28.js';
import { Cmd24 } from '../cmd24.js';
import { NATCmd } from '../natCmd.js';
import { DVRCmd, QueryOnlineChlList } from '../dvrCmd.js';
import { DVRAuth } from '../dvrCmd.js';
import { QuerySystemCaps } from '../dvrCmd.js';
import { ChannelRequest } from '../dvrCmd.js';
import { VideoFeedRequest } from '../dvrCmd.js';
import * as should from 'should';
import { UUID } from '../../uuid.js';

const TEST_ID = 0x1F2E3D4C;

describe('Cmd28 packet tests:', function() {

        it('Serialization', function() {

                const packet = new Cmd28(Cmd28.CmdID_NAT, TEST_ID, 0, 0, TEST_ID+1);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd28.CmdID_NAT);
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(4 * 4).should.be.equal(TEST_ID+1);
                buffer.readUInt32LE(6 * 4).should.be.equal(Cmd28.Tail);
        });

        it('Deserialization', function() {

                const packetToSerialize = new Cmd28(Cmd28.CmdID_NAT, TEST_ID);
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

                const packet = new Cmd24(Cmd24.CmdID_DVR, TEST_ID, TEST_ID+1, TEST_ID+2);
                const buffer = packet.serialize();

                buffer.readUInt32LE(0 * 4).should.be.equal(Cmd24.CmdID_DVR);  
                buffer.readUInt32LE(1 * 4).should.be.equal(TEST_ID);
                buffer.readUInt32LE(2 * 4).should.be.equal(TEST_ID+1);
                buffer.readUInt32LE(3 * 4).should.be.equal(TEST_ID+2)
        });

        it('Deserialization', () => {

                const cmd24ToSerialize = new Cmd24(Cmd24.CmdID_DVR, TEST_ID, TEST_ID+1);
                const deserializedCmd24 = Cmd24.deserialize(cmd24ToSerialize.serialize());

                deserializedCmd24.CmdHead.should.be.equal(cmd24ToSerialize.CmdHead);
                deserializedCmd24.ConnectionID.should.be.equal(cmd24ToSerialize.ConnectionID);
                deserializedCmd24.Data1.should.be.equal(cmd24ToSerialize.Data1);
        });
});

describe('NATCmd packet tests:', () => {

        const TEST_XML = '<tag>test</tag>';

        it('Serialization', () => {

                const packet = new NATCmd(TEST_XML);
                packet.ConnectionID = TEST_ID;
                packet.Data1 = TEST_ID + 1;
                packet.Data2 = TEST_ID + 2;
                packet.Data3 = TEST_ID + 3;
                packet.Data4 = TEST_ID + 4;
                const buffer = packet.serialize(packet);
                const packetHeadAsInt32Array = new Int32Array(buffer.buffer, buffer.byteOffset, 8);
                const packetTailAsString = buffer.toString("ascii", 32, buffer.length-1);

                packetHeadAsInt32Array[0].should.be.equal(NATCmd.CmdID);  
                packetHeadAsInt32Array[1].should.be.equal(TEST_ID);
                packetHeadAsInt32Array[2].should.be.equal(TEST_ID+1);
                packetHeadAsInt32Array[3].should.be.equal(TEST_ID+2);
                packetHeadAsInt32Array[4].should.be.equal(TEST_ID+3);
                packetHeadAsInt32Array[5].should.be.equal(TEST_ID+4);
                packetHeadAsInt32Array[6].should.be.equal(NATCmd.Tail);
                packetHeadAsInt32Array[7].should.be.equal(TEST_XML.length + 1);
                packetTailAsString.should.be.String().and.is.equal(TEST_XML);
        });

        it('Deserialization', () => {

                const natToSerialize = new NATCmd(TEST_XML);
                natToSerialize.ConnectionID = TEST_ID;
                natToSerialize.Data1 = TEST_ID + 1;
                natToSerialize.Data2 = TEST_ID + 2;
                natToSerialize.Data3 = TEST_ID + 3;
                natToSerialize.Data4 = TEST_ID + 4;
                const deserializedNat = NATCmd.deserialize(natToSerialize.serialize());

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

describe('DVRCmd packet tests:', () => {

        const BUFFER_SIZE = 0xFF;

        it('Serialization', function() {

                const paramsBase = randomInt32();
                const params = Array.from({ length: 6 }, (value, index) => paramsBase + index);
                const range0_FF = Uint8Array.from({ length: BUFFER_SIZE }, (value, index) => index);
                const packet = new DVRCmd(...params, new Buffer.from(range0_FF));
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
                const packetToSerialize = new DVRCmd(...params, new Buffer.from(range0_FF));
                const deserializedPacket = DVRCmd.deserialize(packetToSerialize.serialize());

                deserializedPacket.CmdHead.should.be.equal(packetToSerialize.CmdHead);
                deserializedPacket.ConnectionID.should.be.equal(packetToSerialize.ConnectionID);
                deserializedPacket.Data1.should.be.equal(packetToSerialize.Data1);
                deserializedPacket.Data2.should.be.equal(packetToSerialize.Data2);
                deserializedPacket.Data3.should.be.equal(packetToSerialize.Data3);
                deserializedPacket.Data4.should.be.equal(packetToSerialize.Data4);

                for (let j = 0; j < BUFFER_SIZE; j++)
                        deserializedPacket.payload.readUInt8(j).should.be.equal(packetToSerialize.payload.readUInt8(j));

        });

        it('Decode and validate hasNextBlock flag', () => {

                const p1 = '01010100c7e6ee7ec8e6ee7ec7e6ee7ec9e6ee7ec8e6ee7e313131313800000006000000020a00000000000028000000010000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000020000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000030000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000040000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000050000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000060000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000070000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a00000000000028000000080000000000000000000000000000000b0100000100000088595c03d02c968c2c56c802108e7a00313131313800000006000000020a0000000000002800000009000000000000000000000000000000080100000100000088595c03d02c968c2c56c802108e7a00313131317801000006000001010100100000000068010000b8c0c8be533640a2ad88670b21f570d401140000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007cc50c2ee2b24c7f968144f45e6cef71000000000000000000000000000000000000000000000000000000000000000002000100200001004e313234463033415233354200000000000000000000000000000000000000000100010014000900000300000100000000000000000000000000000000000100020000000000000000000000000000000002020003000000000000000000000000000000000403000400000000000000000000000000000000010400050000000000000000000000000000000005050006000000000000000000000000000000000606000700000000000000000000000000000000070700080000000000000000000000000000000108000009000000000000000000000000000000';
                const p2 = '01010100c7e6ee7ec9e6ee7ec7e6ee7ecae6ee7ec8e6ee7e313131316c00000006000000010a0000000000005c0000008100000001000000000000000000000000000000010000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000313131316c00000006000000010a0000000000005c0000008100000003000000000000000000000000000000010000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000313131316c00000006000000010a0000000000005c0000008100000004000000000000000000000000000000010000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40100000000000000000000000000000006000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40200000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40300000000000000000000000000000006000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40400000000000000000000000000000006000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40500000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40600000000000000000000000000000006000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40700000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40800000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40900000000000000000000000000000002000000';
                let cmd1 = DVRCmd.deserialize(Buffer.from(p1, 'hex'));
                cmd1.decodeSegments();
                cmd1.hasNextBlock.should.be.True;
                // cmd1.printSegments();

                let cmd2 = DVRCmd.deserialize(Buffer.from(p2, 'hex'));
                cmd2.decodeSegments();
                cmd2.hasNextBlock.should.be.False;
                // cmd2.printSegments();
        });

        describe('Data segmentation', () => {

                // doc/conversations/DVR conversation 24122022.xlsm, tab slcapture050223-1ch
                const p11 = '01010100bdae6422beae6422bdae6422bfae6422beae6422313131317801000006000001010100100000000068010000b8c0c8be533640a2ad88670b21f570d401140000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a2b6e02e67143e791f1515cd80709e3000000000000000000000000000000000000000000000000000000000000000002000100200001004e313234463033415233354200000000000000000000000000000000000000000100010014000900000300000100000000000000000000000000000000000100020000000000000000000000000000000002020003000000000000000000000000000000000403000400000000000000000000000000000000010400050000000000000000000000000000000005050006000000000000000000000000000000000606000700000000000000000000000000000000070700080000000000000000000000000000000108000009000000000000000000000000000000';
                const p14 = '01010100bdae6422bfae6422bdae6422c0ae6422beae6422313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40100000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40200000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40300000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40400000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40500000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40600000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40700000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40800000000000000000000000000000002000000313131313400000006000000030a00000000000024000000b8c0c8be533640a2ad88670b21f570d40900000000000000000000000000000002000000313131313800000006000000020a00000000000028000000010000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000020000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000030000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000040000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000050000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000060000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000070000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000080000000000000000000000000000000b01000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000090000000000000000000000000000000801000001000000289e0303d0bc968cec658002108e7a00313131313800000006000000020a00000000000028000000a993accb2f0446a8be9504161eb669a00300000001000000289e0303d0bc968cec658002108e7a00';

                it('getSegments() selector works', () => {


                        const cmd11 = DVRCmd.deserialize(Buffer.from(p11, 'hex'));
                        const cmd14 = DVRCmd.deserialize(Buffer.from(p14, 'hex'));

                        const combinedCmd = new DVRCmd();
                        combinedCmd.payload = Buffer.concat([cmd11.payload, cmd14.payload]);
                        //combinedCmd.decodeSegments();
                        //combinedCmd.printSegments();

                        combinedCmd.getSegments(0x0101).length.should.be.equal(1);
                        combinedCmd.getSegments(0x0a03).length.should.be.equal(9);
                        combinedCmd.getSegments(0x0a02).length.should.be.equal(10);

                        const videoSessionID = combinedCmd.getSegments(0x0101, 108, 16)[0]; // is a Buffer
                        videoSessionID.toString('hex').should.be.equal('3a2b6e02e67143e791f1515cd80709e3');
                });
        });

});

describe('DVRAuth packet tests:', () => {

        it('Serialization', () => {
                
                const paramsBase = randomInt32();
                const params = Array.from({ length: 5 }, (value, index) => paramsBase + index);
                const attachedBuffer = new Buffer.from(DVRAuth.Raw, "hex");
                const packet = new DVRAuth(...params, attachedBuffer);
                const serializedBuffer = packet.serialize();

                serializedBuffer.readUInt32LE(0 * 4).should.be.equal(DVRAuth.CmdID);
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

                serializedBuffer.readUInt32LE(0 * 4).should.be.equal(QuerySystemCaps.CmdID);
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
                
                const channelRequestPacket = new ChannelRequest(
                        0, UUID.from('6187CDD8-B298-7247-8527-3992F7A2C5DF'), UUID.from('00000002-0000-0000-0000-000000000000'));

                channelRequestPacket.ConnectionID = 0x0594b2b1;
                channelRequestPacket.Data1 = 0x0594b2b3;
                channelRequestPacket.Data2 = 0x0594b2b5;
                channelRequestPacket.Data3 = 0x0594b2b4;
                channelRequestPacket.Data4 = 0x0594b2b6;

                // console.log(channelRequestPacket.serialize().toString('hex'));
                // console.log(referenceRawPacket2673.toString('hex'));
                referenceRawPacket2673.equals(channelRequestPacket.serialize()).should.be.true();
        });
});

describe('VideoFeedRequest packet tests:', () => {

        it('Serialization', () => {

                const referenceRawPacket2873 = Buffer.from('01010100b1b29405c1b29405c6b29405c2b29405c7b2940531313131cc01000003000101060500000f00000088010000ee8220c41dc945568ee9bd3f657ef9927d5d64aa742e4f53b7643e69908f57db05000000000000000000000000000000020000003c3f786d6c2076657273696f6e3d27312e302720656e636f64696e673d277574662d38273f3e3c726571756573742076657273696f6e3d27312e30272073797374656d547970653d274e564d532d393030302720636c69656e74547970653d27535953273e3c6465737449643e7b30303030303030352d303030302d303030302d303030302d3030303030303030303030307d3c2f6465737449643e3c7461736b49643e7b30333334454334442d353641442d324634432d383242362d4135314530363131383733357d3c2f7461736b49643e3c7472616e73706f7274436f6e74656e743e3c6974656d2069643d227b30303030303030352d303030302d303030302d303030302d3030303030303030303030307d2220696e6465783d2230223e3c7375623e3c7265733e333532783234303c2f7265733e3c6670733e323c2f6670733e3c516f492075696e743d224b627073223e3132383c2f516f493e3c2f7375623e3c2f6974656d3e3c2f7472616e73706f7274436f6e74656e743e3c2f726571756573743e', 'hex');
                const videoFeedRequest = new VideoFeedRequest(
                        '0334EC4D-56AD-2F4C-82B6-A51E06118735', '00000005-0000-0000-0000-000000000000');
                videoFeedRequest.ConnectionID = 0x0594b2b1;
                videoFeedRequest.Data1 = 0x0594b2c1;
                videoFeedRequest.Data2 = 0x0594b2c6;
                videoFeedRequest.Data3 = 0x0594b2c2;
                videoFeedRequest.Data4 = 0x0594b2c7;
        
                referenceRawPacket2873.equals(videoFeedRequest.serialize()).should.be.True;
        });
});

describe('QueryOnlineChlList packet tests:', () => {

        it('Serialization', () => {

                const referenceRawPacket2675 = Buffer.from('01010100b1b29405b5b29405b5b29405b6b29405b6b29405313131311b010000030000011b090000040000000b01000061646d696e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000071756572794f6e6c696e6543686c4c697374000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003c3f786d6c2076657273696f6e3d27312e302720656e636f64696e673d277574662d38273f3e3c726571756573742076657273696f6e3d27312e30272073797374656d547970653d274e564d532d393030302720636c69656e74547970653d274d4f42494c45272075726c3d2771756572794f6e6c696e6543686c4c697374273e3c2f726571756573743e');
                const queryOnlineChlList = new QueryOnlineChlList();
                queryOnlineChlList.ConnectionID = 0x0594b2b1;
                queryOnlineChlList.Data1 = 0x0594b2b5; 
                queryOnlineChlList.Data2 = 0x0594b2b5; 
                queryOnlineChlList.Data3 = 0x0594b2b6;
                queryOnlineChlList.Data4 = 0x0594b2b6;

                referenceRawPacket2675.equals(queryOnlineChlList.serialize()).should.be.True;
        });

});

