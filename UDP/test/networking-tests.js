import * as should from 'should';
import { GetNATAndDVRAddresses, NATRegisterConnection, DVRConnect } from "../../networking.js";

describe('NAT tests', function() {

        it('Can obtain NAT and DVR IP addresses', (done) => {
                GetNATAndDVRAddresses().then((addr) => {
                        addr.should.have.property('DVR');
                        addr.DVR.should.have.property('host');
                        addr.DVR.should.have.property('port');
                        addr.should.have.property('NAT');
                        addr.NAT.should.have.property('host');
                        addr.NAT.should.have.property('port');
                        console.log(addr);
                        done();
                })
                .catch(() => {});
        });
});

describe('DVR tests', function () {

        this.timeout(60000);

        // it.skip('Can register DVR connection ID', (done) => {
        //         const CONN_ID = new Date().valueOf() & 0x7FFFFFFF;

        //         GetNATAndDVRAddresses().then((addr) => {
        //                 NATRegisterConnection(addr.NAT.host, addr.NAT.port, CONN_ID).then((connID) => {
        //                         connID.should.be.equal(CONN_ID);
        //                         done();
        //                 });
        //         });                
        // });

        it('DVR conversation', (done) => {
                const DVRconnectionID = new Date().valueOf() & 0x7FFFFFFF;

                GetNATAndDVRAddresses()
                .then((addr) => {
                        NATRegisterConnection(addr.NAT.host, addr.NAT.port, DVRconnectionID)
                        .then((connID) => {
                                connID.should.be.equal(DVRconnectionID);
                                return DVRConnect(addr.DVR.host, addr.DVR.port, connID);
                        })
                        .then(() => done());
                });
        });

});

