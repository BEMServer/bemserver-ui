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


// Inspired by https://stackoverflow.com/a/44476626
// Returns a Promise that resolves after "ms" Milliseconds
export const timer = (ms) => {
    new Promise(res => setTimeout(res, ms));
};


export const getOptionIndexFromSelect = (selectElement, optionValue) => {
    let options = Array.from(selectElement.options);
    return options.findIndex((opt) => opt.value == optionValue);
};
