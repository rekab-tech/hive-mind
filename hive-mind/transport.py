import asyncio
from abc import ABC, abstractmethod


class Transport(ABC):
    def __init__(self):
        self.on_receive_callback = None

    def init(self):
        pass

    @abstractmethod
    async def send(self, envelope):
        pass

    def on_receive(self, callback):
        if type(callback) is not 'function':
            raise TypeError(f'callback must be a function, instead of {type(callback)}')

        self.on_receive_callback = callback

    async def shutdown(self):
        pass
