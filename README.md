# Hive Mind
Hive Mind is a multi-transport RPC framework for microservices systems. It automates generating service clients and event handlers. Each service must implement a `service.sdf` file which describes the events the service can handle and a `service.toml` file which describes the service's language and name.


## How does it work?
"Hive Mind" consists of two parts:
1. **borg** is the transpiler and is responsible for generating `js` and `py` files for service calls and event handlers.
2. **hive** has the main functionalities for different brokers. We will describe it in detail later.

Let's have a closer look:

### Borg
In the first step, borg transpiles the `.sdf` into a `.json` and then considering the language of the service specified in `toml` it transpiles the `json` into a `py` or `js` file. The following code shows an example of a `.sdf` file:
```
service Stat = 2 {
	getStats (null) -> StatResult = 1

	app Collect { 
	    @transport kafka
		something (Data) -> null = 2
	}
	
	async backgroundTask (Input) -> Output = 3

	@cache
	someCachableEvent (EventInp) -> EventOut = 4
}
```

And here's the above example with explanations:

```
# This is a comment line
# Specifies the service name and a unique index for the service:
service Stat = 2 {  
    # The following line defines an event which the "Stat" service can handle. It has the
    # name of the event, the input type in the parantheses, and the output type after ->
    # It also has a unique index within the scope of the service. The input or output types
    # can be null or any proto object. The proto objects must be implemented in
    # service/proto/ directory.
	getStats (null) -> StatResult = 1

    # When you have a seperated application or domain file for the logic, You can
    # specify the seperated file by defining an "app" with the name of the file:
	app Collect { 
	    # SDF files can have some configs which are specified by @ notation.
	    # Note that different transport layers are not implemented in hive yet.
	    @transport kafka
		something (Data) -> null = 2
	}
	
	# Events can be async as follow:
	async backgroundTask (Input) -> Output = 3
	
    # Events can be cachable. Borg can transpile the configs to json files but it doesn't
    # Have "cache" config yet. Just note that hive has this ability :D
	@cache
	someCachableEvent (EventInp) -> EventOut = 4
}
```

Each service must also implements a `.toml` file too. Here's an example of a `.toml` file:
```toml
name = "Message"
lang = "py3"

author = "Morgan Freeman"
```
* `name` is the name of the service.
* `lang` is the language which the service is written by. For now it can be `py3` or `js`.




