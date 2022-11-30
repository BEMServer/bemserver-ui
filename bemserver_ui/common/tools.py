"""BEMServer UI common tools."""
import os


def is_filestream_empty(file_stream):
    if file_stream is None:
        return True
    ret = file_stream.seek(0, os.SEEK_END) <= 0
    file_stream.seek(0, os.SEEK_SET)
    return ret
