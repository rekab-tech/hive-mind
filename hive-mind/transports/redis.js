const Promise = require('bluebird');
const Redis = require('ioredis');
const Transport = require('./transport.js');
const Envelope = require('../envelope.js');


/**
 * @param {String} namespace
 * @param {Number} service
 * @returns {String}
 */
function getQueueName(namespace, service) {
	return `${namespace}:mailbox:{${service}}`;
}

/**
 * @param {String} namespace
 * @param {Number} service
 * @returns {String}
 */
function getHelpName(namespace, service) {
	return `${namespace}:help:{${service}}`;
}

const ns = 'hive';

/**
 * @class 
 */
class RedisTransport extends Transport {
	/**
	 * @param {Object} config
	 * @constructor 
	 */
	constructor(config) {
		super();
		this.redis = new Redis(config);
		this.worker = new Redis(config);

		this.continueFlag = true;

		this.selfQueue = '';
		this.helpQueue = '';
	}

	/**
	 * 
	 */
	async init(selfId) { // TODO
		this.selfQueue = getQueueName(ns, selfId);
		this.helpQueue = getHelpName(ns, selfId);
		
		// TODO maybe we should remove this?
		await Promise.join(this.redis.info(), this.worker.info());

		this.backgroundLoop();
	}


	/**
	 *  @private
	 */
	async backgroundLoop() {
		while (this.continueFlag) {
			try {
				const msg = await this.getNewMessage();
				await this.handleNewMessage(msg);
			} catch (e) {
				// Add some logs
				console.error(e.stack);
			}
		}
	}

	async getNewMessage() {
		const buff = await this.worker.brpoplpushBuffer(this.selfQueue, this.helpQueue, 0);
		return await Envelope.decode(buff);
	}

	async handleNewMessage(msg) {
		// TODO maybe add some fancy stuff for parallel handling
		this._onReceiveCallback(msg);
	}

	/**
	 * @param {Envelope} envelope
	 * @override
	 */
	async send(envelope) {
		const queue = getQueueName(ns, envelope.target);
		const msg = await envelope.encode();
		await this.redis.lpush(queue, msg);
	}
}


module.exports = RedisTransport;
