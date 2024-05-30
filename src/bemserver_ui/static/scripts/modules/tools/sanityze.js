import "https://cdn.jsdelivr.net/npm/dompurify@3.1.4/dist/purify.min.js";


// TODO: trusted types should be used but it is not emplemented yet in Firefox
// https://github.com/w3c/trusted-types


export function sanitizeData(data) {
    return DOMPurify.sanitize(data, {USE_PROFILES: {html: true}, RETURN_TRUSTED_TYPE: true});
}
