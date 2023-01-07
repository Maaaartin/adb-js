import { callbackify } from 'util';
import {
    ExecCallback,
    ExecCallbackWithValue,
    InputOptions,
    InputSource,
    PropertyMap,
    PropertyValue
} from './types';

export type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

export const decodeLength = (length: string): number => {
    return parseInt(length, 16);
};

export const encodeLength = (length: number): string => {
    return ('0000' + length.toString(16)).slice(-4).toUpperCase();
};

export const encodeData = (data: Buffer | string): Buffer => {
    if (!Buffer.isBuffer(data)) {
        data = Buffer.from(data);
    }
    return Buffer.concat([Buffer.from(encodeLength(data.length)), data]);
};

export const stringToType = (value = ''): PropertyValue => {
    try {
        const parsed = JSON.parse(value);
        if (
            typeof parsed === 'string' ||
            (typeof parsed === 'object' && parsed !== null)
        ) {
            return value;
        }
        return parsed;
    } catch {
        const date = new Date(value);
        if (!isNaN(date.getMilliseconds())) {
            return date;
        }
        return value || undefined;
    }
};

export const nodeify: <T>(
    promise: Promise<T>,
    cb: ((err: null | Error, value: T) => void) | undefined
) => Promise<T> | void = (promise, cb) => {
    return cb ? callbackify(() => promise)(cb) : promise;
};

export const parseValueParam = <T extends NonFunctionProperties<T> | string, R>(
    param: T | ExecCallbackWithValue<R> | undefined
): T | undefined => {
    if (typeof param === 'function') {
        return;
    }
    return param;
};

export const parseCbParam = <T extends NonFunctionProperties<T> | string, R>(
    param: T | ExecCallbackWithValue<R> | undefined,
    cb: ExecCallbackWithValue<R> | undefined
): ExecCallbackWithValue<R> | undefined => {
    if (typeof param === 'function') {
        return param;
    }
    return cb;
};

export const parsePrimitiveParam = <T>(def: T, param: T | undefined): T => {
    if (typeof param === 'undefined') {
        return def;
    }
    return param;
};
export const parseOptions = <R extends Record<string, any>>(
    options: R | undefined
): NonFunctionProperties<R> | undefined => {
    if (typeof options === 'function') {
        return;
    }
    return options;
};

export function findMatches(
    value: string,
    regExp: RegExp,
    parseTo: 'set'
): Set<string>;
export function findMatches(
    value: string,
    regExp: RegExp,
    parseTo: 'map'
): PropertyMap;
export function findMatches(value: string, regExp: RegExp): string[][];
export function findMatches(
    value: string,
    regExp: RegExp,
    parseTo?: 'set' | 'map'
): PropertyMap | string[][] | Set<string> {
    let match: RegExpExecArray | null = null;
    const acc: string[][] = [];
    while ((match = regExp.exec(value))) {
        acc.push(match.slice(1));
    }
    switch (parseTo) {
        case 'set':
            return new Set(acc.map(([val]) => val));
        case 'map':
            return new Map(acc.map(([k, v]) => [k, stringToType(v)]));
        default:
            return acc;
    }
}

export function buildInputParams(
    defaultSource: InputSource,
    source: InputOptions | InputSource | ExecCallback | undefined,
    cb: ExecCallback | undefined
): {
    source: InputSource;
    cb: ExecCallback | undefined;
} {
    if (typeof source === 'function') {
        return { source: defaultSource, cb: source };
    }
    if (typeof source === 'undefined') {
        return { source: defaultSource, cb };
    }
    if (typeof source !== 'object') {
        return { source, cb };
    }
    if (typeof source.source !== 'undefined') {
        return { source: source.source, cb };
    }
    return { source: defaultSource, cb };
}
