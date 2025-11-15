import * as yaml from "yaml";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadValues = Record<string, any>;

export type FileLoader<T> = (
    text: string,
    filePath: string,
    values: LoadValues
) => Promise<T>;

export const loadFromFile = async <T>(
    uri: string,
    loader: FileLoader<T>,
    values: LoadValues = {}
): Promise<T> => {
    try {
        const fs = await import("node:fs/promises");
        return loader(await fs.readFile(uri, { encoding: "utf-8" }), uri, values);
    } catch (e) {
        console.error(e);
        throw new Error(`Could not load file at ${uri}`);
    }
};

export const extname = (path: string) => `.${path.split(".").pop()}`;

export const loadFileContents = (contents: string, format: string) => {
    switch (format) {
        case ".json":
            return JSON.parse(contents);
        case ".yml":
        case ".yaml":
            return yaml.parse(contents);
        default:
            throw new Error(`Unsupported filetype ${format}`);
    }
};

export const parseFileConfig = (
    text: string,
    path: string,
    supportedTypes?: string[]
) => {
    const suffix = extname(path);

    if (
        ![".json", ".yaml"].includes(suffix) ||
        (supportedTypes && !supportedTypes.includes(suffix))
    ) {
        throw new Error(`Unsupported filetype ${suffix}`);
    }

    return loadFileContents(text, suffix);
};

export function isUrl(url: string): boolean {
    try {
        const newUrl = new URL(url);
        return Boolean(newUrl);
    } catch {
        return false;
    }
}
