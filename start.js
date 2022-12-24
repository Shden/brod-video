import { XMLHttpRequest } from "xmlhttprequest";
import xml2js from "xml2js";
//import { NATDiscovery } from "./discoveryNAT.js";
import { NATDiscovery2 } from "./discoveryNAT-2.js";
import { autoNATURI, autoNATPort } from "./privateData.js";

// const conversationID = Math.floor(Math.random() * 0xFFFFFFFF);

let xhr = new XMLHttpRequest();
xhr.open('GET', `http://c2.autonat.com:${autoNATPort}${autoNATURI}`);

xhr.onload = function () {

        if (xhr.status == 200) {

                // console.log( xhr.responseText )
                
                // convert XML to JSON
                xml2js.parseString(xhr.responseText, (err, result) => {
                        if (err) throw err

                        // map addresses and ports to a vector of promises
                        const x = result.NatServerList.Item.map((NATPoint) => {
                                return NATDiscovery2(NATPoint.Addr[0], NATPoint.Port[0])
                        });

                        // first NAT point responce wins
                        Promise.race(x).then((res) => console.log(res) )
                });

        } else {

                console.log(`Error: ${xhr.status}`)

        }
}

xhr.send()