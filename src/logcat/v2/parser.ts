import { LogcatEntry } from '../entry';
import { Parser as ParserParent } from '../parser';
import { charToPriority } from '../priority';

export default class Parser extends ParserParent {
    private buffer = Buffer.alloc(0);
    private static readonly DATE_LEN = 23;
    private static readonly ID_LEN = 6;
    private static readonly DASH_BYTE = 45;
    private static readonly NEW_LINE_BYTE = 10;
    private static readonly COLON_BYTE = 58;

    public *parse(chunk: Buffer): IterableIterator<LogcatEntry> {
        let cursor = 0;
        this.buffer = Buffer.concat([this.buffer, chunk]);
        const readUntil = this.buffer.lastIndexOf(10);

        while (cursor < readUntil) {
            if (this.buffer[cursor] === 45) {
                const newLineIndex = this.buffer.indexOf(
                    Parser.NEW_LINE_BYTE,
                    cursor
                );
                cursor = newLineIndex + 1;
                continue;
            }
            const entry = new LogcatEntry();

            const dateBuff = this.buffer.subarray(
                cursor,
                cursor + Parser.DATE_LEN
            );
            entry.date = new Date(dateBuff.toString());
            cursor += Parser.DATE_LEN;
            const pidBuff = this.buffer.subarray(
                cursor,
                cursor + Parser.ID_LEN
            );
            entry.pid = parseInt(pidBuff.toString(), 10);
            cursor += Parser.ID_LEN;
            const tidBuff = this.buffer.subarray(
                cursor,
                cursor + Parser.ID_LEN
            );
            entry.tid = parseInt(tidBuff.toString(), 10);
            cursor += Parser.ID_LEN;
            cursor++;
            const priorityBuff = this.buffer.subarray(cursor, cursor + 1);
            // TODO check if adb can provide int priority
            entry.priority = charToPriority(priorityBuff.toString());
            cursor += 2;
            const tagBuffArr = [];
            for (; this.buffer[cursor] !== Parser.COLON_BYTE; cursor++) {
                tagBuffArr.push(this.buffer[cursor]);
            }
            cursor += 2;
            entry.tag = Buffer.from(tagBuffArr).toString();
            const messageBuffArr = [];
            for (; this.buffer[cursor] !== Parser.NEW_LINE_BYTE; cursor++) {
                messageBuffArr.push(this.buffer[cursor]);
            }
            entry.message = Buffer.from(messageBuffArr).toString();
            cursor += 1;
            yield entry;
        }
        this.buffer = this.buffer.subarray(readUntil);
        // console.log('after', this.buffer.length);
    }

    public on(event: 'entry', listener: (entry: LogcatEntry) => void): this;
    public on(event: 'error', listener: (err: Error) => void): this;
    public on(event: 'wait' | 'drain', listener: () => void): this;
    public on(
        event: string | symbol,
        listener: ((entry: LogcatEntry) => void) | ((err: Error) => void)
    ): this {
        return super.on(event, listener);
    }
}
