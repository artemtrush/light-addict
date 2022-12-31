export function shallowCompare(first = {}, second = {}) {
    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);

    return (
        firstKeys.length === secondKeys.length &&
        firstKeys.every(key => first[key] === second[key])
    );
}
