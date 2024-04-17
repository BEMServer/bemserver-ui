"""Tests tools"""

from contextlib import contextmanager


@contextmanager
def not_raises(expected_exceptions):
    if not isinstance(expected_exceptions, list):
        expected_exceptions = [expected_exceptions]

    for exc in expected_exceptions:
        try:
            yield
        except exc:
            raise exc from exc
