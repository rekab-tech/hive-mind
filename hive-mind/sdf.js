const path = require('path');

class SDF {
	constructor() {
		this.endpointMap = new Map();
	}

	_add(service, action, input, output, config) {
	}

	get(service, action) {
	}

	async load(file, descFolder = null) {
		if (descFolder == null) {
			descFolder = path.dirname(file);
		}
	}
}


module.exports = SDF;
