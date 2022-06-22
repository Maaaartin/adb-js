import Command from '../../command';
import { Reply } from '../..';
import TransportCommand from '../tranport';

export default class RootCommand extends TransportCommand {
    execute(serial: string): Promise<void> {
        return super.execute(serial, 'root:').then((reply) => {
            switch (reply) {
                case Reply.OKAY:
                    return this.parser_.readAll().then((value) => {
                        const valueStr = value.toString();
                        if (/restarting adbd as root/.test(valueStr)) {
                            return;
                        } else {
                            throw new Error(valueStr.trim());
                        }
                    });
                case Reply.FAIL:
                    return this.parser_.readError().then((e) => {
                        throw e;
                    });
                default:
                    throw this.parser_.unexpected(reply, 'OKAY or FAIL');
            }
        });
    }
}
