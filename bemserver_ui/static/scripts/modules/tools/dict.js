export function isDict(obj) {
    return typeof obj === "object" && !Array.isArray(obj);
}
