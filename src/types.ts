import { WebSocket } from "ws";

export type Room = {
    host: WebSocket,
    users: Map<Number, WebSocket>,
    sealed: boolean,
};

export interface MessagePayload {
  type: MessageType;
  from?: number;
  to?: number;
  room_code?: string;
  id?: number;
  webrtc_type?: string;
  sdp?: string;
  media?: string;
  index?: number;
  name?: string;
  successful?: boolean;
}

export enum MessageType{
	Id,
    RoomCode,
	Join,
    Offer,
	Answer,
    Candidate,
	UserConnected,
	UserDisconnected,
	CheckIn
};