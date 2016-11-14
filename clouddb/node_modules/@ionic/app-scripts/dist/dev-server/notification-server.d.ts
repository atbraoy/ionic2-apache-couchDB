import { ServeConfig } from './serve-config';
export declare function createNotificationServer(config: ServeConfig): void;
export interface WsMessage {
    category: string;
    type: string;
    data: any;
}
