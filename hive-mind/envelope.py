import envelope_pb2

class Envelope:
    def __init__(self, target, type, f, data, id): # TODO provide generated value for id
        self.target = target
        self.type = type
        self.f = f #TODO must be renamed
        self.data = data
        self.id = id

    def clone(self):
        return Envelope(self.target, self.type, self.f, self.data, self.id)
    
    def encode(self):
        envelope = envelope_pb2.HiveEnvelopeMessage()
        envelope.target = self.target
        envelope.type = self.type
        envelope.f = self.f
        envelope.data = self.data
        envelope.id = self.id
        return envelope.SerializeToString()

    def decode(self, encoded_msg):
        envelope = envelope_pb2.HiveEnvelopeMessage()
        msg = envelope.ParseFromString(encoded_msg)
        return Envelope(msg.target, msg.type, msg.f, msg.data, msg.id)

