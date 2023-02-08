import moment from 'moment';
import { TouchOptions, escape } from '../../util';
import FileSystemCommand from '../abstract/fileSystem';

export default class TouchCommand extends FileSystemCommand {
    protected Cmd = 'touch';
    intentArgs(options?: TouchOptions): string[] {
        const args: string[] = [];
        if (!options) {
            return args;
        }
        if (options.aTime) {
            args.push('-a');
        }
        if (options.mTime) {
            args.push('-m');
        }
        if (options.noCreate) {
            args.push('-c');
        }
        if (options.symlink) {
            args.push('-h');
        }
        if (options.date) {
            args.push('-d', escape(moment(options.date).toISOString()));
        }
        if (options.time) {
            args.push(
                '-t',
                escape(moment(options.time).format('YYYYMMDDHHmm[.]ssSSS'))
            );
        }
        if (options.reference) {
            args.push('-r', escape(options.reference));
        }
        return args;
    }

    execute(
        serial: string,
        path: string,
        options?: TouchOptions
    ): Promise<void> {
        return super.execute(serial, path, options).then(() => {});
    }
}
