const TurnBasedGame = require('react-matchmaking/server/turnbasedgame');
const _ = require('underscore');
const HumanPlayer = require('./humanplayer');
const AIPlayer = require('./aiplayer');
const Grid = require('./grid');


module.exports = class NoughtsAndCrosses extends TurnBasedGame {
	constructor(options)
	{
		super(options);
		this.board = new Grid(3, 3);

		console.log(`NoughtsAndCrosses ${this.id} initialized`);
	}

	getNewPlayerToken()
	{
		return ['X', '0'][this.players.length];
	}

	handleHumanJoin(playerData)
	{
		const player = new HumanPlayer({
			id: playerData.id,
			io: playerData.client,
			token: this.getNewPlayerToken(),
			ref: this
		});

		this.handleJoin(player);
		return player;
	}

	handleAIJoin(player)
	{
		const ai = new AIPlayer({
			id: player.id,
			token: this.getNewPlayerToken(),
			ref: this
		});

		this.handleJoin(ai);
		return ai;
	}

	handleJoin(player)
	{
		super.handleJoin(player);

		player.on('place_token', (cell) => {
			console.debug("place", player.id, player.id, cell, cell.id)
			this.place(player, cell.id);
		});
	}

	begin()
	{
		this.status = 'PLAYING';
		this.nextTurn();
		this.broadcast('game:update', this.serialize());
	}

	place(player, cell)
	{
		console.log(`${player.id} placing ${player.token} in cell ${cell} (${this.status})`);

		const activePlayer = this.whichPlayer();

		if (this.status !== 'PLAYING')
		{
			console.log("Invalid move: Game is not playing");
		}
		else if (activePlayer !== player)
		{
			console.log("Invalid move: Not players turn");
			player.io.emit('invalid_move', { reason: "It is not your turn." });
		}
		else
		{
			const location = {
				x: cell % 3,
				y: Math.floor(cell / 3)
			};

			if (this.board.place(location, player.token) === false)
			{
				console.log("Invalid move: Cell already taken");
				player.io.emit('invalid_move', { reason: "Cannot place token there." });
			}
			else
			{
				const winner = this.checkForEndOfGame();
				if (winner)
				{
					this.status = 'FINISHED';
					this.turn = undefined;


					let winningPlayer = this.players.find(p => p.token === winner);
					if (winningPlayer)
					{
						this.winner = winningPlayer.id;
					}
					else
					{
						this.winner = '';
					}
				}
				else
				{
					this.nextTurn();
				}

				this.broadcast('game:update', this.serialize());
			}
		}
	}

	checkForEndOfGame(board)
	{
		board = board || this.board;
		// console.log("checkForEndOfGame");
		// console.log(this.board.display());

		let winner = null;

		const paths = board.paths(3);
		const winPath = paths.find(path => {
			// Use the first token to match against the rest
			const token = path[0].token;

			return path.every(cell => cell.token === token);
		});

		if (_.isEmpty(winPath) === false)
		{
			winner = winPath[0].token;
		}
		else
		{
			const cells = board.toArray();
			const full = cells.every((c) => !!c);
			if (full)
			{
				winner = 'draw';
			}
		}

		return winner;
	}

	serialize()
	{
		const data = super.serialize();
		data.cells = this.board.toArray();
		data.winner = this.winner;
		return data;
	}
};
