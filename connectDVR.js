import udp from "dgram";

export function connectDVR(ip, port)
{
        return new Promise((resolve, reject) => {

                var client = udp.createSocket('udp4');

        });
}

await connectDVR('85.211.159.123', 17534);