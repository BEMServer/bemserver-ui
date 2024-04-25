export const debounce = (fn, delay = 500) => {
    let timeoutId;
    return (...args) => {
        // cancel the previous timer
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
        // setup a new timer
        timeoutId = window.setTimeout(() => {
            fn.apply(null, args)
        }, delay);
    };
};
