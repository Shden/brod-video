import * as should from 'should';
import { GetNATAndDVRAddresses, NATRegisterConnection, DVRConnect } from "../../networking.js";

describe('NAT Discovery tests', function() {

        const consoleLog = console.log;
        this.timeout(20000);

        before('Preparation', () => {
                // Suppress console log
                console.log = () => {};
        });

        after('Tear down', () => {
                setTimeout(() => console.log = consoleLog, 3000);
        })

        it('Can get NAT and DVR IP addresses', (done) => {
                GetNATAndDVRAddresses().then((addr) => {
                        addr.should.have.property('DVR');
                        addr.DVR.should.have.property('host');
                        addr.DVR.should.have.property('port');
                        addr.should.have.property('NAT');
                        addr.NAT.should.have.property('host');
                        addr.NAT.should.have.property('port');
                        done();
                });
        });

        it('Can register DVR connection ID', (done) => {
                const CONN_ID = new Date().valueOf() & 0x7FFFFFFF;

                GetNATAndDVRAddresses()
                .then((addr) => {
                        // console.log = consoleLog;
                        NATRegisterConnection(addr.NAT.host, addr.NAT.port, CONN_ID)
                        .then((connID) => {
                                connID.should.be.equal(CONN_ID);
                                done();
                        });
                });                
        });

        it.skip('quick test NATRegisterConnection', (done) => {

                console.log = consoleLog;
                NATRegisterConnection('47.91.72.135', 8989, 4444444).then(() => done());
        });

        it.skip('DVR conversation', (done) => {
                const DVRconnectionID = new Date().valueOf() & 0x7FFFFFFF;

                GetNATAndDVRAddresses()
                .then((addr) => {
                        NATRegisterConnection(addr.NAT.host, addr.NAT.port, DVRconnectionID)
                        .then((connID) => { console.log = consoleLog; DVRConnect(addr.DVR.host, addr.DVR.port, connID); })
                        .then(() => done());
                });
        });
});