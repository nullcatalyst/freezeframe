export function deepCopy(obj: any) {
    // Handle primitive types.
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays.
    if (Array.isArray(obj)) {
        return obj.map(deepCopy);
    }

    // Handle wrapped gpu objects.
    if (obj.$ff) {
        return obj;
    }

    // TODO: Remove this.
    if (obj.constructor !== null) {
        return obj;
    }

    // Deep copy the object.
    let copy = obj.constructor();
    for (let attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            copy[attr] = deepCopy(obj[attr]);
        }
    }

    return copy;
}
