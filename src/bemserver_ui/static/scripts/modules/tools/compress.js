import lzString from "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/+esm";


export function compressToEncodedURIComponent(value) {
    return lzString.compressToEncodedURIComponent(JSON.stringify(value));
}

export function decompressFromEncodedURIComponent(value) {
    return JSON.parse(lzString.decompressFromEncodedURIComponent(value));
}
