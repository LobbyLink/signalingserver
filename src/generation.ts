import { rooms, used_ids } from "./server";

// Generates a valid room code
export function generateRoomCode(len: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    let code = '';
    for (let i = 0; i < len; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }
    return code;
}

// Generates a room code that isn't already in use
export function generateUniqueRoomCode(len: number): string {
    let roomCode: string;
    do {
        roomCode = generateRoomCode(4);
    } while (rooms.has(roomCode));
    return roomCode;
}

// Generates a valid user id
export function generateId(): number {
    // Max id is 2147483647, start is always 2, cause 1 is always the Server
    let max: number = 2147483647;
    let min: number =          2;
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Generates a user id that isn't in use already
export function generateUniqueId(): number {
    let id: number;
    do {
        id = generateId();
    } while (used_ids.includes(id));
    return id;
}