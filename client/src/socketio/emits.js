import { socket } from './index';

export const hostGame = () => {
	socket.emit('host_game');
};

export const joinGame = (game) => {
	socket.emit('join_game', { id: game });
};
