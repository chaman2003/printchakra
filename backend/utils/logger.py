"""
Logger utility
Centralized logging configuration
"""

import logging
import sys


class MessageCounter:
    """Track message occurrences and append count to repeated messages"""

    def __init__(self):
        self.message_map = {}

    def track(self, message: str) -> str:
        """Add message to counter and return message with count if repeated"""
        if message in self.message_map:
            self.message_map[message] += 1
            return f"{message} (×{self.message_map[message]})"
        else:
            self.message_map[message] = 1
            return message


def setup_logger(name: str = __name__, level=logging.INFO):
    """
    Set up a logger with consistent formatting and message deduplication

    Args:
        name: Logger name
        level: Logging level

    Returns:
        Configured logger instance
    """
    # Configure logging
    logging.basicConfig(level=level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    logger = logging.getLogger(name)

    # Suppress verbose logs
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("socketio").setLevel(logging.WARNING)
    logging.getLogger("engineio").setLevel(logging.WARNING)

    # Add message counter
    message_counter = MessageCounter()

    # Monkey-patch logger methods
    _original_info = logger.info
    _original_warning = logger.warning
    _original_error = logger.error

    def _counted_info(msg, *args, **kwargs):
        if isinstance(msg, str):
            msg = message_counter.track(msg)
        return _original_info(msg, *args, **kwargs)

    def _counted_warning(msg, *args, **kwargs):
        if isinstance(msg, str):
            msg = message_counter.track(msg)
        return _original_warning(msg, *args, **kwargs)

    def _counted_error(msg, *args, **kwargs):
        if isinstance(msg, str):
            msg = message_counter.track(msg)
        return _original_error(msg, *args, **kwargs)

    logger.info = _counted_info
    logger.warning = _counted_warning
    logger.error = _counted_error

    return logger


def get_logger(name: str):
    """Get or create a logger"""
    return logging.getLogger(name)
