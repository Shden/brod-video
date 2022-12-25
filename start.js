import { XMLHttpRequest } from "xmlhttprequest";
import xml2js from "xml2js";
import { NATDiscover, DVRConnect } from "./networking.js";
import { autoNATURI, autoNATPort } from "./privateData.js";

let xhr = new XMLHttpRequest();
xhr.open('GET', `http://c2.autonat.com:${autoNATPort}${autoNATURI}`);

xhr.onload = function () {

        if (xhr.status == 200) {

                // console.log( xhr.responseText )
                
                // convert XML to JSON
                xml2js.parseString(xhr.responseText, (err, result) => {
                        if (err) throw err

                        // map addresses and ports to a vector of promises
                        const NATPointsDiscovery = result.NatServerList.Item.map((NATPoint) => {
                                return NATDiscover(NATPoint.Addr[0], parseInt(NATPoint.Port[0]))
                        });

                        // first NAT point responce wins
                        Promise.race(NATPointsDiscovery).then((res) => {
                                console.log(res);
                                DVRConnect(res.NAT.host, res.NAT.port, res.DVR.host, res.DVR.port);
                         });
                });

        } else {

                console.log(`Error: ${xhr.status}`)

        }
}

xhr.send()