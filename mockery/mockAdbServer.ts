import net from 'net';
import Parser from '../lib/parser';
import { encodeData, NonEmptyArray, Reply } from '../lib';
import { promisify } from 'util';
import { setTimeout } from 'timers';

type Sequence = {
    cmd: string;
    res: string | null;
    rawRes?: true;
    unexpected?: true;
};
export class AdbMock {
    protected server_ = new net.Server();
    protected parser: Parser | null = null;
    protected seq: Generator<Sequence, void, void>;

    protected get socket(): net.Socket | null | undefined {
        return this.parser?.socket;
    }

    constructor(seq: Sequence | NonEmptyArray<Sequence>) {
        seq = Array.isArray(seq) ? seq : [seq];
        this.seq = (function* (): Generator<Sequence, void, void> {
            for (const s of seq) {
                yield s;
            }
        })();
    }

    protected getPort(): number {
        const info = this.server_.address();
        if (typeof info === 'string' || info === null) {
            throw new Error('Could not get server port');
        }
        return info.port;
    }

    protected writeOkay(data: string | null): void {
        const encoded = encodeData(data || '');
        const toWrite = Reply.OKAY.concat(encoded.toString());
        this.socket?.write(toWrite);
    }

    protected writeFail(): void {
        const encoded = encodeData('Failure');
        const toWrite = Reply.FAIL.concat(encoded.toString());
        this.socket?.write(toWrite);
    }

    protected writeRaw(data: string | null): void {
        this.socket?.write(Reply.OKAY.concat(data || ''));
    }

    protected writeUnexpected(): void {
        this.socket?.write('ABCD');
    }

    protected next(): Sequence | null {
        const nextSeq = this.seq.next();
        if (nextSeq.done) {
            return null;
        }
        return nextSeq.value;
    }

    protected connectionHandler(value: string): void {
        const nextSeq = this.next();
        if (nextSeq?.unexpected) {
            return this.writeUnexpected();
        }
        if (value === nextSeq?.cmd) {
            if (nextSeq.rawRes) {
                return this.writeRaw(nextSeq.res);
            }
            return this.writeOkay(nextSeq.res);
        }

        return this.writeFail();
    }

    protected async readValue(): Promise<string | undefined> {
        return (await this.parser?.readValue())?.toString();
    }

    protected handleSequence(): void {
        this.socket?.once('readable', async () => {
            for await (const seq of this.seq) {
                if (seq.unexpected) {
                    this.writeUnexpected();
                    continue;
                }
                const value = await this.readValue();
                if (seq.cmd === value) {
                    if (seq.rawRes) {
                        this.writeRaw(seq.res);
                        continue;
                    }
                    this.writeOkay(seq.res);
                    continue;
                }

                this.writeFail();
            }
            this.parser?.end();
        });
    }

    protected hook(): void {
        this.server_.on('connection', async (socket) => {
            this.parser = new Parser(socket);
            const value = (await this.parser.readValue()).toString();
            this.connectionHandler(value);

            this.handleSequence();
        });
    }

    end(): Promise<void> {
        return promisify<void>((cb) => this.server_.close(cb) || cb(null))();
    }

    forceWriteData(data: string): void {
        const encoded = encodeData(data || '');
        this.socket?.write(encoded);
    }

    forceWrite(data: string): void {
        this.writeOkay(data);
    }

    start(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (!this.server_.listening) {
                this.server_.once('error', reject);
                this.server_.listen(() => {
                    try {
                        this.hook();
                        resolve(this.getPort());
                        this.server_.removeListener('error', reject);
                    } catch (e) {
                        reject(e);
                    }
                });
            } else {
                try {
                    resolve(this.getPort());
                } catch (e) {
                    reject(e);
                }
            }
        });
    }
}

export class AdbMockDouble extends AdbMock {
    protected timeout?: NodeJS.Timeout;
    private runner(): void {
        setImmediate(async () => {
            this.timeout = setTimeout(() => {
                this.runner();
            }, 500);
            const seq = this.next();
            if (!seq) {
                clearTimeout(this.timeout);
                this.parser?.end();
                return;
            }
            if (seq.unexpected) {
                this.writeUnexpected();
                return;
            }
            const value = await this.readValue();
            if (seq.cmd === value) {
                if (seq.rawRes) {
                    this.writeRaw(seq.res);
                    return;
                }
                this.writeOkay(seq.res);
                return;
            }

            this.writeFail();
        });
        clearTimeout(this.timeout);
    }

    protected handleSequence(): void {
        this.socket?.once('readable', this.runner.bind(this));
    }

    end(): Promise<void> {
        clearTimeout(this.timeout);
        return super.end();
    }
}
