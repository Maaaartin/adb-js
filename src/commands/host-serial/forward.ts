import Command from '../../command';
import { Reply } from '../..';

export default class ForwardCommand extends Command {
    execute(serial: string, local: string, remote: string): Promise<void> {
        return this.initExecute(
            `host-serial:${serial}:forward:${local};${remote}`
        ).then((reply) => {
            switch (reply) {
                case Reply.OKAY:
                    return this.parser.readAscii(4).then((reply) => {
                        switch (reply) {
                            case Reply.OKAY:
                                return;
                            case Reply.FAIL:
                                return this.parser.readError().then((e) => {
                                    throw e;
                                });
                            default:
                                throw this.parser.unexpected(
                                    reply,
                                    'OKAY or FAIL'
                                );
                        }
                    });
                case Reply.FAIL:
                    return this.parser.readError().then((e) => {
                        throw e;
                    });
                default:
                    throw this.parser.unexpected(reply, 'OKAY or FAIL');
            }
        });
    }
}
