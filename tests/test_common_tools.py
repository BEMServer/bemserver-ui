"""Common tools tests"""

import io

from bemserver_ui.common.tools import is_filestream_empty


class TestCommonTools:
    def test_is_filestream_empty(self):
        assert is_filestream_empty(None)

        empty_stream = io.BytesIO()
        assert is_filestream_empty(empty_stream)

        not_empty_stream = io.BytesIO(b"something")
        assert not is_filestream_empty(not_empty_stream)
