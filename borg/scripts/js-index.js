const servicesList = require('../tmp/out2.json');
const path = require('path');

// TODO error in case of null or undefined
const serviceName = process.argv[2];
const serviceRootPath = process.argv[3];

function classifyCurrentServiceEndpoints(endpoints, transportSet) {
	const currentServiceEndpointMap = new Map();
	transportSet.forEach(transportName => {
		currentServiceEndpointMap.set(transportName, []);
	});
	endpoints.forEach(e => {
		const transportConfig = e.configs.find(elem => elem.type === 'transport');
		if (transportConfig) {
			currentServiceEndpointMap.get(transportConfig.args[0]).push(e);
		} else {
			currentServiceEndpointMap.get('default').push(e);
		}
	});
	return currentServiceEndpointMap;
}

function init(services) {
	const transportSet = new Set();
	let currentServiceEndpointMap = new Map();
	let currentServiceEndpoints = [];
	services.forEach(s => {
		s.endpoints
		.map(e => e.configs.find(elem => elem.type === 'transport'))
		.forEach(transportConfig => transportConfig ? transportSet.add(transportConfig.args[0]) : transportSet.add('default'));
	});

	const currentService = services.find(s => s.name === serviceName);
	if (!currentService) {
		throw new Error('The service name you pass as an "argv" is not in the description file!');
	} else {
		currentServiceEndpoints = currentService.endpoints;
		currentServiceEndpointMap = classifyCurrentServiceEndpoints(currentService.endpoints, transportSet);
	}

	return {transportSet, currentServiceEndpointMap, currentServiceEndpoints};
}

function printDefaultImport(currentServiceEndpoints) {
	const hasHandlerOrApp = currentServiceEndpoints
		.filter(e => e.configs.find(elem => elem.type === '.handler') == null)
		.filter(e => e.configs.find(elem => elem.type === '.app') == null)
		.length === 0;
	if (!hasHandlerOrApp) {
		console.log(`const App = require('../domain/index.js');`);
	}
}

function printImportsOfApps(currentServiceEndpoints) {
	const appSet = new Set();
	currentServiceEndpoints
		.filter(e => e.configs.find(elem => elem.type === '.handler') == null)
		.map(e => e.configs.find(elem => elem.type === '.app'))
		.filter(e => e != null)
		.map(e => e.args[0])
                .forEach(appName => appSet.add(appName));
	appSet.forEach(appName => {
		console.log(`const ${pascalCase(appName)} = require('../domain/${camelCase(appName)}.js');`);
	});
}

function getHandlerName(pathToHandler) {
	return path.basename(pathToHandler).trim().replace('.js', '');
}

function printImportOfHandlers(currentServiceEndpoints) {
	const handlerSet = new Set();
	currentServiceEndpoints
		.map(e => e.configs.find(elem => elem.type === '.handler'))
		.filter(e => e != null)
		.forEach(handlerConfig => handlerSet.add(handlerConfig));
	handlerSet.forEach(handlerConfig => {
		const handlerName = getHandlerName(handlerConfig.args[0]);
		console.log(`const ${pascalCase(handlerName)} = require('${handlerConfig.args[0]}')`);
	});
}

function pascalCase(str) {
        return str.split('/').map(x => x.substr(0, 1).toUpperCase() + x.substr(1)).join('');
}

function camelCase(str) {
       const s = pascalCase(str);
       return s.substr(0, 1).toLowerCase() + s.substr(1);
}

const {transportSet, currentServiceEndpointMap, currentServiceEndpoints} = init(servicesList);

console.log(`const Hive = require('hive-mind');\n`);
console.log(`const Context = Hive.Context;`);

printDefaultImport(currentServiceEndpoints)
printImportsOfApps(currentServiceEndpoints);
printImportOfHandlers(currentServiceEndpoints);
console.log('\n');

transportSet.forEach(transportName => {
	console.log(`module.exports.${transportName} = new Hive();`);	
	let transportConstructor = ``;
	let transportFile = ``;
	if (transportName === 'default') {
		transportConstructor = `RedisTransport`;
		transportFile = `hive-mind/transports/redis.js`;
	} else {
		throw new Error(`${transportName} is not implemented yet`)
	}
	console.log(`const ${transportConstructor} = require('${transportFile}');`);
	console.log(`module.exports.${transportName}.setTransport(new ${transportConstructor}());`); // config.get('hive_transport_${transportName})'
});
console.log('\n')

for (const [transportName, endpoints] of currentServiceEndpointMap.entries()) {
	if (endpoints.length === 0) {
		continue;
	}
	console.log(`module.exports.${transportName}.onMessage(async (envelope) => {
	let ctx = Context.fromEnvelope(envelope);
	switch(envelope.type) {`);
	endpoints.forEach(e => {
		const appConfig = e.configs.find(elem => elem.type === '.app');
		const handlerConfig = e.configs.find(elem => elem.type === '.handler');
		if (appConfig) {
			console.log(`
		case ${e.id}:
			await ${pascalCase(appConfig.args[0])}.${camelCase(e.name)}(ctx, envelope.data);
		break;
			`);
		} else if (handlerConfig) {
			console.log(`
		case ${e.id}:
			await ${pascalCase(getHandlerName(handlerConfig.args[0]))}.${camelCase(handlerConfig.args[1])}(ctx, envelope.data);
		break;
			`);
		} else {
			console.log(`
		case ${e.id}:
			await App.${camelCase(e.name)}(ctx, envelope.data);
		break;
			`);	
		}
	});
	console.log(`
	}
});
`);
} 
