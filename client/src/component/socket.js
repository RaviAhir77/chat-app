import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";
let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            path: "/socket.io/",
            transports: ["websocket", "polling"],
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            withCredentials: true,
            autoConnect: true
        });
    }
    return socket;
};