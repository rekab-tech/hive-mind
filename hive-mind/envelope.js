const Promise = require('bluebird');
const protobuf = require('protobufjs');
const path = require('path');
const shortid = require('shortid');

async function loadEnvelopeProto() {
	const root = await protobuf.load(path.join(__dirname,'./protos/envelope.proto'));
	const envelope = root.lookupType('hiveenvelope.HiveEnvelopeMessage');

	if (envelope == null) {
		throw new Error('Can\'t find envelope proto file.');
	}

	return envelope;
}


let EnvelopeProto = null;

/**
 * @class 
 */
class Envelope {
	/**
	 * @param {Number} target
	 * @param {Number} type
	 * @param {Number} from
	 * @param {Buffer} data
	 * @param {?String} id
	 */
	constructor(target, type, from, data, id = null) {
		this.target = target;
		this.type = type;
		this.id = id || shortid.generate();
		this.from = from;
		this.data = data;
	}

	/**
	 * @returns {Envelope} 
	 */
	clone() {
		return new Envelope(this.target, this.type, this.from, this.data, this.id);
	}

	/**
	 * @returns {Buffer}
	 */
	async encode() {
		if (EnvelopeProto == null) {
			EnvelopeProto = await loadEnvelopeProto();
		}

		const obj = {
			target: this.target,
			type: this.type,
			id: this.id,
			from: this.from,
			data: this.data
		};

		let error = EnvelopeProto.verify(obj);
		if (error != null) {
			throw new Error(error);
		}

		const msg = EnvelopeProto.create(obj);
		const buff = EnvelopeProto.encode(msg).finish();

		return buff;
	}


	/**
	 * @param {Buffer} buff
	 * @returns {Envelope}
	 */
	static async decode(buff) {
		if (EnvelopeProto == null) {
			EnvelopeProto = await loadEnvelopeProto();
		}

		const msg = EnvelopeProto.decode(buff);

		let error = EnvelopeProto.verify(msg);
		if (error != null) {
			throw new Error(error);
		}

		const envelope = new Envelope(msg.target, msg.type, msg.from, msg.data, msg.id);

		return envelope;
	}
}

module.exports = Envelope;


// async function main() {
// 	try {
// 		const packet = new Envelope(12, 5, 11, Buffer.from('hello'));
// 		const buff = await packet.encode();
// 		const p2 = Envelope.decode(buff);
// 
// 		console.log(buff);
// 		console.log(packet);
// 		console.log(p2);
// 	} catch (e) {
// 		console.error(e.stack);
// 	}
// }
// 
// main();
