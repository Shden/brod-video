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

                        // console.log('Retrieved NAT hosts:')
                        for (const NATServer of result.NatServerList.Item) {
                                // console.log(' *', NATServer.Addr[0], ':', NATServer.Port[0]);
                                NATDiscovery2(NATServer.Addr[0], NATServer.Port[0])
                                        .then((result) => { console.log(result); })
                                        .catch((error) => {})
                        }
                });

                //console.log(xmlDoc);

        } else {

                console.log(`Error: ${xhr.status}`)

        }
}

xhr.send()