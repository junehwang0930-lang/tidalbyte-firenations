"""Pure, simulation-only routing independent of HTTP and hazard generation."""

from .engine import find_route

__all__ = ['find_route']
