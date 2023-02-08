import Command from '../command';
import { Reply } from '../../util';

export default class VersionCommand extends Command<number> {
    protected autoEnd = true;
    execute(): Promise<number> {
        return this.initExecute('host:version').then((reply) => {
            switch (reply) {
                case Reply.OKAY:
                    return this.parser.readValue().then((value) => {
                        return parseInt(value.toString(), 10);
                    });
                case Reply.FAIL:
                    return this.parser.readError().then((e) => {
                        throw e;
                    });
                default:
                    return parseInt(reply, 10);
            }
        });
    }
}
