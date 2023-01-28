import { GetNATAndDVRAddresses, NATRegisterConnection, DVRConnect } from "./networking.js";

GetNATAndDVRAddresses()
.then((res) => {
        console.log(res);
        NATRegisterConnection(res.NAT.host, res.NAT.port, 1234567890)
        .then((connectionID) => DVRConnect(res.DVR.host, res.DVR.port, connectionID));
})
.catch((err) => { console.log(err) });
