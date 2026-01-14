import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export const DIRECTORIES = {
    CACHE: RNFS.CachesDirectoryPath,
    DOCUMENTS: RNFS.DocumentDirectoryPath,
    TEMP: RNFS.TemporaryDirectoryPath,
    DOWNLOADS: Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath,
};

export const ensureDirectoryExists = async (path: string): Promise<void> => {
    const exists = await RNFS.exists(path);
    if (!exists) {
        await RNFS.mkdir(path);
    }
};

export const writeFile = async (path: string, content: string): Promise<void> => {
    await RNFS.writeFile(path, content, 'utf8');
};

export const readFile = async (path: string): Promise<string> => {
    return await RNFS.readFile(path, 'utf8');
};

export const deleteFile = async (path: string): Promise<void> => {
    const exists = await RNFS.exists(path);
    if (exists) {
        await RNFS.unlink(path);
    }
};

export const getFileInfo = async (path: string) => {
    return await RNFS.stat(path);
};

export const copyFile = async (sourcePath: string, destPath: string): Promise<void> => {
    await RNFS.copyFile(sourcePath, destPath);
};

export const moveFile = async (sourcePath: string, destPath: string): Promise<void> => {
    await RNFS.moveFile(sourcePath, destPath);
};

export const listFiles = async (directoryPath: string): Promise<string[]> => {
    const items = await RNFS.readDir(directoryPath);
    return items.map(item => item.path);
};

export const clearCache = async (): Promise<void> => {
    const cacheDir = RNFS.CachesDirectoryPath;
    const items = await RNFS.readDir(cacheDir);

    for (const item of items) {
        await RNFS.unlink(item.path);
    }
};

export const getCacheSize = async (): Promise<number> => {
    const cacheDir = RNFS.CachesDirectoryPath;
    const items = await RNFS.readDir(cacheDir);

    let totalSize = 0;
    for (const item of items) {
        totalSize += item.size;
    }

    return totalSize;
};