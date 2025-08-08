import { rooms, used_ids } from "./server";

// Generates a valid room code
export function generate_room_code(len: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    let code = '';
    for (let i = 0; i < len; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }
    return code;
}

// Generates a room code that isn't already in use
export function generate_unique_room_code(len: number): string {
    let roomCode: string;
    do {
        roomCode = generate_room_code(4);
    } while (rooms.has(roomCode));
    return roomCode;
}

// Generates a valid user id
export function generate_ID(): number {
    // Max id is 2147483647, start is always 2, cause 1 is always the Server
    let max: number = 2147483647;
    let min: number =          2;
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Generates a user id that isn't in use already
export function generate_unique_ID(): number {
    let id: number;
    do {
        id = generate_ID();
    } while (used_ids.includes(id));
    return id;
}