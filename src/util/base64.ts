export function encode(arrayBuffer: ArrayBuffer): string {
    return btoa(Array.from(new Uint8Array(arrayBuffer)).map(b => String.fromCharCode(b)).join(''));
}

export function decode(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; ++i) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
