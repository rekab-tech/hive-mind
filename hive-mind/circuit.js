const Promise = require('bluebird');

class Circuit {
	constructor() {
		this.promiseMap = new Map();
		this.resultMap = new Map();
	}

	/**
	 * @param {Envelope} env
	 */
	add(env) {
		let promise = this.promiseMap.get(env.id);
		if (promise != null) {
			promise.resolve(env);
			return;
		}

		this.resultMap.set(env.id, env);
	}

	async wait(env, timeout = 0) {
		const earlyResult = this.resultMap.get(env.id);
		if (earlyResult != null) {
			this.resultMap.delete(env.id);
			return earlyResult;
		}

		return new Promise((resolve, reject) => {
			this.promiseMap.set(env.id, {resolve, reject});

			if (timeout !== 0) {
				setTimeout(() => {
					const broke = this.breaker(env);
					if (broke != null) {
						resolve(broke);
					} else {
						reject(new Error('Breaking circuit'));
					}
				}, timeout);
			}
		});
	}

	breaker(env) {
		// TODO use an internal circuit breaker
		return null;
	}
}

module.exports = Circuit;
