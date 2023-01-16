import { GetNATAndDVRAddresses, NATGetDVRIP, DVRConnect } from "./networking.js";

GetNATAndDVRAddresses().then((res) => {
        console.log(res);
        DVRConnect(res.NAT.host, res.NAT.port, res.DVR.host, res.DVR.port);
})
.catch((err) => { console.log(err) });
