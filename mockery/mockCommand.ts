import Command from '../lib/command';

export default class CommandMock extends Command {
    public execute(): Promise<void> {
        return this.initExecute('mock').then(this.handleReply(undefined));
    }
}
