const protobuf = require('protobufjs');

class ProtoReader {
	constructor() {
		this.files = [];
		this.root = null;
	}

	/**
	 * @param {String} file
	 */
	addFile(file) {
		this.files.push(file);
	}

	/**
	 * Sync load
	 */
	load() {
		const root = new protobuf.Root();

		root.loadSync(this.files);

		this.root = root;
	}

	/**
	 * @param {String} typename
	 * @returns {ReflectionObject} 
	 */
	getType(typename) {
		return this.root.resolve(typename);
	}
}

module.exports = ProtoReader;
