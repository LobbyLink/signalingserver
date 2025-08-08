import { WebSocket } from "ws";
import { MessagePayload, MessageType, Room } from "./types";
import { ROOM_CODE_LENGTH, rooms, used_ids } from "./server";
import { generate_unique_ID, generate_unique_room_code } from "./generation";

// Handle different incoming packets
export function handle_message(ws: WebSocket, raw_message: string): void {
    const parsed_message: MessagePayload = JSON.parse(raw_message); 

    switch(parsed_message.type) {
        case MessageType.Id:
            handle_id_msg(ws);
            break;
        
        case MessageType.RoomCode:
            handle_lobby_msg(ws);
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
function build_message(payload: MessagePayload): string {
  const message = Object.fromEntries(
    Object.entries(payload).filter(([_, value]) => value !== undefined)
  );

  return JSON.stringify(message);
}


/*
    Handle incoming packets
*/

// Generate unique room code, create room and send response 
function handle_lobby_msg(ws: WebSocket): void {
    let room_code: string = generate_unique_room_code(ROOM_CODE_LENGTH);

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
    let id : number = generate_unique_ID();
    used_ids.push(id);
    console.log(`Created ID ${id}.`);
    send_id_response_msg(ws, id);
}

// Check if Lobby exists, then add new user to user map and send response
function handle_join_msg(ws: WebSocket, message_payload: MessagePayload): void {
    // Ceck relevant information
    if (message_payload.room_code === undefined || message_payload.from === undefined) {
        console.error(`Join Message is missing crutial information.`);
        return;
    }

    // Get relevant information from packet
    const room_code: string = message_payload.room_code;
    const from: number = message_payload.from;

    // Check if room exists
    if(!rooms.has(room_code)) {
        send_join_response_msg(ws, false, room_code);
        console.error(`Client ${from} requested non existent Lobby ${room_code}.`);
        return;
    } 
    
    // Add user to room
    const room: Room = rooms.get(room_code) as Room;
    room.users.set(from, ws);

    // Respond to user
    send_join_response_msg(ws, true, room_code);
    console.log(`Client ${from} successfull joined Lobby ${room_code}.`);
}

/*
    Pre-build packets, that can be instantly send back.  
*/

// Send generated room code back to game server
function send_room_code_msg( ws: WebSocket, room_code: string ): void {
    const message = build_message({ type: MessageType.RoomCode, room_code: room_code });
    ws.send(message);
}

// Send generated id back to controller client
function send_id_response_msg( ws: WebSocket, id: number ): void {
    const message = build_message({ type: MessageType.Id, id: id });
    ws.send(message);
}

// Send join status back to controller client 
function send_join_response_msg( ws: WebSocket, successful: boolean, room_code: string ): void {
    const message = build_message({ type: MessageType.Join, successful: successful });
    ws.send(message);
}

/*
    Relay Packets from servere to client and client to server.
*/

// Relay offer message from controller client to game server
function relay_offer_msg(raw_message: string, message_payload: MessagePayload): void {
    if (message_payload.room_code === undefined || message_payload.sdp === undefined || message_payload.from === undefined) {
        console.log(raw_message)
        console.log(message_payload)
        console.error(`Relay Offer Message is missing crutial information.`);
        return;
    }

    const room: Room | undefined = rooms.get(message_payload.room_code) as Room;
    if(room == undefined) {
        console.error(`Requested Room for Relay Offer Message wasn't found.`);
        return;
    }

    const sdp: string = message_payload.sdp.replace(/\r\n/g, " ") as string;
    console.log(`Client ${message_payload.from} send Offer SDP "${sdp}" to server of ${message_payload.room_code}.`)
    room.host.send(raw_message);
}

// Relay answer message from game server to controller client
function relay_answer_msg(raw_message: string, message_payload: MessagePayload): void {
    if (message_payload.room_code === undefined || message_payload.sdp === undefined || message_payload.to === undefined) {
        console.error(`Relay Answer Message is missing crutial information.`);
        return;
    }

    const room: Room | undefined = rooms.get(message_payload.room_code);
    if(room == undefined) {
        console.error(`Requested Room for Relay Answer Message wasn't found.`);
        return;
    }
    
    const user: WebSocket | undefined = room.users.get(message_payload.to);
    if(user == undefined) {
        console.error(`Requested User for Relay Answer Message wasn't found.`);
        return;
    }

    const sdp: string = message_payload.sdp.replace(/\r\n/g, " ") as string;
    console.log(`Server of ${message_payload.room_code} send Answer SDP "${sdp}" to client ${message_payload.to}.`)
    user.send(raw_message);
}

// Determine from which side ice candidate is coming and realy it either to controller client to game server
function relay_candidate_msg(raw_message: string, message_payload: MessagePayload): void {
    if (message_payload.room_code === undefined || message_payload.from === undefined || message_payload.to === undefined || message_payload.name === undefined) {
        console.error(`Relay Candidate Message is missing crutial information.`);
        return;
    }

    const room: Room | undefined = rooms.get(message_payload.room_code);
    if(room == undefined) {
        console.error(`Requested Room for Relay Candidate Message wasn't found.`);
        return;
    }

    if (message_payload.from === 1) {
        const user: WebSocket | undefined = room.users.get(message_payload.to);
        if(user == undefined) {
            console.error(`Requested User for Relay Candidate Message wasn't found.`);
            return;
        }

        console.log(`Server of ${message_payload.room_code} send ICE Candidate "${message_payload.name}" to client ${message_payload.to}.`)
        user.send(raw_message);
        return;
    } 

    console.log(`Client ${message_payload.from} send ICE Candidate "${message_payload.name}" to server of ${message_payload.room_code}.`)
    room.host.send(raw_message);
}