import * as should from 'should';
import { UUID } from '../../uuid.js';

describe('UUID tests', () => {

        const buff = Buffer.from('d8cd876198b2477285273992f7a2c5df', 'hex');
        const strUUID = '6187CDD8-B298-7247-8527-3992F7A2C5DF';

        it('Can create from Buffer', () => {

                const uuid = UUID.from(buff);
                for (let i=0; i<16; i++)
                        uuid.data[i].should.be.equal(buff[i]);
        });

        it('Can create from String', () => {
                const uuid = UUID.from(strUUID);
                for (let i=0; i<16; i++)
                        uuid.data[i].should.be.equal(buff[i]);
        });

        it('Can stringify', () => {

                const uuid = UUID.from(buff);
                uuid.toString().should.be.equal(strUUID);

        });

});