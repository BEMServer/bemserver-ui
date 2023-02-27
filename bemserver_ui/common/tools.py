"""BEMServer UI common tools."""
import os
import importlib
import sys


def is_filestream_empty(file_stream):
    if file_stream is None:
        return True
    ret = file_stream.seek(0, os.SEEK_END) <= 0
    file_stream.seek(0, os.SEEK_SET)
    return ret


def import_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module
