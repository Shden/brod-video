import * as should from 'should';
import { GetNATAndDVRAddresses, NATRegisterConnection } from "../../networking.js";

describe('NAT Discovery tests', function() {

        const consoleLog = console.log;
        this.timeout(20000);

        before('Preparation', () => {
                // Suppress console log
                console.log = function() {};
        });

        after('Tear down', () => {
                setTimeout(() => console.log = consoleLog, 3000);
        })

        it('Can get NAT and DVR IP addresses', (done) => {
                GetNATAndDVRAddresses().then((res) => {
                        res.should.have.property('DVR');
                        res.DVR.should.have.property('host');
                        res.DVR.should.have.property('port');
                        res.should.have.property('NAT');
                        res.NAT.should.have.property('host');
                        res.NAT.should.have.property('port');
                        done();
                });
        });

        it('Can register DVR connection ID', (done) => {
                const CONN_ID = 2345678;

                GetNATAndDVRAddresses().
                then((res) => setTimeout(() => {
                        // console.log = consoleLog;
                        NATRegisterConnection(res.NAT.host, res.NAT.port, CONN_ID)
                        .then((r) => {
                                r.should.be.equal(CONN_ID);
                                done();
                        });
                }, 3000));                
        });
});