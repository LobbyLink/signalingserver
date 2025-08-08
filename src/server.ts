import { WebSocket } from "ws";
import { Room } from "./types"
import { handle_message } from "./ws_messages";

export const rooms: Map<string, Room> = new Map<string, Room>();
export const used_ids: number[] = [];
export const ROOM_CODE_LENGTH: number = 4;

const PORT: number = 1927;
const wss = new WebSocket.Server({ port: PORT });
console.log(`WebSocket Server started on Port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
    console.log(`New client connected.`);

    ws.on('message', (message: string) => {
        handle_message(ws, message);
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
    });
});