import { AdbMock } from '../../mockery/mockAdbServer';
import { promisify } from 'util';
import { getDevice } from '../../mockery/testDevice';
import { Readable } from 'stream';

describe('Device Push tests', () => {
    test('Should push file', async () => {
        const buff = Buffer.from([4, 0, 0, 0]);
        const adbMock = new AdbMock([
            { cmd: 'host:transport:serial', res: null, rawRes: true },
            {
                cmd: 'sync:',
                res: 'OKAY' + buff.toString(),
                rawRes: true
            }
        ]);
        try {
            const port = await adbMock.start();
            const result = await promisify<void>(async (cb) => {
                const transfer = await getDevice(port).push(
                    Readable.from(Buffer.from([1, 0, 0, 0])),
                    '/sdcard'
                );

                transfer.on('error', (err) => {
                    return cb(err);
                });

                transfer.on('end', () => {
                    cb(null);
                });
            })();
            expect(result).toBeUndefined();
        } finally {
            await adbMock.end();
        }
    });
});
