const servicesList = require('../tmp/out2.json');

function initiateEvent(ctx, data) {
        if (data == null && ctx != null && isNotCtx(ctx)) {
          console.warn('Invalid argument as "ctx".');
          data = ctx;
          ctx = null;
        }
      
        if (ctx == null) {
          ctx = new Context();
        }
      
      
        return {ctx, data};
}

function encode (Input, data) {
        let error = Input.verify(data);
        if (error != null) {
          throw new Error(error);
        }
        
        const msg =  Input.create(data);
        const buff = Input.encode(msg).finish();

        return buff;
};

function decode (Output, buff) {
        const resultMsg = Output.decode(buff);

        let error = Output.verify(resultMsg);
        if (error != null) {
          throw new Error(error);
        }

        return resultMsg;
};

function pascalCase(str) {
        return str.split('/').map(x => x.substr(0, 1).toUpperCase() + x.substr(1)).join('');
}

function camelCase(str) {
       const s = pascalCase(str);
       return s.substr(0, 1).toLowerCase() + s.substr(1);
}

function createHandlerTemplate(serviceName, serviceId, endpoint, constId) {
        const transportConfig = endpoint.configs.find(elem => elem.type === 'transport');
        let transport = 'default';
        if (transportConfig) {
                transport = transportConfig.args ? transportConfig.args[0] : 'default';
        }
        const sendFunction = endpoint.type === 'async' ? 'sendAsync' : 'send';
        let app = null;
        let appConfig = endpoint.configs.find(elem => elem.type === '.app');
        if (appConfig && appConfig.args) {
                app = appConfig.args[0];
        }
        let handlerTemplate = app ? `module.exports.${pascalCase(serviceName)}.${pascalCase(app)}.${camelCase(endpoint.name)}` : `module.exports.${pascalCase(serviceName)}.${camelCase(endpoint.name)}`;
        handlerTemplate += app ? ` = async function ${pascalCase(serviceName)}_${pascalCase(app)}_${pascalCase(endpoint.name)} (_ctx, _data) {` : ` = async function ${pascalCase(serviceName)}_${pascalCase(endpoint.name)} (_ctx, _data) {`;
        handlerTemplate += `
        const {ctx, data} = initiateEvent(_ctx, _data);

        const Input = codec.${endpoint.input.type}.${endpoint.input.name};
        const Output = codec.${endpoint.output.type}.${endpoint.output.name};

        const buff = encode(Input, data);
        const envelope = new Envelope(${serviceId}, ${endpoint.id}, ${constId}, buff);
        await ctx.track(envelope);

        const result = await hive.${transport}.${sendFunction}(envelope);

        return decode(Output, result.data);
}`;
        
        return handlerTemplate;
}

console.log(`const codec = require('./codec.js');
const hive = require('./index.js');
const {isNotCtx, Context, Envelope} = require('hive-mind');
`);

console.log(initiateEvent.toString(), '\n');
console.log(encode.toString(), '\n');
console.log(decode.toString(), '\n');


servicesList.forEach(s => {
        console.log(`// Service: ${s.name}\tid: ${s.id}\n`);
        console.log(`module.exports.${s.name} = {};`);
        s.endpoints
                .map(e => e.configs.find(elem => elem.type === '.app'))
                .filter(e => e != null)
                .map(e => e.args[0])
                .forEach(appName => {
                        console.log(`module.exports.${s.name}.${appName} = {};`);
                }); // TODO generate single module.exports for each app name 
        s.endpoints.forEach(e => {
                console.log(createHandlerTemplate(s.name, s.id, e, process.argv[2]));
                console.log('\n');
        });
});
