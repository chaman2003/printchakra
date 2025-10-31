"""
Simple Logging Helper
--------------------
Makes logging cleaner and easier to manage.
Handles console encoding and filters out repetitive messages.
"""

import logging
import sys


def setup_console_encoding():
    """
    Fix Windows console to display special characters correctly.
    Prevents errors with emojis and unicode in logs.
    """
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass  # Ignore if not available


def setup_logging():
    """
    Configure basic logging for the application.
    Shows: timestamp, logger name, level, and message
    """
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Make Flask and SocketIO less noisy
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("socketio").setLevel(logging.WARNING)
    logging.getLogger("engineio").setLevel(logging.WARNING)


class MessageCounter:
    """
    Counts repeated log messages and adds a counter.
    Example: "Processing file..." becomes "Processing file... (×3)"
    """

    def __init__(self):
        self.counts = {}

    def track(self, message):
        """Add count to repeated messages"""
        if message in self.counts:
            self.counts[message] += 1
            return f"{message} (×{self.counts[message]})"
        else:
            self.counts[message] = 1
            return message


def create_logger(name):
    """
    Create a logger with message counting.

    Args:
        name: Name of the logger (usually __name__)

    Returns:
        Logger instance with deduplication
    """
    logger = logging.getLogger(name)
    counter = MessageCounter()

    # Wrap logging methods to add counting
    original_info = logger.info
    original_warning = logger.warning
    original_error = logger.error

    def counted_info(msg, *args, **kwargs):
        if isinstance(msg, str):
            msg = counter.track(msg)
        return original_info(msg, *args, **kwargs)

    def counted_warning(msg, *args, **kwargs):
        if isinstance(msg, str):
            msg = counter.track(msg)
        return original_warning(msg, *args, **kwargs)

    def counted_error(msg, *args, **kwargs):
        if isinstance(msg, str):
            msg = counter.track(msg)
        return original_error(msg, *args, **kwargs)

    logger.info = counted_info
    logger.warning = counted_warning
    logger.error = counted_error

    return logger


# Initialize logging when imported
setup_console_encoding()
setup_logging()
