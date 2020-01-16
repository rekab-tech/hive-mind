const Promise = require('bluebird');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const toml = require('toml');
const {execFile} = require('child_process');

const run = Promise.promisify(execFile);

function warning(text, ...args) {
	console.log(chalk.red("🛈 "), chalk.red(text), ...args);
}

function log(text, ...args) {
	console.log(chalk.blue("ℹ "), text, ...args);
}

function sub(text, ...args) {
	console.log("\t", chalk.yellow(text), ...args);
}



class Service {
	constructor(root, data, sdf) {
		this.root = root;
		this.sdf = sdf;
		this.data = data;
		this.name = data.name;
		this.language = data.lang;
		this.id = null;

		this.proto = null;
	}
}

async function header() {
	console.log(` 

                          __---__
            ___________---_______---___________
            \\_________________________________/
                       _/\\_______/\\\\_
                     _//   \`-v-'   \\\\_
                   _//     __|__     \\\\_
                 _//      '/ . \\\`      \\\\_
              o_//         \\___/         \\\\_o
              /  \\                       /  \\
              \\__/                       \\__/
	            `);
	console.log(`                  Resistance is futile`);
	console.log();
}

function parseServiceData(root) {
	try {
		const str = fs.readFileSync(path.join(root, 'hive.toml'));
		const parsed = toml.parse(str);
		return parsed;
	} catch(e) {
		return null;
	}
}

function isValidServiceData(data) {
	if (data == null)
		return false;
	
	if (data.name == null)
		return false;

	if (data.lang == null)
		return false;

	if (!(["js", "python"].includes(data.lang))) {
		warning(`There is no support ${data.lang} in service ${data.name}`);
		return false;
	}

	return true;
}

function readSdf(root) {
	try {
		const str = fs.readFileSync(path.join(root, 'service.sdf'));
		return str;
	} catch(e) {
		return '';
	}
}

function readProto(root) {
	try {
		const str = fs.readFileSync(path.join(root, 'proto', 'service.proto')).toString();
		return str;
	} catch(e) {
		return null;
	}
}

function changeDescription(desc) {
	// This is bad. don't use this.
	desc = desc.map(s => {
		const ids = new Set();
		s.endpoints = s.endpoints.map(x => {
			if (ids.has(x.id)) {
				throw new Error(`Id Collision in ${s.name} for id = ${x.id}`);
			}
			ids.add(x.id);

			x.id += 10;
			return x;
		});
		return s;
	});
	return desc;
}


function assignIds(services, description) {
	// This is also bad! never mutate.

	let set = new Set();
	description.forEach(s => {
		set.add(s.id);
	});

	let nSet = new Map();

	services.forEach(service => {
		const ids = [];
		description.forEach(s => {
			if (s.name === service.name)
				ids.push(s.id);
		});

		if (ids.length === 0) {
			throw new Error(`No ${service.name} found in the sdfs`);
		}

		if (ids.length !== 1) {
			throw new Error(`More than one ${service.name} found in the sdfs`);
		}

		service.id = ids[0];
		set.delete(service.id);
		if (nSet.get(service.id)) {
			throw new Error(`Collision service id for ${service.name} and ${nSet.get(service.id)} [id = ${service.id}]`);
		}

		nSet.set(service.id, service.name);
	});

	if (set.size !== 0) {
		warning(`no service found for`, [...set.keys()]);
	}
}

async function mkdirp(p) {
	await run(`mkdir`, ['-p', p]);
}

async function compileServices(p, borg, tmp) {
	const files = fs.readdirSync(p);
	const services = [];
	for (let i = 0, len = files.length; i < len; ++i) {
		const service = files[i];
		const root = path.join(p, service);

		const data = parseServiceData(root);
		if (!isValidServiceData(data)) {
			warning(`${service} is not a valid hive micro service`);
			continue;
		}

		const sdf = readSdf(root);

		if (sdf == '') {
			warning(`no \`service.sdf\` file found for service ${service}.`);
		}

		let serviceObj = new Service(root, data, sdf);

		serviceObj.proto = readProto(root);

		services.push(serviceObj);
	}

	if (services.length === 0) {
		return;
	}

	const allSdf = services.map(s => s.sdf).join("\n\n");

	log(`generating all.sdf`);
	const allPath = path.join(tmp, "all.sdf");
	const outJson = path.join(tmp, "out.json");
	fs.writeFileSync(allPath, allSdf);
	log(`compiling all.sdf`);
	await run(`python3`, [path.join(borg, 'main.py'), allPath, outJson]);
	log(`loading compiled description`);
	let description = require(outJson); 
	log(`check id collision and shift real ids`);
	description = changeDescription(description);
	fs.writeFileSync(path.join(tmp, "out2.json"), JSON.stringify(description));

	log(`assigning ids`);
	assignIds(services, description);

	let codecTested = false;

	for (let i = 0, len = services.length; i < len; ++i) {
		const service = services[i];
		log(`${service.name} at ${service.root}/`);
		let result;

		switch (service.language) {
		case 'js':
			const jsGenPath = path.join(service.root, 'services');
			const jsProtoPath = path.join(jsGenPath, 'proto');

			await mkdirp(jsProtoPath);

			
			sub(`copying protobuf files`);
			const protoFiles = [];
			for(let j = 0; j < len; ++j) {
				const otherService = services[j];
				if (otherService.proto != null) {
					const filename = `${otherService.name}.proto`;
					fs.writeFileSync(path.join(jsProtoPath, filename), otherService.proto);
					protoFiles.push(filename);
				}
			}


			sub(`creating codec.js`);
			result = await run('node', [path.join(borg, './scripts/js-codec.js'), ...protoFiles]);
			fs.writeFileSync(path.join(jsGenPath, 'codec.js'), result);
			if (!codecTested) {
				sub(`testing codec.js`);
				await run('node', [path.join(jsGenPath, 'codec.js')]);
				codecTested = true;
			}

			sub(`creating services.js`);
			result = await run('node', [path.join(borg, './scripts/js-service.js'), service.id]);
			fs.writeFileSync(path.join(jsGenPath, 'services.js'), result);
			sub(`creating index.js`);
			result = await run('node', [path.join(borg, './scripts/js-index.js'), service.name]);
			fs.writeFileSync(path.join(jsGenPath, 'index.js'), result);
			break;
		case 'py':
			break;
		}
	}
}

async function main() {
	try {
		header();
		//console.log(process.argv);
		console.log(`compiling in ` + process.cwd());
		await compileServices('.', __dirname, path.join(__dirname, "tmp"));
	} catch(e) {
		console.error(chalk.red(e.message));
		console.error(e);
	}
}


main();
