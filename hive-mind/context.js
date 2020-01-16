/**
 * @class 
 */
class Context {
	/**
	 * @constructor 
	 */
	constructor() {
	}

	/**
	 * @param {Envelope} envelope
	 */
	trace(envelope) {
	}

	/**
	 * @param {Envelope} envelope
	 * @returns {Context}
	 */
	static fromEnvelope(envelope) {
		return new Context();
	}

	/**
	 * @param {Context?} ctx
	 */
	static isCtx(ctx) {
		return ctx instanceof Context;
	}
}
