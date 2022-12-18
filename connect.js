import { XMLHttpRequest } from "xmlhttprequest";
import xml2js from "xml2js";
import { tryObtainPublicIP } from "./resolve-ip.js";

let xhr = new XMLHttpRequest()

const autoNATURI = '/NatServer/CNatServerList.xml?SN=N124F03AR35B&CT=IOS&VER=1.11.1.6019&APPID=IOS%5FM%5FPH%5FSuperLivePlus&APPUSERID=F18B77A5AD8648649958CAE373D933B3'
const autoNATPort = 40002

xhr.open('GET', `http://c2.autonat.com:${autoNATPort}${autoNATURI}`)

xhr.onload = function () {

        if (xhr.status == 200) {

                // console.log( xhr.responseText )
                
                // convert XML to JSON
                xml2js.parseString(xhr.responseText, (err, result) => {
                        if (err) throw err

                        // console.log('Retrieved NAT hosts:')
                        for (const NATServer of result.NatServerList.Item) {
                                // console.log(' *', NATServer.Addr[0], ':', NATServer.Port[0]);
                                tryObtainPublicIP(NATServer.Addr[0], NATServer.Port[0]);
                        }
                })

                //console.log(xmlDoc);

        } else {

                console.log(`Error: ${xhr.status}`)

        }
}

xhr.send()