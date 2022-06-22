import { Reply } from '../..';
import Command from '../../command';

export default class ConnectCommand extends Command {
    execute(host: string, port: number | string) {
        return super.execute(`host:connect:${host}:${port}`).then((reply) => {
            switch (reply) {
                case Reply.OKAY:
                    return this.parser_.readValue().then((value) => {
                        const regExp = /connected to|already connected/;
                        if (regExp.test(value.toString())) {
                            return host + ':' + port;
                        } else {
                            throw new Error(value.toString());
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
