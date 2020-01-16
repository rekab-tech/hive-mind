const servicesList = require('../tmp/out2.json');

console.log(`const path = require('path');`);

class Types {
	constructor() {
		this.types = new Map();
	}

	add({name, type}) {
		// TODO for pretype
		if(!this.types.has(type)) {
			this.types.set(type, new Set());
		}

		this.types.get(type).add(name);
	}

	getAllMajorTypes() {
		return [...this.types.keys()];
	}
}

const types = new Types();

servicesList.map(x => x.endpoints).forEach(e => {
	e.forEach(x => {
		types.add(x.input);
		types.add(x.output);
	});
});


types.getAllMajorTypes().forEach(name => {
	if (name === 'default') {
		const files = process.argv.slice(2);
		console.log(`const ProtoReader = require('hive-mind/formatter/protoReader');`);
		console.log();
		console.log(`const reader = new ProtoReader();`);
		console.log(files
			.map(f => `./proto/${f}`)
			.map(f => `reader.addFile(path.join(__dirname, '${f}'));`)
		        .join("\n"));

		console.log(`reader.load();`);
		console.log();
		console.log(`module.exports.default = {};`);
		console.log([...types.types.get(name).values()]
			.map(type => `module.exports.default.${type} = reader.getType('${type}');`)
			.join("\n"));


	} else if(name === 'msgpack') {
		// msg pack stuff
		throw new Error(`${name} not implemented`);
	} else {
		throw new Error(`${name} not implemented`);
	}
});
