import { AdbClient } from '../../lib/client';
import { AdbDevice } from '../../lib/device';
import { AdbMock } from '../../mockery/mockAdbServer';

describe('List packages tests', () => {
    it('Should list packages', async () => {
        const adbMock = new AdbMock([
            { cmd: 'host:transport:serial', res: null, rawRes: true },
            {
                cmd: 'shell:pm list packages 2>/dev/null',
                res: `package:one
package:two.three
package:four`,
                rawRes: true
            }
        ]);
        try {
            const port = await adbMock.start();
            const adb = new AdbClient({ noAutoStart: true, port });
            const result = await new AdbDevice(adb, {
                id: 'serial',
                state: 'device',
                path: 'path',
                device: 'device',
                model: 'model',
                product: 'product',
                transportId: 'transportId',
                transport: 'usb'
            }).listPackages();
            expect(result).toEqual(['one', 'two.three', 'four']);
        } finally {
            await adbMock.end();
        }
    });
});
