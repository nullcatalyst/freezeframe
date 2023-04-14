import { FFKey } from "../gpu/object";

export function deepCopy<T>(obj: T): T {
    // Handle primitive types.
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays.
    if (Array.isArray(obj)) {
        return (obj as any[]).map(deepCopy) as T;
    }

    // Handle wrapped gpu objects.
    if ((obj as any as FFKey<T>).$ff) {
        return obj;
    }

    // TODO: Remove this.
    if (obj.constructor !== null) {
        return obj;
    }

    // Deep copy the object.
    const copy = (obj as Object).constructor();
    for (const attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            copy[attr] = deepCopy(obj[attr]);
        }
    }

    return copy;
}
