import { WebSocket } from "ws";
import { MessageType } from "./ws_messages";

export type Room = {
    host: WebSocket,
    users: Map<Number, WebSocket>,
    sealed: boolean,
};

export type Message = {
    id: number,
	room_code: string,
    type: MessageType,
    payload: Payload,
	server: boolean,
};

type Payload = {
    sdp?: string,
    name?: string,
}