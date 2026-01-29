


export function createPageUrl(pageName: string) {
    // Only lowercase the path part, not query parameters
    const [path, queryString] = pageName.split('?');
    const lowercasePath = '/' + path.toLowerCase().replace(/ /g, '-');
    return queryString ? `${lowercasePath}?${queryString}` : lowercasePath;
}