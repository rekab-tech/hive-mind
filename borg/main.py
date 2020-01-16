import collections
import json
import sys


Type = collections.namedtuple('Type', ['name', 'type', 'pretype'])
Config = collections.namedtuple('Config', ['type', 'args'])
Endpoint = collections.namedtuple('Endpoint', ['name', 'id', 'input', 'output', 'configs', 'type'])
Service = collections.namedtuple('Service', ['name', 'id', 'endpoints'])


def endpoint_dict(e):
	d = e._asdict()
	d['input'] = e.input._asdict()
	d['output'] = e.output._asdict()
	d['configs'] = [c._asdict() for c in e.configs]
	return d


def service_dict(s):
	d = s._asdict()
	d['endpoints'] = [endpoint_dict(e) for e in s.endpoints]
	return d


def tokenize(text):
	text += "\n"
	current = ""
	tokens = []
	line = 1
	in_comment = False
	for ch in text:
		if ch == "\n":
			line += 1
		if in_comment:
			if ch == "\n":
				in_comment = False
			continue

		if ch == "#":
			in_comment = True
			if current != "":
				tokens.append((current, line))
				current = ""
		elif ch == "\n" or ch == ' ' or ch == "\t":
			if current != "":
				tokens.append((current, line))
				current = ""
		elif ch in ['(', ')', ':', '=']:
			if current != "":
				tokens.append((current, line))
			current = ""
			tokens.append((ch, line))
		elif ch in ['$']:
			raise Exception('Illegal char ' + ch)
		else:
			current += ch

	tokens.append(('$', line))
	return tokens


class SDFParser:
	def __init__(self, tokens):
		self.tokens = tokens
		self.index = 0
		self.services = []
		self.keywords = ['{', '}', '(', ')', ':', '=', 'service', 'app', '-', '>', 'async']

		self.current_line = 0

	def peek(self):
		(token, line) = self.tokens[self.index]
		self.current_line = line
		return token

	def pop(self):
		x = self.peek()
		self.index += 1
		return x

	def expect_maybe(self, token):
		if self.peek() == token:
			self.pop()
			return True
		return False

	def expect(self, token):
		x = self.pop()
		if x != token:
			raise Exception('Unexpected token {} on line {}. Expected {}'.format(x, self.current_line, token))

	def pop_number(self):
		x = self.pop()
		try:
			return int(x)
		except (Exception):
			raise Exception('Unexpected token {} on line {}. should be a number'.format(x, self.current_line))

	def pop_id(self):
		x = self.pop()
		if x in self.keywords:
			raise Exception('Unexpected keyword {} on line {}'.format(x, self.current_line))
		return x

	def parse(self):
		while self.peek() != '$':
			self.services.append(self.parse_service())

	def parse_service(self):
		self.expect('service')
		service_name = self.pop_id()
		self.expect('=')
		num = self.pop_number()
		endpoints = []
		self.expect('{')
		while self.peek() != '}':
			if self.peek() == 'app':
				endpoints += self.parse_app()
				continue
			endpoints.append(self.parse_endpoint())
		self.expect('}')

		return Service(name=service_name, id=num, endpoints=endpoints)

	def parse_app(self):
		self.expect('app')
		app = self.pop_id()
		endpoints = []
		self.expect('{')
		while self.peek() != '}':
			endpoint = self.parse_endpoint()
			endpoint.configs.append(Config(type='.app', args=[app]))
			endpoints.append(endpoint)
		self.expect('}')

		return endpoints

	def parse_endpoint(self):
		# configs
		configs = []
		endpoint_type = 'fn'
		while self.peek().startswith('@'):
			config = self.parse_config()
			configs.append(config)
		if self.expect_maybe('async'):
			endpoint_type = 'async'
			pass
		name = self.pop_id()
		i = self.parse_type()
		self.expect('->')
		o = self.parse_type()
		self.expect('=')
		num = self.pop_number()

		return Endpoint(name=name, id=num, input=i, output=o, configs=configs, type=endpoint_type)

	def parse_type(self):
		par = self.expect_maybe('(')
		name = self.pop_id()
		t = 'default'
		if self.expect_maybe(':'):
			t = self.pop()
		if par:
			self.expect_maybe(')')

		return Type(name=name, type=t, pretype=None)

	def parse_config(self):
		action = self.pop_id()
		if action == '@cache':
			return Config(type='cache', args=[])
		elif action == '@transport':
			return Config(type='transport', args=[self.pop()])
		elif action == '@handler':
			return Config(type='.handler', args=[self.pop(), self.pop()])


	def as_dict(self):
		return [service_dict(x) for x in self.services]


text = open(sys.argv[1]).read()
tokens = tokenize(text)

parser = SDFParser(tokens)
parser.parse()

f = open(sys.argv[2], 'w')
f.write(json.dumps(parser.as_dict()))
f.close()
