import { Bookmark } from '../domain/entities/Bookmark';


export interface QueuedLink {
    link: Bookmark;
    index: number;
    attempts: number;
}
