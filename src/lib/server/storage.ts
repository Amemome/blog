import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const mediaDirectory = resolve(process.env.MEDIA_DIR ?? './data/media');
export const backupDirectory = resolve(process.env.BACKUP_DIR ?? './data/backups');

export const ensureStorageDirectories = () => Promise.all([mkdir(mediaDirectory, { recursive: true }), mkdir(backupDirectory, { recursive: true })]);