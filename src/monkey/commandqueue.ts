import Api from './api';
import { BaseCommand, Command, ParsableCommand } from './command';
import Monkey from './client';
import { MonkeyCallback } from '..';

export default class Multi extends Api {
    private client: Monkey;
    private commands: BaseCommand<any>[] = [];
    private replies: any[] = [];
    private errors: string[] = [];
    private sent = false;
    private callback?: (err: Error | null, data: (string | null)[]) => void;
    constructor(client: Monkey) {
        super();
        this.client = client;
    }

    private collector(
        err: Error | null,
        value: any | null,
        command: string
    ): void {
        if (err) {
            this.errors.push(`${command}: ${err.message}`);
        }
        this.replies.push(value || null);
        return this.maybeFinish();
    }

    private maybeFinish(): void {
        if (this.client.queue.length === 0) {
            if (this.errors.length) {
                setImmediate(() => {
                    this.callback?.(new Error(this.errors.join(', ')), []);
                });
            } else {
                setImmediate(() => {
                    this.callback?.(null, this.replies);
                });
            }
        }
    }

    private forbidReuse(): void {
        if (this.sent) {
            throw new Error('Reuse not supported');
        }
    }

    private sendInternal(cmdConstruct: () => BaseCommand<any>): this {
        this.forbidReuse();
        this.commands.push(cmdConstruct());
        return this;
    }

    sendAndParse<T>(
        command: string,
        _cb: MonkeyCallback<T>,
        parser: (data: string | null) => T
    ): this {
        return this.sendInternal(() => {
            return new ParsableCommand(
                command,
                this.collector.bind(this),
                parser
            );
        });
    }

    send(command: string): this {
        return this.sendInternal(() => {
            return new Command(command, this.collector.bind(this));
        });
    }

    execute(cb: (err: Error | null, data: (string | null)[]) => void): void {
        this.forbidReuse();
        this.sent = true;
        this.callback = cb;
        if (!this.commands.length) {
            throw new Error('No commands to execute');
        }
        const parts = this.commands.map((cmd) => {
            this.client.queue.push(cmd);
            return cmd.command;
        });

        this.commands = [];
        this.client.stream.write(parts.join('\n'));
    }
}
