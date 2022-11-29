import { MonkeyCallback, NotConnectedError } from '..';
import { NetConnectOpts, Socket } from 'net';
import Reply, { ReplyType } from './reply';
import Api from './api';
import Command from './command';
import CommandQueue from './commandqueue';
import Parser from './parser';

export default class Monkey extends Api {
    public readonly queue: Command[] = [];
    private parser: Parser = new Parser();
    protected stream?: Socket;

    getStream(): Socket {
        if (!this.stream) {
            throw new NotConnectedError();
        }
        return this.stream;
    }

    send(commands: string[] | string, cb: MonkeyCallback): this {
        if (Array.isArray(commands)) {
            for (const command of commands) {
                this.queue.push(new Command(command, cb));
            }
            this.getStream().write(commands.join('\n') + '\n');
        } else {
            this.queue.push(new Command(commands, cb));
            this.getStream().write('' + commands + '\n');
        }
        let hadError = true;
        const handler = (): void => {
            hadError = false;
        };
        const removeListeners = (): void => {
            this.getStream().removeListener('data', handler);
            // this.getStream().removeListener('error', handler);
            this.getStream().removeListener('end', handler);
            this.getStream().removeListener('finish', handler);
        };

        this.getStream().on('data', handler);
        // this.getStream().on('error', handler);
        this.getStream().on('end', handler);
        this.getStream().on('finish', handler);
        setTimeout(() => {
            if (hadError)
                this.consume(new Reply(ReplyType.ERROR, 'Command failed'));
            removeListeners();
        }, 100);

        return this;
    }

    protected hook(): void {
        this.getStream().on('data', (data) => {
            return this.parser.parse(data);
        });
        this.getStream().on('error', (err) => {
            return this.emit('error', err);
        });
        this.getStream().on('end', () => {
            return this.emit('end');
        });
        this.getStream().on('finish', () => {
            return this.emit('finish');
        });
        this.parser.on('reply', (reply) => {
            return this.consume(reply);
        });
        this.parser.on('error', (err) => {
            return this.emit('error', err);
        });
    }

    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'finish', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    private consume(reply: Reply): void {
        const command = this.queue.shift();
        if (!command) {
            throw new Error(
                'Command queue depleted, but replies still coming in'
            );
        }

        if (reply.isError()) {
            return command.callback?.(reply.toError(), '', command.command);
        }
        command.callback?.(null, reply.value, command.command);
    }

    connect(options: NetConnectOpts): this;
    connect(stream: Socket): this;
    connect(param: Socket | NetConnectOpts): this {
        if (param instanceof Socket) {
            this.stream = param;
        } else {
            this.stream = new Socket(param);
        }
        // TODO remove?
        this.stream.setMaxListeners(100);
        this.hook();
        return this;
    }

    end(): this {
        this.getStream().end();
        return this;
    }

    commandQueue(): CommandQueue {
        return new CommandQueue(this);
    }
}
