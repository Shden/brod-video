import udp from "dgram";

const IP_RESOLUTION_TIMEOUT = 2000;

// Exchange snapshots:
/* 1 */ const clientRequest1_28   = "02000100e1b094050000000000000000e1b0940500000000fefe0001";
/* 2 */ const serverResponce1_28  = "02000100e1b09405e0b0940500000000e1b09405e1b09405fefe0001";
/* 3 */ const clientRequest2_28   = "02000100e1b09405e0b09405e0b09405e1b09405e2b09405fefe0001";
/* 4 */ const clientRequest3_143  = "02010100e1b09405e1b09405e0b09405e2b09405e1b09405000100006f0000003c4e61742076657273696f6e3d22302e342e302e31223e3c436d642069643d223130303036223e3c526571756573745365713e313c2f526571756573745365713e3c4465766963654e6f3e4e31323446303341523335423c2f4465766963654e6f3e3c2f436d643e3c2f4e61743e00";
/* 5 */ const clientRequest4_24   = "02030100e1b09405e1b09405e0b094050000000000000000";

export async function tryObtainPublicIP(host, port)
{
        return new Promise((resolve, reject) => {
                var client = udp.createSocket('udp4');

                client.on('message', function (msg, info) {
                        var received = msg.toString('hex');
                        console.log('Received %d bytes from %s:%d', 
                                msg.length, info.address, info.port, '\t', received);
        
                        if (received == serverResponce1_28) {
                                // console.log('Responce 1 received, sending 2nd command');
        
                                client.send(Buffer.from(clientRequest2_28, "hex"), port, host);
                                client.send(Buffer.from(clientRequest3_143, "hex"), port, host);
                                client.send(Buffer.from(clientRequest4_24, "hex"), port, host);

                                // client.send(Buffer.from(clientRequest2_28, "hex"), port, host, function(error) {
                                //         if (error) {
                                //                 console.log(error);
                                //                 client.close();
                                //         } else {
                                //                 // console.log('clientRequest2_28 done');
        
                                //                 client.send(Buffer.from(clientRequest3_143, "hex"), port, host, function(error) {
                                //                         if (error) {
                                //                                 console.log(error);
                                //                                 client.close();
                                //                         } else {
                                //                                 // console.log('clientRequest3_143 done');
        
                                //                                 client.send(Buffer.from(clientRequest4_24, "hex"), port, host, function(error) {
                                //                                         if (error) {
                                //                                                 console.log(error);
                                //                                                 client.close();
                                //                                         } else {
                                //                                                 // console.log('clientRequest4_24 done')
                                //                                         }
                                //                                 });
                                //                         }
                                //                 });
                                //         }
                                // });
        
                        }
                });

                client.send(Buffer.from(clientRequest1_28, "hex"), port, host, function (error) {
                        if (error) {
                                console.log(error);
                                client.close();
                        }// } else {
                        //         console.log('clientRequest1_28 is sent !');
                        // }
                });

                setTimeout(() => { client.close(); resolve(); }, IP_RESOLUTION_TIMEOUT);
        });
}

