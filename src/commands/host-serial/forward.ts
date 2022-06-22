import Command from '../../command';
import { Reply } from '../..';

export default class ForwardCommand extends Command {
    execute(serial: string, local: string, remote: string): Promise<void> {
        return super
            .execute(`host-serial:${serial}:forward:${local};${remote}`)
            .then((reply) => {
                switch (reply) {
                    case Reply.OKAY:
                        return this.parser_.readAscii(4).then((reply) => {
                            switch (reply) {
                                case Reply.OKAY:
                                    return;
                                case Reply.FAIL:
                                    return this.parser_
                                        .readError()
                                        .then((e) => {
                                            throw e;
                                        });
                                default:
                                    throw this.parser_.unexpected(
                                        reply,
                                        'OKAY or FAIL'
                                    );
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
