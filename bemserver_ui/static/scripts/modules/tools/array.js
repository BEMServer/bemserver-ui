// Inspired by https://stackoverflow.com/a/45290208
export function filter(array, text, textKey = "text", caseSensitive = true, includes = false) {
    let getNodes = (result, object) => {
        let objText = object[textKey];
        let searchText = text;
        if (!caseSensitive) {
            objText = objText.toLowerCase();
            searchText = searchText.toLowerCase();
        }
        if ((includes && objText.includes(searchText)) || (!includes && objText === searchText))
        {
            result.push(object);
            return result;
        }
        if (Array.isArray(object.nodes)) {
            let nodes = object.nodes.reduce(getNodes, []);
            if (nodes.length) {
                result.push({ ...object, nodes });
            }
        }
        return result;
    };

    return array.reduce(getNodes, []);
}
