import * as should from 'should';
import { XMLHttpRequest } from "xmlhttprequest";
import xml2js from "xml2js";
import { NATDiscover } from "../../networking.js";
import { autoNATURI, autoNATPort } from "../../privateData.js";

describe('NAT Discovery tests', function() {

        this.timeout(5000);

        it('NATDiscovery returns DVR IP address', (done) => {

                let xhr = new XMLHttpRequest();
                xhr.open('GET', `http://c2.autonat.com:${autoNATPort}${autoNATURI}`);

                xhr.onload = function handler() {

                        if (xhr.status == 200) {

                                // Suppress console log
                                const consoleLog = console.log;
                                console.log = function() {};

                                // convert XML to JSON
                                xml2js.parseString(xhr.responseText, (err, xmlObj) => {
                                        if (err) throw err

                                        // map addresses and ports to a vector of promises
                                        // first NAT point fulfilled (any!) responce wins
                                        Promise.any(xmlObj.NatServerList.Item.map(NATPoint => 
                                                        NATDiscover(NATPoint.Addr[0], parseInt(NATPoint.Port[0])) 
                                        ))
                                        .then((res) => {
                                                res.should.have.property('DVR');
                                                res.should.have.property('NAT');
                                                //res.should.have('ddd');
                                                // console.log(res);
                                                //xhr.close();
                                                done();
                                                setTimeout(() => console.log = consoleLog, 3000);
                                        })
                                        // .catch(() => { console.log('123') });
                                });
                        }
                }

                xhr.send()
        })
});