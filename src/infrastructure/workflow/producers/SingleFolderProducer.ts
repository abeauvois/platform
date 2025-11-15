import { IProducer } from '../../../domain/workflow/IProducer.js';
import { EmailFile } from '../../../domain/entities/EmailFile.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Producer: Extracts email files from a single folder (local or remote URI)
 * Supports:
 * - Local paths: file:///path/to/folder or /path/to/folder
 * - S3 paths: s3://bucket/prefix (future implementation)
 */
export class SingleFolderProducer implements IProducer<EmailFile> {
    constructor(
        private readonly uri: string
    ) { }

    async *produce(): AsyncIterable<EmailFile> {
        // Parse URI to determine source type
        const source = this.parseUri(this.uri);

        if (source.type === 'file') {
            if (!source.path) {
                throw new Error(`Invalid file URI: ${this.uri}`);
            }
            yield* this.produceFromLocalFolder(source.path);
        } else if (source.type === 's3') {
            if (!source.bucket) {
                throw new Error(`Invalid S3 URI: ${this.uri}`);
            }
            yield* this.produceFromS3(source.bucket, source.prefix || '');
        } else {
            throw new Error(`Unsupported URI scheme: ${this.uri}`);
        }
    }

    /**
     * Parse URI into source type and path/location info
     */
    private parseUri(uri: string): { type: 'file' | 's3'; path?: string; bucket?: string; prefix?: string } {
        // Handle S3 URIs: s3://bucket/prefix
        if (uri.startsWith('s3://')) {
            const s3Path = uri.slice(5); // Remove 's3://'
            const firstSlash = s3Path.indexOf('/');
            if (firstSlash === -1) {
                return {
                    type: 's3',
                    bucket: s3Path,
                    prefix: ''
                };
            }
            return {
                type: 's3',
                bucket: s3Path.slice(0, firstSlash),
                prefix: s3Path.slice(firstSlash + 1)
            };
        }

        // Handle file URIs: file:///path or just /path
        let localPath = uri;
        if (uri.startsWith('file://')) {
            localPath = uri.slice(7); // Remove 'file://'
        }

        return {
            type: 'file',
            path: localPath
        };
    }

    /**
     * Produce email files from local folder
     */
    private async *produceFromLocalFolder(folderPath: string): AsyncIterable<EmailFile> {
        try {
            const files = readdirSync(folderPath);

            for (const filename of files) {
                if (filename.toLowerCase().endsWith('.eml')) {
                    const filePath = join(folderPath, filename);
                    const stats = statSync(filePath);

                    // Only process files, not directories
                    if (stats.isFile()) {
                        const file = Bun.file(filePath);
                        const content = await file.text();
                        yield {
                            filename,
                            content
                        };
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to read EML files from local folder: ${folderPath}. ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Produce email files from S3 bucket
     * Note: This is a placeholder for future S3 implementation
     * You'll need to add AWS SDK and implement S3 listing/downloading
     */
    private async *produceFromS3(bucket: string, prefix: string): AsyncIterable<EmailFile> {
        // TODO: Implement S3 support using AWS SDK
        // Example implementation would:
        // 1. List objects in S3 bucket with prefix
        // 2. Filter for .eml files
        // 3. Download and yield each file

        throw new Error(`S3 support not yet implemented. Bucket: ${bucket}, Prefix: ${prefix}`);

        /*
        // Future implementation example:
        const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const client = new S3Client({});
        
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix
        });
        
        const response = await client.send(listCommand);
        
        for (const object of response.Contents || []) {
            if (object.Key && object.Key.toLowerCase().endsWith('.eml')) {
                const getCommand = new GetObjectCommand({
                    Bucket: bucket,
                    Key: object.Key
                });
                
                const getResponse = await client.send(getCommand);
                const content = await getResponse.Body?.transformToString() || '';
                
                yield {
                    filename: object.Key.split('/').pop() || object.Key,
                    content
                };
            }
        }
        */
    }
}
