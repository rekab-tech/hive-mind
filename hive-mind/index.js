const Context = require('./context.js');
const Envelope = require('./envelope.js');

const Circuit = require('./circuit.js');
const PingHandler = require('./ping.js');

const SpecialActions = {
	PING: 0,
	PONG: 1,
	ACK: 2
};

class Hive {
	constructor() {
		this.transport = null;
		this._onMessage = () => {};
		this._onError = () => {};

		this.pingHandler = new PingHandler();
		this.circuit = new Circuit();
	}

	/**
	 * @param {Transport} transport
	 */
	setTransport(transport) {
		this.transport = transport;
	}
	
	/**
	 * @param {Envelope} envelope
	 * @param {Number} [timeout]
	 */
	async send(envelope, timeout = 0) {
		await this.transport.send(envelope);
		await this.circuit.wait(envelope, timeout);
	}

	/**
	 * @param {Envelope} envelope
	 */
	async sendAsync(envelope) {
		// TODO send res to async supervisor.
		await this.transport.send(envelope);
	}


	/**
	 * @param {Function} cb
	 * @throws {Error} 
	 */
	onMessage(cb) {
		if (typeof cb !== 'function') {
			throw new Error('onMessage must be a callback function');
		}

		this._onMessage = cb;
	}

	/**
	 * @param {Function} cb
	 * @throws {Error} 
	 */
	onError(cb) {
		if (typeof cb !== 'function') {
			throw new Error('onMessage must be a callback function');
		}

		this._onError = cb;
	}


	init() {
		this.transport.onRecieve(async (env) => {
			try {
				if (env.type === SpecialActions.PING) {
					// PING
					const pong = env.clone();
					pong.type = SpecialActions.PONG;

					this.transport.send(pong);
				} else if(env.type === SpecialActions.PONG) {
					// PONG
					// PingHandler
				} else if(env.type === SpecialActions.ACK) {
					// ACK

					this.circuit.add(env);
				} else if(env.type <= 10) {
					// RESERVED
					// TODO Log
				} else {
					this._onMessage(env);
				}
			} catch(e) {
				this._onError(e);
			}
		});

		this.transport.init(); // async run
		this.pingHandler.init(); // async run
	}
}


module.exports = Hive;
module.exports.Context = Context;
module.exports.Envelope = Envelope;
module.exports.isNotCtx = (ctx) => {
	return !Context.isCtx(ctx);
};
