import { FFObject } from "../gpu/object";

export function stringify(obj: any): string {
    if (obj === undefined) {
        return 'undefined';
    }

    if (obj === null) {
        return 'null';
    }

    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
        return `[${obj.map(stringify).join(', ')}]`;
    }

    if (obj.$ff) {
        return obj.$ff.name;
    }

    return `{${Object.keys(obj).map(k => `${k}: ${stringify(obj[k])}`).join(', ')}}`;
}
