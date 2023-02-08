import { Buffer } from 'node:buffer';
import { stringify } from 'node:querystring';

const UUID_SIZE = 16;

export class UUID
{
        constructor()
        {
                this.data = Buffer.allocUnsafe(UUID_SIZE);
                for (let i=0; i<UUID_SIZE; i++)
                        this.data[i] = Math.random() * 255;
        }

        toString()
        {
                return this.data.readUInt32LE(0).toString(16).toUpperCase().padStart(8, '0') + '-' +
                        this.data.readUInt16LE(4).toString(16).toUpperCase().padStart(4, '0') + '-' +
                        this.data.readUInt16LE(6).toString(16).toUpperCase().padStart(4, '0') + '-' +
                        this.data.readUInt16BE(8).toString(16).toUpperCase().padStart(4, '0') + '-' +
                        (this.data.readUInt32BE(10).toString(16).toUpperCase() + 
                        this.data.readUInt16BE(14).toString(16).toUpperCase()).padStart(12, '0');
        }

        /**
         * Creeate UUID instance from a given value.
         * @param {Buffer | String} value 
         * @returns 
         */
        static from(value)
        {
                if (value instanceof Buffer)
                {
                        const u = new UUID();
                        value.copy(u.data, 0, 0, UUID_SIZE);
                        return u;
                } 

                // '6187CDD8-B298-7247-8527-3992F7A2C5DF'
                if (typeof(value) === 'string')
                {
                        const u = new UUID();
                        const uuidStrSeg = value.split('-');
                        u.data.writeUInt32LE(parseInt(uuidStrSeg[0], 16), 0);
                        u.data.writeUInt16LE(parseInt(uuidStrSeg[1], 16), 4);
                        u.data.writeUInt16LE(parseInt(uuidStrSeg[2], 16), 6);
                        u.data.writeUInt16BE(parseInt(uuidStrSeg[3], 16), 8);

                        const l = uuidStrSeg[4].substring(0, 8);
                        const r = uuidStrSeg[4].substring(8, 12);
                        u.data.writeUInt32BE(parseInt(l, 16), 10);
                        u.data.writeUInt16BE(parseInt(r, 16), 14);
                        return u;
                }
        }
}