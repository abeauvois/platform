import { BaseContent } from "../entities/BaseContent";

export interface IDataIngestionWorkflow {

    getContent(uri: string): Promise<BaseContent[]>;
    getContentSince(since: Date): Promise<BaseContent[]>;
}
