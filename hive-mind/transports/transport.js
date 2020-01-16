class Transport {
	constructor() {
		this._onReceiveCallback = null;
	}

	async init() {
	}

	/**
	 * @param {Envelope} envelope
	 * @abstract 
	 */
	async send(envelope) {
		throw new Error('Not implemented');
	}

	/**
	 * @param {Function} callback
	 * @throws {Error} 
	 */
	onRecieve(callback) { // TODO typo => onReceive
		if (typeof callback !== 'function') {
			throw new Error('callback must be a function');
		}

		this._onReceiveCallback = callback;
	}

	async shutdown() {
	}
	
}

module.exports = Transport;
