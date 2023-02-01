import * as should from 'should';
import { GetNATAndDVRAddresses, NATRegisterConnection, DVRConnect } from "../../networking.js";

describe('NAT Discovery tests', function() {

        const AFTER_TEST_PAUSE = 5000;
        const consoleLog = console.log;
        this.timeout(10000);

        // before('Preparation', () => {
        //         // Suppress console log
        //         console.log = () => {};
        // });

        // after('Tear down', () => {
        //         setTimeout(() => console.log = consoleLog, AFTER_TEST_PAUSE);
        // })

        it('Can get NAT and DVR IP addresses', (done) => {
                // console.log = consoleLog;
                GetNATAndDVRAddresses().then((addr) => {
                        addr.should.have.property('DVR');
                        addr.DVR.should.have.property('host');
                        addr.DVR.should.have.property('port');
                        addr.should.have.property('NAT');
                        addr.NAT.should.have.property('host');
                        addr.NAT.should.have.property('port');
                        console.log(addr);
                        done();
                        //setTimeout(() => { done() }, AFTER_TEST_PAUSE);
                })
                .catch(() => {});
        });

        it.skip('Can register DVR connection ID', (done) => {
                const CONN_ID = new Date().valueOf() & 0x7FFFFFFF;

                GetNATAndDVRAddresses().then((addr) => {
                        // console.log = consoleLog;
                        NATRegisterConnection(addr.NAT.host, addr.NAT.port, CONN_ID).then((connID) => {
                                connID.should.be.equal(CONN_ID);
                                setTimeout(() => { done() }, AFTER_TEST_PAUSE);
                        });
                });                
        });

        // it.skip('quick test NATRegisterConnection', (done) => {

        //         console.log = consoleLog;
        //         NATRegisterConnection('47.91.72.135', 8989, 4444444).then(() => done());
        // });

        // DVR 45.137.113.118
        it.skip('DVR conversation', (done) => {
                const DVRconnectionID = new Date().valueOf() & 0x7FFFFFFF;

                GetNATAndDVRAddresses()
                .then((addr) => {
                        NATRegisterConnection(addr.NAT.host, addr.NAT.port, DVRconnectionID)
                        .then((connID) => { 
                                console.log = consoleLog; 
                                return DVRConnect(addr.DVR.host, addr.DVR.port, connID); 
                        })
                        .then(() => done());
                });
        });
});