import { MvOptions } from '../..';
import FileSystemCommand from '../filesystem';

export default class MvCommand extends FileSystemCommand {
    Cmd = 'mv';
    intentArgs(options?: MvOptions): string[] {
        const args: string[] = [];
        if (!options) {
            return args;
        }
        if (options.force) {
            args.push('-f');
        }

        if (options.noClobber) {
            args.push('-n');
        }
        return args;
    }

    execute(
        serial: string,
        paths: string[],
        options?: MvOptions
    ): Promise<void> {
        return super.execute(serial, paths, options);
    }
}
