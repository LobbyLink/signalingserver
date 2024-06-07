import { WebSocket } from "ws";
import { Message, Room } from "./types";
import { ROOM_CODE_LENGTH, rooms, used_ids } from "./server";
import { generateUniqueId, generateUniqueRoomCode } from "./generation";

export enum MessageType{
	Id,
	Join,
	UserConnected,
	UserDisconnected,
	Lobby,
	Candidate,
	Offer,
	Answer,
	CheckIn
};

// Handle different incoming packets
export function handleMessage(ws: WebSocket, raw_message: string): void {
    const parsed_message: Message = JSON.parse(raw_message); 

    switch(parsed_message.type) {
        case MessageType.Lobby:
            handle_lobby_msg(ws);
            break;

        case MessageType.Id:
            handle_id_msg(ws);
            break;
        
        case MessageType.Join:
            handle_join_msg(ws, parsed_message);
            break;
        
        case MessageType.Offer:
            relay_offer_msg(raw_message, parsed_message);
            break; 
        
        case MessageType.Answer:
            relay_answer_msg(raw_message, parsed_message);
            break; 
        
        case MessageType.Candidate:
            relay_candidate_msg(raw_message, parsed_message);
            break; 
    };
}

// Returns stringified message
function buildMessage(type: MessageType, payload: Object, id: Number, room_code: String){
    const message = {
		id: id,
        room_code: room_code,
		type: type,
		payload: payload,
        server: false,
	}
	
	return JSON.stringify(message)
}

/*
    Handle incoming packets
*/

// Generate unique room code, create room and send response 
function handle_lobby_msg(ws: WebSocket): void {
    console.log('Creating Lobby.');
    let room_code: string = generateUniqueRoomCode(ROOM_CODE_LENGTH);

    const room: Room = {
        host: ws,
        users: new Map<Number, WebSocket>(),
        sealed: false,
    }
 
    rooms.set(room_code, room);
    console.log(`Lobby successfully created with room code ${room_code}.`);
    send_room_code_msg(ws, room_code);
}

// Generate unique id, add it to known ids and send response  
function handle_id_msg(ws: WebSocket): void {
    let id : number = generateUniqueId();
    used_ids.push(id);
    console.log(`Created ID ${id}.`);
    send_id_response_msg(ws, id);
}

// Check if Lobby exists, then add new user to user map and send response
function handle_join_msg(ws: WebSocket, message: Message): void {
    const room_code = message.room_code;
    const id = message.id;

    if(!rooms.has(room_code)) {
        console.log(`Client ${id} requested non existent Lobby ${room_code}.`);
        send_join_response_msg(ws, false, room_code);
        return;
    } 
    
    const room: Room = rooms.get(room_code) as Room;
    room.users.set(id, ws);

    console.log(`Client ${id} successfull joined Lobby ${room_code}.`);
    send_join_response_msg(ws, true, room_code);
}

/*
    Pre-build packets, that can be instantly send back.  
*/

// Send generated room code back to game server
function send_room_code_msg(ws:WebSocket, room_code: string): void {
    const message = buildMessage(MessageType.Lobby, {}, -1, room_code);
    ws.send(message);
}

// Send generated id back to controller client
function send_id_response_msg(ws:WebSocket, id: number): void {
    const message = buildMessage(MessageType.Id, {}, id, "");
    ws.send(message);
}

// Send join status back to controller client 
function send_join_response_msg(ws:WebSocket, successful: boolean, room_code: string): void {
    const message = buildMessage(MessageType.Join, { successful: successful }, 0, room_code);
    ws.send(message);
}

/*
    Relay Packets from servere to client and client to server.
*/

// Relay offer message from controller client to game server
function relay_offer_msg(raw_message: string, parsed_message: Message): void {
    const room: Room | undefined = rooms.get(parsed_message.room_code) as Room;
    if(room == undefined) return;

    const sdp: string = parsed_message.payload.sdp?.replace(/\r\n/g, " ") as string;
    console.log(`Client ${parsed_message.id} created Offer with SDP "${sdp}".`)
    room.host.send(raw_message);
}

// Relay answer message from game server to controller client
function relay_answer_msg(raw_message: string, parsed_message: Message): void {
    const room: Room | undefined = rooms.get(parsed_message.room_code);
    if(room == undefined) return;
    
    const user: WebSocket | undefined = room.users.get(parsed_message.id);
    if (user == undefined) return;

    const sdp: string = parsed_message.payload.sdp?.replace(/\r\n/g, " ") as string;
    console.log(`Server ${parsed_message.id} send Answer with SDP "${sdp}".`)
    user.send(raw_message);
}

// Determine from which side ice candidate is coming and realy it either to controller client to game server
function relay_candidate_msg(raw_message: string, parsed_message: Message): void {
    const room: Room | undefined = rooms.get(parsed_message.room_code);
    if(room == undefined) return;

    if (parsed_message.server) {
        const user: WebSocket | undefined = room.users.get(parsed_message.id);
        if (user == undefined) return;

        console.log(`Server send ICE Candidate "${parsed_message.payload.name}.`)
        user.send(raw_message);
        return;
    } 

    console.log(`Client ${parsed_message.id} send ICE Candidate "${parsed_message.payload.name}" to server.`)
    room.host.send(raw_message);
}